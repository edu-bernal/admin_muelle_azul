import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dec, sum } from "@/lib/money";
import { audit } from "@/lib/audit";
import { primerDiaDelMes } from "./shared";

export interface EmisionInput {
  conceptoCodigo: string; // "MANT" (ordinaria) | "EXTRA" (extraordinaria) | otro
  periodo: Date;
  fechaVencimiento: Date;
  /** Monto por unidad. Requerido para conceptos distintos a MANT (no tienen tarifa recurrente). */
  montoManual?: number;
  /** Descripción personalizada del cargo (ej. "Cuota Extraordinaria por Oleaje"). Por defecto usa el nombre del concepto. */
  descripcion?: string;
  creadoPorId?: string | null;
}

export interface EmisionPreview {
  concepto: string;
  periodo: Date;
  cantidadUnidades: number;
  total: number;
  detalle: { unidadCodigo: string; monto: number }[];
  yaEmitida: boolean;
}

/**
 * Monto de la cuota ORDINARIA para una unidad, de lo más particular a lo más
 * general:
 *   1. Monto fijo de la unidad, si tiene base de cálculo FIJO.
 *   2. Valor del tipo de propiedad, si está configurado en Parámetros.
 *   3. Tarifa del sector para el período, y en su defecto la general.
 */
function montoOrdinarioUnidad(
  unidad: {
    baseCalculoCuota: string | null;
    montoFijoCuota: Prisma.Decimal | null;
    tipo: { valor: Prisma.Decimal | null };
  },
  tarifaDelSector: Prisma.Decimal,
): Prisma.Decimal {
  if (unidad.baseCalculoCuota === "FIJO" && unidad.montoFijoCuota) {
    return unidad.montoFijoCuota;
  }
  if (unidad.tipo.valor !== null) {
    return unidad.tipo.valor;
  }
  return tarifaDelSector;
}

/**
 * Tarifas en vigor para el período. Una tarifa puede acotarse a un sector o
 * aplicar a todo el condominio; siempre debe existir una general, que es el
 * último recurso cuando el tipo de propiedad no fija su propio valor.
 */
async function tarifasVigentes(periodo: Date) {
  const tarifas = await prisma.tarifaCuota.findMany({
    where: { vigenteDesde: { lte: periodo } },
    orderBy: { vigenteDesde: "desc" },
  });
  if (!tarifas.some((t) => t.sectorId === null)) {
    throw new Error(
      "No hay una tarifa general vigente para el período. Configúrala en Parámetros del sistema.",
    );
  }
  return tarifas;
}

/**
 * Tarifa aplicable a una unidad: gana la del sector y, entre varias, la de
 * vigencia más reciente (ya vienen ordenadas).
 */
function tarifaDeUnidad(
  tarifas: { sectorId: string | null; montoMensual: Prisma.Decimal }[],
  unidad: { sectorId: string },
): Prisma.Decimal {
  return (
    tarifas.find((t) => t.sectorId === unidad.sectorId) ??
    tarifas.find((t) => t.sectorId === null)!
  ).montoMensual;
}

/**
 * Resuelve, para un concepto y unidad dados, el monto y la fuente:
 * - MANT (ordinaria): usa la tarifa recurrente vigente (con override fijo por unidad).
 * - Cualquier otro concepto (ej. EXTRA — extraordinaria): usa el monto manual indicado
 *   por el administrador, igual para todas las unidades (aprobado en asamblea).
 */
async function resolverMontos(
  concepto: { codigo: string },
  periodo: Date,
  montoManual: number | undefined,
  unidades: {
    sectorId: string;
    baseCalculoCuota: string | null;
    montoFijoCuota: Prisma.Decimal | null;
    tipo: { valor: Prisma.Decimal | null };
  }[],
): Promise<Prisma.Decimal[]> {
  if (concepto.codigo === "MANT") {
    const tarifas = await tarifasVigentes(periodo);
    return unidades.map((u) => montoOrdinarioUnidad(u, tarifaDeUnidad(tarifas, u)));
  }
  if (montoManual == null || montoManual <= 0) {
    throw new Error(
      "Indica el monto por unidad para conceptos distintos a la cuota ordinaria.",
    );
  }
  const monto = dec(montoManual);
  return unidades.map(() => monto);
}

