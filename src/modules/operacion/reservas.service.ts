import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { emitirCargoIndividual } from "@/modules/finanzas/emision.service";

export interface CrearReservaInput {
  areaId: string;
  unidadId: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  numPersonas?: number | null;
  solicitanteId?: string | null;
  observacion?: string | null;
}

export async function crearReserva(input: CrearReservaInput): Promise<string> {
  const area = await prisma.areaComun.findUnique({ where: { id: input.areaId } });
  if (!area || !area.activo) throw new Error("Área no disponible");

  // Evita solapes confirmados/solicitados en la misma área, fecha y franja.
  const solapada = await prisma.reserva.findFirst({
    where: {
      areaId: input.areaId,
      fecha: input.fecha,
      estado: { in: ["SOLICITADA", "CONFIRMADA"] },
      horaInicio: { lt: input.horaFin },
      horaFin: { gt: input.horaInicio },
    },
  });
  if (solapada) throw new Error("Ya existe una reserva en esa franja horaria");

  const estado = area.requiereAprobacion ? "SOLICITADA" : "CONFIRMADA";
  const reserva = await prisma.reserva.create({
    data: {
      areaId: input.areaId,
      unidadId: input.unidadId,
      fecha: input.fecha,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      numPersonas: input.numPersonas ?? null,
      solicitanteId: input.solicitanteId ?? null,
      observacion: input.observacion ?? null,
      estado,
    },
  });
  await audit({
    usuarioId: input.solicitanteId,
    accion: "CREAR_RESERVA",
    entidad: "Reserva",
    entidadId: reserva.id,
    datosDespues: { area: area.nombre, fecha: input.fecha.toISOString().slice(0, 10) },
  });
  return reserva.id;
}

/** Aprueba una reserva y, si el área tiene tarifa, genera el cargo. */
export async function aprobarReserva(
  reservaId: string,
  usuarioId?: string | null,
): Promise<void> {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { area: true },
  });
  if (!reserva) throw new Error("Reserva no encontrada");
  if (reserva.estado !== "SOLICITADA")
    throw new Error("Solo se aprueban reservas solicitadas");

  let cargoId: string | null = null;
  if (Number(reserva.area.tarifa) > 0) {
    const vencimiento = new Date(reserva.fecha);
    cargoId = await emitirCargoIndividual({
      unidadId: reserva.unidadId,
      conceptoCodigo: "OTRO",
      descripcion: `Reserva ${reserva.area.nombre} — ${reserva.fecha
        .toISOString()
        .slice(0, 10)}`,
      monto: Number(reserva.area.tarifa),
      fechaVencimiento: vencimiento,
      creadoPorId: usuarioId,
    });
  }

  await prisma.reserva.update({
    where: { id: reservaId },
    data: { estado: "CONFIRMADA", cargoId },
  });
  await audit({
    usuarioId,
    accion: "APROBAR_RESERVA",
    entidad: "Reserva",
    entidadId: reservaId,
    datosDespues: { estado: "CONFIRMADA", cargoId },
  });
}

export async function rechazarReserva(
  reservaId: string,
  usuarioId?: string | null,
): Promise<void> {
  await prisma.reserva.update({
    where: { id: reservaId },
    data: { estado: "RECHAZADA" },
  });
  await audit({
    usuarioId,
    accion: "RECHAZAR_RESERVA",
    entidad: "Reserva",
    entidadId: reservaId,
    datosDespues: { estado: "RECHAZADA" },
  });
}
