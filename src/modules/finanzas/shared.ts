import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

/** IDs de las unidades vigentes asociadas a un propietario. */
export async function unidadIdsDePropietario(
  propietarioId: string,
  tx: Tx = prisma,
): Promise<string[]> {
  const titularidades = await tx.propiedadTitularidad.findMany({
    where: { propietarioId, fechaFin: null },
    select: { unidadId: true },
  });
  return [...new Set(titularidades.map((t) => t.unidadId))];
}

/** Primer día del mes (normaliza un período mensual). */
export function primerDiaDelMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

/** Siguiente número de recibo de caja (correlativo global). */
export async function siguienteNumeroRecibo(tx: Tx = prisma): Promise<number> {
  const cfg = await tx.configuracion.findUnique({
    where: { clave: "recibo_inicio" },
  });
  const inicio =
    cfg && typeof cfg.valor === "number" ? (cfg.valor as number) : 799;
  const ultimo = await tx.reciboCaja.aggregate({ _max: { numero: true } });
  const max = ultimo._max.numero ?? inicio - 1;
  return Math.max(max + 1, inicio);
}
