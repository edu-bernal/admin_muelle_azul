import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/money";
import { audit } from "@/lib/audit";
import { emitirCargoIndividual } from "@/modules/finanzas/emision.service";

export interface CrearMultaInput {
  unidadId: string;
  infraccionId?: string | null;
  descripcion: string;
  monto: number;
  registradoPorId?: string | null;
}

export async function crearMulta(input: CrearMultaInput): Promise<string> {
  const multa = await prisma.multa.create({
    data: {
      unidadId: input.unidadId,
      infraccionId: input.infraccionId ?? null,
      descripcion: input.descripcion,
      monto: dec(input.monto),
      registradoPorId: input.registradoPorId ?? null,
    },
  });
  await audit({
    usuarioId: input.registradoPorId,
    accion: "CREAR_MULTA",
    entidad: "Multa",
    entidadId: multa.id,
    datosDespues: { monto: input.monto, unidadId: input.unidadId },
  });
  return multa.id;
}

/**
 * Confirma una multa: genera el cargo correspondiente en el estado de cuenta
 * de la unidad (concepto MULTA) y vincula el cargo a la multa.
 */
export async function confirmarMulta(
  multaId: string,
  usuarioId?: string | null,
): Promise<void> {
  const multa = await prisma.multa.findUnique({ where: { id: multaId } });
  if (!multa) throw new Error("Multa no encontrada");
  if (multa.estado === "CONFIRMADA") throw new Error("La multa ya fue confirmada");
  if (multa.estado === "ANULADA") throw new Error("La multa está anulada");

  const vencimiento = new Date();
  vencimiento.setDate(vencimiento.getDate() + 30);

  const cargoId = await emitirCargoIndividual({
    unidadId: multa.unidadId,
    conceptoCodigo: "MULTA",
    descripcion: `Multa: ${multa.descripcion}`,
    monto: Number(multa.monto),
    fechaVencimiento: vencimiento,
    creadoPorId: usuarioId,
  });

  await prisma.multa.update({
    where: { id: multaId },
    data: { estado: "CONFIRMADA", cargoId },
  });
  await audit({
    usuarioId,
    accion: "CONFIRMAR_MULTA",
    entidad: "Multa",
    entidadId: multaId,
    datosDespues: { estado: "CONFIRMADA", cargoId },
  });
}
