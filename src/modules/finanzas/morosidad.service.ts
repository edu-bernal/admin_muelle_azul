import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";

export interface FilaMorosidad {
  unidadCodigo: string;
  sector: string;
  responsable: string;
  corriente: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90mas: number;
  total: number;
}

export interface ReporteMorosidad {
  corte: string;
  filas: FilaMorosidad[];
  totales: Omit<FilaMorosidad, "unidadCodigo" | "sector" | "responsable">;
}

function diasEntre(desde: Date, hasta: Date): number {
  const ms = hasta.getTime() - desde.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Reporte de morosidad por antigüedad de deuda a una fecha de corte. */
export async function reporteMorosidad(
  corte: Date = new Date(),
): Promise<ReporteMorosidad> {
  const cargos = await prisma.cargo.findMany({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    include: {
      aplicaciones: true,
      unidad: {
        include: {
          sector: true,
          titularidades: {
            where: { fechaFin: null },
            include: { propietario: true },
          },
        },
      },
    },
  });

  const porUnidad = new Map<string, FilaMorosidad>();

  for (const c of cargos) {
    const aplicado = c.aplicaciones.reduce(
      (acc, a) => acc.plus(a.montoAplicado),
      ZERO,
    );
    const saldo = new Prisma.Decimal(c.monto).minus(aplicado);
    if (saldo.lte(ZERO)) continue;

    const key = c.unidad.codigo;
    if (!porUnidad.has(key)) {
      const resp =
        c.unidad.titularidades.find((t) => t.esResponsablePago) ??
        c.unidad.titularidades[0];
      porUnidad.set(key, {
        unidadCodigo: c.unidad.codigo,
        sector: c.unidad.sector.nombre,
        responsable: resp?.propietario.nombre ?? "—",
        corriente: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90mas: 0,
        total: 0,
      });
    }
    const fila = porUnidad.get(key)!;
    const dias = diasEntre(c.fechaVencimiento, corte);
    const monto = saldo.toNumber();
    if (dias <= 0) fila.corriente += monto;
    else if (dias <= 30) fila.d1_30 += monto;
    else if (dias <= 60) fila.d31_60 += monto;
    else if (dias <= 90) fila.d61_90 += monto;
    else fila.d90mas += monto;
    fila.total += monto;
  }

  const filas = [...porUnidad.values()].sort((a, b) => b.total - a.total);
  const totales = filas.reduce(
    (acc, f) => ({
      corriente: acc.corriente + f.corriente,
      d1_30: acc.d1_30 + f.d1_30,
      d31_60: acc.d31_60 + f.d31_60,
      d61_90: acc.d61_90 + f.d61_90,
      d90mas: acc.d90mas + f.d90mas,
      total: acc.total + f.total,
    }),
    { corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90mas: 0, total: 0 },
  );

  return { corte: corte.toISOString().slice(0, 10), filas, totales };
}
