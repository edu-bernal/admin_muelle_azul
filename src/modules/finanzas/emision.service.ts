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

/** Determina el monto de la cuota ORDINARIA para una unidad (según tarifa recurrente). */
function montoOrdinarioUnidad(
  unidad: { baseCalculoCuota: string | null; montoFijoCuota: Prisma.Decimal | null },
  tarifaGlobal: Prisma.Decimal,
): Prisma.Decimal {
  if (unidad.baseCalculoCuota === "FIJO" && unidad.montoFijoCuota) {
    return unidad.montoFijoCuota;
  }
  return tarifaGlobal;
}

/**
 * Tarifas en vigor para el período, de la más específica a la más general.
 * Una tarifa puede acotarse por sector, por tipo de propiedad, por ambos, o
 * aplicar a todo el condominio; `tarifaDeUnidad` elige la que corresponda.
 */
async function tarifasVigentes(periodo: Date) {
  const tarifas = await prisma.tarifaCuota.findMany({
    where: { vigenteDesde: { lte: periodo } },
    orderBy: { vigenteDesde: "desc" },
  });
  if (!tarifas.some((t) => t.sectorId === null && t.tipoUnidadId === null)) {
    throw new Error(
      "No hay una tarifa general vigente para el período. Configúrala en Parámetros del sistema.",
    );
  }
  return tarifas;
}

/**
 * Tarifa aplicable a una unidad: gana la coincidencia más específica y, entre
 * varias del mismo nivel, la de vigencia más reciente (ya vienen ordenadas).
 */
function tarifaDeUnidad(
  tarifas: { sectorId: string | null; tipoUnidadId: string | null; montoMensual: Prisma.Decimal }[],
  unidad: { sectorId: string; tipoId: string },
): Prisma.Decimal {
  const coincide = (
    t: { sectorId: string | null; tipoUnidadId: string | null },
    sector: boolean,
    tipo: boolean,
  ) =>
    (sector ? t.sectorId === unidad.sectorId : t.sectorId === null) &&
    (tipo ? t.tipoUnidadId === unidad.tipoId : t.tipoUnidadId === null);

  return (
    tarifas.find((t) => coincide(t, true, true)) ??
    tarifas.find((t) => coincide(t, true, false)) ??
    tarifas.find((t) => coincide(t, false, true)) ??
    tarifas.find((t) => coincide(t, false, false))!
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
    tipoId: string;
    baseCalculoCuota: string | null;
    montoFijoCuota: Prisma.Decimal | null;
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
      tipoId: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
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
      "Ya existe una emisión para este concepto y período. Anúlela antes de re-emitir.",
    );
  }

  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    select: {
      id: true,
      codigo: true,
      sectorId: true,
      tipoId: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
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