/** Previsualiza la emisión sin persistir. */
export async function previsualizarEmision(
  input: EmisionInput,
): Promise<EmisionPreview> {
  const periodo = primerDiaDelMes(input.periodo);
  const concepto = await prisma.conceptoCobro.findUnique({
    where: { codigo: input.conceptoCodigo },
  });
  if (!concepto) throw new Error(`Concepto ${input.conceptoCodigo} no existe`);

  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    orderBy: { codigo: "asc" },
    select: {
      codigo: true,
      sectorId: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
      tipo: { select: { valor: true } },
    },
  });

  const montos = await resolverMontos(concepto, periodo, input.montoManual, unidades);
  const detalle = unidades.map((u, i) => ({
    unidadCodigo: u.codigo,
    monto: montos[i].toNumber(),
  }));

  const existente = await prisma.emision.findUnique({
    where: {
      conceptoCobroId_periodo: { conceptoCobroId: concepto.id, periodo },
    },
  });

  return {
    concepto: concepto.nombre,
    periodo,
    cantidadUnidades: detalle.length,
    total: sum(detalle.map((d) => d.monto)).toNumber(),
    detalle,
    yaEmitida: !!existente && existente.estado !== "ANULADA",
  };
}

export interface EmisionResultado {
  emisionId: string;
  cantidadCargos: number;
  total: number;
}

/**
 * Emisión masiva de cuotas: crea una emisión y un cargo por unidad activa.
 * Idempotente por (concepto, período): si ya existe una emisión confirmada, falla.
 */
export async function confirmarEmision(
  input: EmisionInput,
): Promise<EmisionResultado> {
  const periodo = primerDiaDelMes(input.periodo);
  const concepto = await prisma.conceptoCobro.findUnique({
    where: { codigo: input.conceptoCodigo },
  });
  if (!concepto) throw new Error(`Concepto ${input.conceptoCodigo} no existe`);

  const existente = await prisma.emision.findUnique({
    where: {
      conceptoCobroId_periodo: { conceptoCobroId: concepto.id, periodo },
    },
  });
  if (existente && existente.estado !== "ANULADA") {
    throw new Error(
      "Ya existe una emisión para este concepto y período. Elimínala antes de re-emitir.",
    );
  }

  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    select: {
      id: true,
      codigo: true,
      sectorId: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
      tipo: { select: { valor: true } },
    },
  });
  if (unidades.length === 0) throw new Error("No hay unidades activas.");

  const montos = await resolverMontos(concepto, periodo, input.montoManual, unidades);
  const etiquetaPeriodo = periodo.toISOString().slice(0, 7);
  const descripcionBase = input.descripcion?.trim() || concepto.nombre;
  const cargosData = unidades.map((u, i) => ({
    unidadId: u.id,
    conceptoCobroId: concepto.id,
    periodo,
    descripcion: `${descripcionBase} — ${etiquetaPeriodo}`,
    monto: montos[i],
    fechaEmision: new Date(),
    fechaVencimiento: input.fechaVencimiento,
  }));
  const total = sum(cargosData.map((c) => c.monto));

  const resultado = await prisma.$transaction(async (tx) => {
    const emision = await tx.emision.create({
      data: {
        conceptoCobroId: concepto.id,
        periodo,
        fechaVencimiento: input.fechaVencimiento,
        estado: "CONFIRMADA",
        totalEmitido: total,
        cantidadCargos: cargosData.length,
        creadoPorId: input.creadoPorId ?? null,
      },
    });

    await tx.cargo.createMany({
      data: cargosData.map((c) => ({ ...c, emisionId: emision.id })),
    });

    await audit(
      {
        usuarioId: input.creadoPorId,
        accion: "EMITIR_CUOTAS",
        entidad: "Emision",
        entidadId: emision.id,
        datosDespues: {
          concepto: concepto.codigo,
          periodo: periodo.toISOString(),
          cantidad: cargosData.length,
          total: total.toNumber(),
        },
      },
      tx,
    );

    return emision;
  });

  return {
    emisionId: resultado.id,
    cantidadCargos: cargosData.length,
    total: total.toNumber(),
  };
}

