import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dec, sum } from "@/lib/money";
import { audit } from "@/lib/audit";
import { primerDiaDelMes } from "./shared";

export interface EmisionInput {
  conceptoCodigo: string; // ej. "MANT"
  periodo: Date;
  fechaVencimiento: Date;
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

/** Determina el monto de la cuota para una unidad. */
function montoParaUnidad(
  unidad: { baseCalculoCuota: string | null; montoFijoCuota: Prisma.Decimal | null },
  tarifaGlobal: Prisma.Decimal,
): Prisma.Decimal {
  if (unidad.baseCalculoCuota === "FIJO" && unidad.montoFijoCuota) {
    return unidad.montoFijoCuota;
  }
  return tarifaGlobal;
}

async function tarifaVigente(periodo: Date): Promise<Prisma.Decimal> {
  const tarifa = await prisma.tarifaCuota.findFirst({
    where: { vigenteDesde: { lte: periodo }, sectorId: null, tipoUnidad: null },
    orderBy: { vigenteDesde: "desc" },
  });
  if (!tarifa) {
    throw new Error(
      "No hay una tarifa de cuota vigente para el período. Configure una en tarifa_cuota.",
    );
  }
  return tarifa.montoMensual;
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

  const tarifa = await tarifaVigente(periodo);
  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    orderBy: { codigo: "asc" },
    select: {
      codigo: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
    },
  });

  const detalle = unidades.map((u) => ({
    unidadCodigo: u.codigo,
    monto: montoParaUnidad(u, tarifa).toNumber(),
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

  const tarifa = await tarifaVigente(periodo);
  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    select: {
      id: true,
      codigo: true,
      baseCalculoCuota: true,
      montoFijoCuota: true,
    },
  });
  if (unidades.length === 0) throw new Error("No hay unidades activas.");

  const cargosData = unidades.map((u) => {
    const monto = montoParaUnidad(u, tarifa);
    return {
      unidadId: u.id,
      conceptoCobroId: concepto.id,
      periodo,
      descripcion: `${concepto.nombre} — ${periodo
        .toISOString()
        .slice(0, 7)}`,
      monto,
      fechaEmision: new Date(),
      fechaVencimiento: input.fechaVencimiento,
    };
  });
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
