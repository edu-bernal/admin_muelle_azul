import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";
import { unidadIdsDePropietario } from "./shared";

export interface CargoPendiente {
  cargoId: string;
  unidadCodigo: string;
  descripcion: string;
  periodo: string | null;
  fechaVencimiento: string;
  saldo: number;
}

/**
 * Cargos con saldo de un propietario, en el MISMO orden en que los tomará
 * `aplicarPagoFIFO` (vencimiento y luego creación). Ese orden importa: la
 * pantalla de registro los muestra así para que lo que el usuario marca
 * coincida con lo que el pago va a cubrir realmente.
 */
export async function cargosPendientesDePropietario(
  propietarioId: string,
): Promise<CargoPendiente[]> {
  const unidadIds = await unidadIdsDePropietario(propietarioId);
  if (unidadIds.length === 0) return [];

  const cargos = await prisma.cargo.findMany({
    where: {
      unidadId: { in: unidadIds },
      estado: { in: ["PENDIENTE", "PARCIAL"] },
    },
    include: {
      aplicaciones: true,
      unidad: { select: { codigo: true } },
    },
    orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
  });

  return cargos
    .map((c) => {
      const aplicado = c.aplicaciones.reduce(
        (acc, a) => acc.plus(a.montoAplicado),
        ZERO,
      );
      const saldo = new Prisma.Decimal(c.monto).minus(aplicado);
      return {
        cargoId: c.id,
        unidadCodigo: c.unidad.codigo,
        descripcion: c.descripcion,
        periodo: c.periodo ? c.periodo.toISOString().slice(0, 7) : null,
        fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
        saldo: saldo.toNumber(),
      };
    })
    .filter((c) => c.saldo > 0);
}
