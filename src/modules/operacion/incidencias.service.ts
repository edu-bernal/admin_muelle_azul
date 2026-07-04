import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/money";
import { audit } from "@/lib/audit";
import type {
  CategoriaIncidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from "@prisma/client";

async function siguienteCodigo(): Promise<string> {
  const n = await prisma.incidencia.count();
  return `INC-${String(n + 1).padStart(4, "0")}`;
}

export interface CrearIncidenciaInput {
  unidadId?: string | null;
  categoria: CategoriaIncidencia;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadIncidencia;
  costoEstimado?: number | null;
  reportadoPorId?: string | null;
}

export async function crearIncidencia(
  input: CrearIncidenciaInput,
): Promise<string> {
  const codigo = await siguienteCodigo();
  const inc = await prisma.$transaction(async (tx) => {
    const creada = await tx.incidencia.create({
      data: {
        codigo,
        unidadId: input.unidadId ?? null,
        categoria: input.categoria,
        titulo: input.titulo,
        descripcion: input.descripcion,
        prioridad: input.prioridad,
        costoEstimado: input.costoEstimado != null ? dec(input.costoEstimado) : null,
        reportadoPorId: input.reportadoPorId ?? null,
      },
    });
    await tx.incidenciaEvento.create({
      data: {
        incidenciaId: creada.id,
        estado: "REPORTADA",
        comentario: "Incidencia reportada",
        usuarioId: input.reportadoPorId ?? null,
      },
    });
    await audit(
      {
        usuarioId: input.reportadoPorId,
        accion: "CREAR_INCIDENCIA",
        entidad: "Incidencia",
        entidadId: creada.id,
        datosDespues: { codigo, categoria: input.categoria },
      },
      tx,
    );
    return creada;
  });
  return inc.id;
}

export async function cambiarEstadoIncidencia(
  incidenciaId: string,
  nuevoEstado: EstadoIncidencia,
  comentario?: string | null,
  usuarioId?: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.incidencia.update({
      where: { id: incidenciaId },
      data: { estado: nuevoEstado },
    });
    await tx.incidenciaEvento.create({
      data: {
        incidenciaId,
        estado: nuevoEstado,
        comentario: comentario ?? null,
        usuarioId: usuarioId ?? null,
      },
    });
    await audit(
      {
        usuarioId,
        accion: "CAMBIAR_ESTADO_INCIDENCIA",
        entidad: "Incidencia",
        entidadId: incidenciaId,
        datosDespues: { estado: nuevoEstado },
      },
      tx,
    );
  });
}
