"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const RUTA = "/parametros";

function volver(mensaje: string, esError = false): never {
  redirect(`${RUTA}?${esError ? "error" : "ok"}=${encodeURIComponent(mensaje)}`);
}

/** El código identifica al registro en importaciones y reportes: se normaliza. */
function normalizarCodigo(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 20);
}

// ── Sectores ───────────────────────────────────────────────────────────────

export async function guardarSectorAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!codigo || !nombre) volver("Código y nombre son obligatorios", true);

  try {
    if (id) {
      // El código no se edita: las unidades ya creadas lo llevan en su código.
      await prisma.sector.update({ where: { id }, data: { nombre } });
      await audit({
        usuarioId: user.userId,
        accion: "EDITAR_SECTOR",
        entidad: "Sector",
        entidadId: id,
        datosDespues: { nombre },
      });
    } else {
      const creado = await prisma.sector.create({ data: { codigo, nombre } });
      await audit({
        usuarioId: user.userId,
        accion: "CREAR_SECTOR",
        entidad: "Sector",
        entidadId: creado.id,
        datosDespues: { codigo, nombre },
      });
    }
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? `Ya existe un sector con el código ${codigo}`
      : "No se pudo guardar el sector";
    volver(msg, true);
  }

  revalidatePath(RUTA);
  volver("Sector guardado");
}

export async function alternarSectorAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const sector = await prisma.sector.findUnique({
    where: { id },
    include: { _count: { select: { unidades: true } } },
  });
  if (!sector) volver("Sector no encontrado", true);

  // Desactivar un sector con unidades lo dejaría fuera de los formularios
  // mientras sus unidades siguen vivas: se bloquea.
  if (sector.activo && sector._count.unidades > 0) {
    volver(
      `No se puede desactivar: ${sector._count.unidades} unidades usan el sector ${sector.nombre}`,
      true,
    );
  }

  await prisma.sector.update({
    where: { id },
    data: { activo: !sector.activo },
  });
  await audit({
    usuarioId: user.userId,
    accion: sector.activo ? "DESACTIVAR_SECTOR" : "ACTIVAR_SECTOR",
    entidad: "Sector",
    entidadId: id,
  });

  revalidatePath(RUTA);
  volver(sector.activo ? "Sector desactivado" : "Sector activado");
}

// ── Tipos de propiedad ─────────────────────────────────────────────────────

export async function guardarTipoAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const orden = Number(formData.get("orden") ?? 0);

  if (!codigo || !nombre) volver("Código y nombre son obligatorios", true);

  try {
    if (id) {
      await prisma.tipoUnidad.update({
        where: { id },
        data: { nombre, orden: Number.isFinite(orden) ? orden : 0 },
      });
      await audit({
        usuarioId: user.userId,
        accion: "EDITAR_TIPO_UNIDAD",
        entidad: "TipoUnidad",
        entidadId: id,
        datosDespues: { nombre, orden },
      });
    } else {
      const creado = await prisma.tipoUnidad.create({
        data: { codigo, nombre, orden: Number.isFinite(orden) ? orden : 0 },
      });
      await audit({
        usuarioId: user.userId,
        accion: "CREAR_TIPO_UNIDAD",
        entidad: "TipoUnidad",
        entidadId: creado.id,
        datosDespues: { codigo, nombre, orden },
      });
    }
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? `Ya existe un tipo con el código ${codigo}`
      : "No se pudo guardar el tipo de propiedad";
    volver(msg, true);
  }

  revalidatePath(RUTA);
  volver("Tipo de propiedad guardado");
}

export async function alternarTipoAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const tipo = await prisma.tipoUnidad.findUnique({
    where: { id },
    include: { _count: { select: { unidades: true } } },
  });
  if (!tipo) volver("Tipo no encontrado", true);

  if (tipo.activo && tipo._count.unidades > 0) {
    volver(
      `No se puede desactivar: ${tipo._count.unidades} unidades son de tipo ${tipo.nombre}`,
      true,
    );
  }

  // Debe quedar al menos un tipo activo o no se podrían crear unidades.
  if (tipo.activo) {
    const activos = await prisma.tipoUnidad.count({ where: { activo: true } });
    if (activos <= 1) {
      volver("Debe quedar al menos un tipo de propiedad activo", true);
    }
  }

  await prisma.tipoUnidad.update({
    where: { id },
    data: { activo: !tipo.activo },
  });
  await audit({
    usuarioId: user.userId,
    accion: tipo.activo ? "DESACTIVAR_TIPO_UNIDAD" : "ACTIVAR_TIPO_UNIDAD",
    entidad: "TipoUnidad",
    entidadId: id,
  });

  revalidatePath(RUTA);
  volver(tipo.activo ? "Tipo desactivado" : "Tipo activado");
}
