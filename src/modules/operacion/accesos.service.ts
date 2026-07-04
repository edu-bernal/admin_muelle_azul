import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import type { TipoVisita } from "@prisma/client";

export interface RegistrarVisitaInput {
  unidadId?: string | null;
  nombre: string;
  documento?: string | null;
  placa?: string | null;
  tipo: TipoVisita;
  preautorizada?: boolean;
  registradoPorId?: string | null;
}

/** Garita: registra el ingreso de una visita. */
export async function registrarIngreso(
  input: RegistrarVisitaInput,
): Promise<string> {
  const visita = await prisma.visita.create({
    data: {
      unidadId: input.unidadId ?? null,
      nombre: input.nombre,
      documento: input.documento ?? null,
      placa: input.placa ?? null,
      tipo: input.tipo,
      preautorizada: input.preautorizada ?? false,
      ingresoAt: new Date(),
      registradoPorId: input.registradoPorId ?? null,
    },
  });
  await audit({
    usuarioId: input.registradoPorId,
    accion: "REGISTRAR_INGRESO",
    entidad: "Visita",
    entidadId: visita.id,
    datosDespues: { nombre: input.nombre, tipo: input.tipo },
  });
  return visita.id;
}

/** Garita: marca la salida de una visita. */
export async function registrarSalida(
  visitaId: string,
  usuarioId?: string | null,
): Promise<void> {
  await prisma.visita.update({
    where: { id: visitaId },
    data: { salidaAt: new Date() },
  });
  await audit({
    usuarioId,
    accion: "REGISTRAR_SALIDA",
    entidad: "Visita",
    entidadId: visitaId,
  });
}

/** Propietario: pre-autoriza una visita futura. */
export async function preautorizarVisita(input: {
  unidadId: string;
  nombre: string;
  documento?: string | null;
  placa?: string | null;
  usuarioId?: string | null;
}): Promise<string> {
  const visita = await prisma.visita.create({
    data: {
      unidadId: input.unidadId,
      nombre: input.nombre,
      documento: input.documento ?? null,
      placa: input.placa ?? null,
      tipo: "VISITA",
      preautorizada: true,
      preautorizadaPorId: input.usuarioId ?? null,
    },
  });
  return visita.id;
}
