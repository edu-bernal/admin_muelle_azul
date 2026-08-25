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
  // Vacío significa "sin valor propio": la emisión caerá en la tarifa.
  const valorTexto = String(formData.get("valor") ?? "").trim();
  const valor = valorTexto === "" ? null : Number(valorTexto);

  if (!codigo || !nombre) volver("Código y nombre son obligatorios", true);
  if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
    volver("El valor de la cuota debe ser un número positivo", true);
  }

  try {
    if (id) {
      await prisma.tipoUnidad.update({
        where: { id },
        data: { nombre, orden: Number.isFinite(orden) ? orden : 0, valor },
      });
      await audit({
        usuarioId: user.userId,
        accion: "EDITAR_TIPO_UNIDAD",
        entidad: "TipoUnidad",
        entidadId: id,
        datosDespues: { nombre, orden, valor },
      });
    } else {
      const creado = await prisma.tipoUnidad.create({
        data: { codigo, nombre, orden: Number.isFinite(orden) ? orden : 0, valor },
      });
      await audit({
        usuarioId: user.userId,
        accion: "CREAR_TIPO_UNIDAD",
        entidad: "TipoUnidad",
        entidadId: creado.id,
        datosDespues: { codigo, nombre, orden, valor },
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

// ── Conceptos de cobro ─────────────────────────────────────────────────────

export async function guardarConceptoAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const esRecurrente = formData.get("esRecurrente") === "on";
  const generaMora = formData.get("generaMora") === "on";

  if (!codigo || !nombre) volver("Código y nombre son obligatorios", true);

  try {
    if (id) {
      // El código no se edita: la emisión distingue la cuota ordinaria por el
      // código MANT, y los cargos históricos quedaron ligados a él.
      await prisma.conceptoCobro.update({
        where: { id },
        data: { nombre, esRecurrente, generaMora },
      });
      await audit({
        usuarioId: user.userId,
        accion: "EDITAR_CONCEPTO",
        entidad: "ConceptoCobro",
        entidadId: id,
        datosDespues: { nombre, esRecurrente, generaMora },
      });
    } else {
      const creado = await prisma.conceptoCobro.create({
        data: { codigo, nombre, esRecurrente, generaMora },
      });
      await audit({
        usuarioId: user.userId,
        accion: "CREAR_CONCEPTO",
        entidad: "ConceptoCobro",
        entidadId: creado.id,
        datosDespues: { codigo, nombre, esRecurrente, generaMora },
      });
    }
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? `Ya existe un concepto con el código ${codigo}`
      : "No se pudo guardar el concepto";
    volver(msg, true);
  }

  revalidatePath(RUTA);
  volver("Concepto guardado");
}

export async function alternarConceptoAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const concepto = await prisma.conceptoCobro.findUnique({
    where: { id },
    include: { _count: { select: { cargos: true } } },
  });
  if (!concepto) volver("Concepto no encontrado", true);

  if (concepto.activo && concepto.codigo === "MANT") {
    volver("La cuota de mantenimiento no se puede desactivar: es la base de la emisión ordinaria", true);
  }
  if (concepto.activo && concepto._count.cargos > 0) {
    volver(
      `No se puede desactivar: ${concepto._count.cargos} cargos usan el concepto ${concepto.nombre}`,
      true,
    );
  }

  await prisma.conceptoCobro.update({
    where: { id },
    data: { activo: !concepto.activo },
  });
  await audit({
    usuarioId: user.userId,
    accion: concepto.activo ? "DESACTIVAR_CONCEPTO" : "ACTIVAR_CONCEPTO",
    entidad: "ConceptoCobro",
    entidadId: id,
  });

  revalidatePath(RUTA);
  volver(concepto.activo ? "Concepto desactivado" : "Concepto activado");
}

// ── Tarifas de la cuota ordinaria ──────────────────────────────────────────

export async function guardarTarifaAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const desde = String(formData.get("vigenteDesde") ?? "");
  const monto = Number(formData.get("montoMensual"));
  const sectorId = String(formData.get("sectorId") ?? "") || null;

  if (!desde) volver("Indica desde cuándo rige la tarifa", true);
  if (!Number.isFinite(monto) || monto <= 0) volver("El monto debe ser mayor que cero", true);

  const data = {
    // Las tarifas rigen desde el primer día del mes indicado.
    vigenteDesde: new Date(`${desde.slice(0, 7)}-01T00:00:00Z`),
    montoMensual: monto,
    sectorId,
  };

  if (id) {
    await prisma.tarifaCuota.update({ where: { id }, data });
    await audit({
      usuarioId: user.userId,
      accion: "EDITAR_TARIFA",
      entidad: "TarifaCuota",
      entidadId: id,
      datosDespues: { ...data, vigenteDesde: data.vigenteDesde.toISOString() },
    });
  } else {
    const creada = await prisma.tarifaCuota.create({ data });
    await audit({
      usuarioId: user.userId,
      accion: "CREAR_TARIFA",
      entidad: "TarifaCuota",
      entidadId: creada.id,
      datosDespues: { ...data, vigenteDesde: data.vigenteDesde.toISOString() },
    });
  }

  revalidatePath(RUTA);
  volver("Tarifa guardada");
}

export async function eliminarTarifaAction(formData: FormData) {
  const user = await requirePermission("config.gestionar");
  const id = String(formData.get("id") ?? "");
  const tarifa = await prisma.tarifaCuota.findUnique({ where: { id } });
  if (!tarifa) volver("Tarifa no encontrada", true);

  // Sin una tarifa general no se puede emitir la cuota ordinaria.
  if (tarifa.sectorId === null) {
    const generales = await prisma.tarifaCuota.count({
      where: { sectorId: null },
    });
    if (generales <= 1) {
      volver("Debe quedar al menos una tarifa general o no se podrá emitir la cuota ordinaria", true);
    }
  }

  await prisma.tarifaCuota.delete({ where: { id } });
  await audit({
    usuarioId: user.userId,
    accion: "ELIMINAR_TARIFA",
    entidad: "TarifaCuota",
    entidadId: id,
    datosAntes: {
      vigenteDesde: tarifa.vigenteDesde.toISOString(),
      montoMensual: tarifa.montoMensual.toString(),
    },
  });

  revalidatePath(RUTA);
  volver("Tarifa eliminada");
}
