import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";

export async function crearVotacion(input: {
  pregunta: string;
  descripcion?: string | null;
  opciones: string[];
  ponderacion: "ALICUOTA" | "UNIDAD";
  cierraAt?: Date | null;
  creadoPorId?: string | null;
}): Promise<string> {
  const v = await prisma.votacion.create({
    data: {
      pregunta: input.pregunta,
      descripcion: input.descripcion ?? null,
      opciones: input.opciones,
      ponderacion: input.ponderacion,
      estado: "ABIERTA",
      abreAt: new Date(),
      cierraAt: input.cierraAt ?? null,
      creadoPorId: input.creadoPorId ?? null,
    },
  });
  await audit({
    usuarioId: input.creadoPorId,
    accion: "CREAR_VOTACION",
    entidad: "Votacion",
    entidadId: v.id,
    datosDespues: { pregunta: input.pregunta },
  });
  return v.id;
}

export async function cerrarVotacion(
  votacionId: string,
  usuarioId?: string | null,
): Promise<void> {
  await prisma.votacion.update({
    where: { id: votacionId },
    data: { estado: "CERRADA" },
  });
  await audit({
    usuarioId,
    accion: "CERRAR_VOTACION",
    entidad: "Votacion",
    entidadId: votacionId,
  });
}

/** Un propietario emite su voto (una vez por unidad). */
export async function emitirVoto(
  votacionId: string,
  propietarioId: string,
  opcion: string,
  usuarioId?: string | null,
): Promise<void> {
  const votacion = await prisma.votacion.findUnique({ where: { id: votacionId } });
  if (!votacion || votacion.estado !== "ABIERTA")
    throw new Error("La votación no está abierta");

  const unidadIds = await unidadIdsDePropietario(propietarioId);
  if (unidadIds.length === 0) throw new Error("No tienes una unidad asociada");

  for (const unidadId of unidadIds) {
    const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } });
    const peso =
      votacion.ponderacion === "ALICUOTA" && unidad?.alicuota
        ? new Prisma.Decimal(unidad.alicuota)
        : new Prisma.Decimal(1);
    await prisma.voto.upsert({
      where: { votacionId_unidadId: { votacionId, unidadId } },
      create: { votacionId, unidadId, opcion, peso, emitidoPorId: usuarioId ?? null },
      update: { opcion, emitidoAt: new Date() },
    });
  }
}

export interface ResultadoVotacion {
  opcion: string;
  votos: number;
  peso: number;
}

export async function resultados(votacionId: string): Promise<ResultadoVotacion[]> {
  const votacion = await prisma.votacion.findUnique({
    where: { id: votacionId },
    include: { votos: true },
  });
  if (!votacion) return [];
  const opciones = (votacion.opciones as string[]) ?? [];
  return opciones.map((op) => {
    const votos = votacion.votos.filter((v) => v.opcion === op);
    const peso = votos.reduce(
      (acc, v) => acc.plus(v.peso),
      ZERO,
    );
    return { opcion: op, votos: votos.length, peso: peso.toNumber() };
  });
}