/** Emite un cargo individual a una unidad (multa, extraordinaria, ajuste). */
export async function emitirCargoIndividual(params: {
  unidadId: string;
  conceptoCodigo: string;
  descripcion: string;
  monto: number;
  fechaVencimiento: Date;
  creadoPorId?: string | null;
}): Promise<string> {
  const concepto = await prisma.conceptoCobro.findUnique({
    where: { codigo: params.conceptoCodigo },
  });
  if (!concepto) throw new Error(`Concepto ${params.conceptoCodigo} no existe`);

  const cargo = await prisma.$transaction(async (tx) => {
    const c = await tx.cargo.create({
      data: {
        unidadId: params.unidadId,
        conceptoCobroId: concepto.id,
        descripcion: params.descripcion,
        monto: dec(params.monto),
        fechaVencimiento: params.fechaVencimiento,
      },
    });
    await audit(
      {
        usuarioId: params.creadoPorId,
        accion: "EMITIR_CARGO_INDIVIDUAL",
        entidad: "Cargo",
        entidadId: c.id,
        datosDespues: { monto: params.monto, concepto: concepto.codigo },
      },
      tx,
    );
    return c;
  });
  return cargo.id;
}

export interface EmisionEliminada {
  periodo: string;
  concepto: string;
  cargosEliminados: number;
  pagosDevueltos: number;
  montoDevuelto: number;
}

/**
 * Elimina una emisión completa con todos sus cargos.
 *
 * El punto delicado son los cargos que ya recibieron pagos: borrarlos sin más
 * haría desaparecer dinero real del sistema. Por eso lo aplicado se devuelve
 * al saldo a favor del propietario, que es de donde saldrá cuando se re-emita
 * el período corregido. El pago en sí no se toca: sigue registrado con su
 * recibo, solo deja de estar imputado a un cargo que ya no existe.
 */
export async function eliminarEmision(
  emisionId: string,
  motivo: string,
  usuarioId?: string | null,
): Promise<EmisionEliminada> {
  return prisma.$transaction(async (tx) => {
    const emision = await tx.emision.findUnique({
      where: { id: emisionId },
      include: {
        conceptoCobro: true,
        cargos: {
          include: {
            aplicaciones: { include: { pago: true } },
            cargosDerivados: { select: { id: true } },
          },
        },
      },
    });
    if (!emision) throw new Error("Emisión no encontrada");

    // Un cargo que originó otro (por ejemplo una multa recargada) no se puede
    // borrar sin dejar huérfano al derivado.
    const conDerivados = emision.cargos.filter((c) => c.cargosDerivados.length > 0);
    if (conDerivados.length > 0) {
      throw new Error(
        `No se puede eliminar: ${conDerivados.length} cargos originaron otros cargos. Anúlalos primero.`,
      );
    }

    // Lo aplicado vuelve al saldo a favor de quien pagó.
    const devueltoPorPropietario = new Map<string, Prisma.Decimal>();
    let pagosDevueltos = 0;
    for (const cargo of emision.cargos) {
      for (const ap of cargo.aplicaciones) {
        const previo = devueltoPorPropietario.get(ap.pago.propietarioId) ?? dec(0);
        devueltoPorPropietario.set(
          ap.pago.propietarioId,
          previo.plus(ap.montoAplicado),
        );
        pagosDevueltos++;
      }
    }

    let montoDevuelto = dec(0);
    for (const [propietarioId, monto] of devueltoPorPropietario) {
      montoDevuelto = montoDevuelto.plus(monto);
      const saldo = await tx.saldoFavor.upsert({
        where: { propietarioId },
        create: { propietarioId, montoDisponible: monto },
        update: { montoDisponible: { increment: monto } },
      });
      await tx.saldoFavorMovimiento.create({
        data: { saldoFavorId: saldo.id, monto, signo: 1 },
      });
    }

    const cargoIds = emision.cargos.map((c) => c.id);
    await tx.aplicacionPago.deleteMany({ where: { cargoId: { in: cargoIds } } });
    await tx.cargo.deleteMany({ where: { id: { in: cargoIds } } });

    const periodo = emision.periodo.toISOString().slice(0, 7);
    await audit(
      {
        usuarioId,
        accion: "ELIMINAR_EMISION",
        entidad: "Emision",
        entidadId: emisionId,
        datosAntes: {
          periodo,
          concepto: emision.conceptoCobro.codigo,
          cargos: cargoIds.length,
          totalEmitido: emision.totalEmitido.toString(),
        },
        datosDespues: {
          motivo,
          pagosDevueltos,
          montoDevuelto: montoDevuelto.toString(),
        },
      },
      tx,
    );

    await tx.emision.delete({ where: { id: emisionId } });

    return {
      periodo,
      concepto: emision.conceptoCobro.nombre,
      cargosEliminados: cargoIds.length,
      pagosDevueltos,
      montoDevuelto: montoDevuelto.toNumber(),
    };
  });
}
