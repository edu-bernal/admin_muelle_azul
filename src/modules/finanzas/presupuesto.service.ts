import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";

export interface FilaEjecucion {
  partida: string;
  presupuestado: number;
  ejecutado: number;
  saldo: number;
  porcentaje: number;
}

export interface EjecucionPresupuestal {
  anio: number;
  existe: boolean;
  filas: FilaEjecucion[];
  totalPresupuestado: number;
  totalEjecutado: number;
}

/** Presupuesto anual vs. ejecución real (egresos por partida del año). */
export async function ejecucionPresupuestal(
  anio: number,
): Promise<EjecucionPresupuestal> {
  const presupuesto = await prisma.presupuestoAnual.findUnique({
    where: { anio },
    include: { partidas: { include: { partida: true } } },
  });

  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin = new Date(Date.UTC(anio + 1, 0, 1));

  // Ejecución real por partida (egresos registrados del año).
  const egresos = await prisma.egreso.groupBy({
    by: ["partidaId"],
    where: { estado: "REGISTRADO", fechaPago: { gte: inicio, lt: fin } },
    _sum: { monto: true },
  });
  const ejecutadoPorPartida = new Map<string, Prisma.Decimal>();
  for (const e of egresos) {
    if (e.partidaId) ejecutadoPorPartida.set(e.partidaId, e._sum.monto ?? ZERO);
  }

  const filas: FilaEjecucion[] = (presupuesto?.partidas ?? []).map((pp) => {
    const presup = new Prisma.Decimal(pp.montoAnual);
    const ejec = ejecutadoPorPartida.get(pp.partidaId) ?? ZERO;
    return {
      partida: pp.partida.nombre,
      presupuestado: presup.toNumber(),
      ejecutado: new Prisma.Decimal(ejec).toNumber(),
      saldo: presup.minus(ejec).toNumber(),
      porcentaje: presup.gt(ZERO)
        ? Math.round(new Prisma.Decimal(ejec).div(presup).toNumber() * 100)
        : 0,
    };
  });

  return {
    anio,
    existe: !!presupuesto,
    filas: filas.sort((a, b) => b.presupuestado - a.presupuestado),
    totalPresupuestado: filas.reduce((a, f) => a + f.presupuestado, 0),
    totalEjecutado: filas.reduce((a, f) => a + f.ejecutado, 0),
  };
}

export interface SimuladorCuota {
  unidadesActivas: number;
  gastoAnual: number;
  cuotaMensualSugerida: number;
}

/**
 * Simulador de cuota: dado el gasto anual presupuestado (o estimado),
 * calcula la cuota mensual por unidad (monto fijo, reparto igualitario).
 */
export async function simuladorCuota(gastoAnual: number): Promise<SimuladorCuota> {
  const unidadesActivas = await prisma.unidad.count({ where: { activo: true } });
  const cuota =
    unidadesActivas > 0 ? gastoAnual / unidadesActivas / 12 : 0;
  return {
    unidadesActivas,
    gastoAnual,
    cuotaMensualSugerida: Math.ceil(cuota),
  };
}
