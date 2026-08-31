"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const unidadSchema = z.object({
  sectorId: z.string().min(1, "Sector requerido"),
  manzana: z.string().min(1, "Manzana requerida"),
  lote: z.string().min(1, "Lote requerido"),
  tipoId: z.string().min(1, "Elige un tipo de propiedad"),
  fechaAdquisicion: z.string().optional(),
  areaM2: z.string().optional(),
  alicuota: z.string().optional(),
  baseCalculoCuota: z.enum(["ALICUOTA", "FIJO", "M2"]).optional(),
  montoFijoCuota: z.string().optional(),
  estadoOcupacion: z.enum(["PROPIETARIO", "ALQUILADA", "DESOCUPADA", "EN_VENTA"]),
  unidadPrincipalId: z.string().optional(),
});

function parseForm(formData: FormData) {
  return unidadSchema.safeParse({
    sectorId: formData.get("sectorId"),
    manzana: formData.get("manzana"),
    lote: formData.get("lote"),
    tipoId: formData.get("tipoId") ?? "",
    fechaAdquisicion: formData.get("fechaAdquisicion") || undefined,
    areaM2: formData.get("areaM2") || undefined,
    alicuota: formData.get("alicuota") || undefined,
    baseCalculoCuota: formData.get("baseCalculoCuota") || undefined,
    montoFijoCuota: formData.get("montoFijoCuota") || undefined,
    estadoOcupacion: formData.get("estadoOcupacion") || "PROPIETARIO",
    unidadPrincipalId: formData.get("unidadPrincipalId") || undefined,
  });
}

function toData(d: z.infer<typeof unidadSchema>) {
  return {
    sectorId: d.sectorId,
    manzana: d.manzana.trim(),
    lote: d.lote.trim(),
    tipoId: d.tipoId,
    fechaAdquisicion: d.fechaAdquisicion
      ? new Date(`${d.fechaAdquisicion}T00:00:00Z`)
      : null,
    areaM2: d.areaM2 ? new Prisma.Decimal(d.areaM2) : null,
    alicuota: d.alicuota ? new Prisma.Decimal(d.alicuota) : null,
    baseCalculoCuota: d.baseCalculoCuota ?? null,
    montoFijoCuota: d.montoFijoCuota ? new Prisma.Decimal(d.montoFijoCuota) : null,
    estadoOcupacion: d.estadoOcupacion,
    unidadPrincipalId: d.unidadPrincipalId || null,
  };
}

function esCodigoDuplicado(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function crearUnidad(formData: FormData) {
  const user = await requirePermission("unidades.gestionar");
  const parsed = parseForm(formData);
  if (!parsed.success) redirect("/unidades/nueva?error=Revisa%20los%20datos%20ingresados");

  const sector = await prisma.sector.findUnique({ where: { id: parsed.data.sectorId } });
  if (!sector) redirect("/unidades/nueva?error=Sector%20inv%C3%A1lido");

  const codigo = `${sector.codigo}-${parsed.data.manzana.trim()}_${parsed.data.lote.trim()}`;

  let creada;
  try {
    creada = await prisma.unidad.create({ data: { codigo, ...toData(parsed.data) } });
  } catch (e) {
    const msg = esCodigoDuplicado(e)
      ? `Ya existe una unidad con el código ${codigo}`
      : "No se pudo guardar la unidad";
    redirect(`/unidades/nueva?error=${encodeURIComponent(msg)}`);
  }

  await audit({
    usuarioId: user.userId,
    accion: "CREAR_UNIDAD",
    entidad: "Unidad",
    entidadId: creada.id,
    datosDespues: { codigo },
  });

  revalidatePath("/unidades");
  redirect(`/unidades/${creada.id}`);
}

export async function actualizarUnidad(formData: FormData) {
  const user = await requirePermission("unidades.gestionar");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/unidades?error=Unidad%20inv%C3%A1lida");

  const parsed = parseForm(formData);
  if (!parsed.success) redirect(`/unidades/${id}/editar?error=Revisa%20los%20datos%20ingresados`);

  const antes = await prisma.unidad.findUnique({ where: { id } });
  if (!antes) redirect("/unidades?error=Unidad%20no%20encontrada");

  if (parsed.data.unidadPrincipalId === id) {
    redirect(`/unidades/${id}/editar?error=Una%20unidad%20no%20puede%20ser%20su%20propia%20unidad%20principal`);
  }

  try {
    // El código es inmutable (RN-U1): no se recalcula al editar sector/manzana/lote.
    await prisma.unidad.update({ where: { id }, data: toData(parsed.data) });
  } catch (e) {
    const msg = esCodigoDuplicado(e) ? "Conflicto al guardar la unidad" : "No se pudo guardar la unidad";
    redirect(`/unidades/${id}/editar?error=${encodeURIComponent(msg)}`);
  }

  await audit({
    usuarioId: user.userId,
    accion: "ACTUALIZAR_UNIDAD",
    entidad: "Unidad",
    entidadId: id,
    datosAntes: { manzana: antes.manzana, lote: antes.lote },
  });

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${id}`);
  redirect(`/unidades/${id}`);
}

/** Inactiva o reactiva una unidad (borrado lógico). */
export async function cambiarEstadoUnidad(formData: FormData) {
  const user = await requirePermission("unidades.gestionar");
  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "true";
  if (!id) redirect("/unidades?error=Unidad%20inv%C3%A1lida");

  await prisma.unidad.update({ where: { id }, data: { activo } });
  await audit({
    usuarioId: user.userId,
    accion: activo ? "REACTIVAR_UNIDAD" : "INACTIVAR_UNIDAD",
    entidad: "Unidad",
    entidadId: id,
  });

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${id}`);
  redirect(`/unidades/${id}?ok=1`);
}

/**
 * Agrega una cochera a una propiedad.
 *
 * La cochera se crea como una unidad más de tipo COCHERA, vinculada a la
 * propiedad principal. Hereda su sector y sus titularidades vigentes, para que
 * los cargos que genere pertenezcan al mismo propietario. Como toda unidad
 * activa entra en la emisión, cobrará la cuota del tipo COCHERA definida en
 * Parámetros del sistema.
 */
export async function agregarCochera(formData: FormData) {
  const user = await requirePermission("unidades.gestionar");
  const principalId = String(formData.get("unidadId") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!principalId) redirect("/unidades?error=Propiedad%20inv%C3%A1lida");

  const principal = await prisma.unidad.findUnique({
    where: { id: principalId },
    include: {
      unidadesVinculadas: { select: { id: true } },
      titularidades: { where: { fechaFin: null } },
    },
  });
  if (!principal) redirect("/unidades?error=Propiedad%20no%20encontrada");

  const tipoCochera = await prisma.tipoUnidad.findUnique({
    where: { codigo: "COCHERA" },
  });
  if (!tipoCochera) {
    redirect(
      `/unidades/${principalId}?error=${encodeURIComponent(
        "Falta el tipo COCHERA. Créalo en Parámetros del sistema.",
      )}`,
    );
  }

  // El correlativo se calcula sobre las cocheras ya existentes de esta
  // propiedad, para que el código no choque al agregar y quitar.
  const existentes = await prisma.unidad.count({
    where: { unidadPrincipalId: principalId, tipoId: tipoCochera.id },
  });
  let numero = existentes + 1;
  let codigo = `${principal.codigo}-C${numero}`;
  while (await prisma.unidad.findUnique({ where: { codigo }, select: { id: true } })) {
    numero++;
    codigo = `${principal.codigo}-C${numero}`;
  }

  const cochera = await prisma.unidad.create({
    data: {
      codigo,
      sectorId: principal.sectorId,
      manzana: principal.manzana,
      lote: `${principal.lote}-C${numero}`,
      tipoId: tipoCochera.id,
      unidadPrincipalId: principalId,
      estadoOcupacion: principal.estadoOcupacion,
    },
  });

  // Mismos titulares que la propiedad: si no, sus cargos no serían de nadie.
  if (principal.titularidades.length > 0) {
    await prisma.propiedadTitularidad.createMany({
      data: principal.titularidades.map((t) => ({
        propietarioId: t.propietarioId,
        unidadId: cochera.id,
        porcentaje: t.porcentaje,
        esResponsablePago: t.esResponsablePago,
      })),
    });
  }

  await audit({
    usuarioId: user.userId,
    accion: "AGREGAR_COCHERA",
    entidad: "Unidad",
    entidadId: cochera.id,
    datosDespues: { codigo, propiedad: principal.codigo, descripcion },
  });

  revalidatePath(`/unidades/${principalId}`);
  redirect(`/unidades/${principalId}?ok=${encodeURIComponent(`Cochera ${codigo} agregada`)}`);
}

/** Elimina una cochera. Solo si no llegó a generar cargos. */
export async function eliminarCochera(formData: FormData) {
  const user = await requirePermission("unidades.gestionar");
  const cocheraId = String(formData.get("cocheraId") ?? "");
  const principalId = String(formData.get("unidadId") ?? "");
  if (!cocheraId) redirect(`/unidades/${principalId}?error=Cochera%20inv%C3%A1lida`);

  const cochera = await prisma.unidad.findUnique({
    where: { id: cocheraId },
    include: { _count: { select: { cargos: true } } },
  });
  if (!cochera) redirect(`/unidades/${principalId}?error=Cochera%20no%20encontrada`);

  // Con cargos emitidos hay historia contable: se inactiva, no se borra.
  if (cochera._count.cargos > 0) {
    redirect(
      `/unidades/${principalId}?error=${encodeURIComponent(
        `La cochera ${cochera.codigo} ya tiene ${cochera._count.cargos} cargos emitidos. Inactívala desde su ficha en vez de eliminarla.`,
      )}`,
    );
  }

  await prisma.propiedadTitularidad.deleteMany({ where: { unidadId: cocheraId } });
  await prisma.unidad.delete({ where: { id: cocheraId } });

  await audit({
    usuarioId: user.userId,
    accion: "ELIMINAR_COCHERA",
    entidad: "Unidad",
    entidadId: cocheraId,
    datosAntes: { codigo: cochera.codigo },
  });

  revalidatePath(`/unidades/${principalId}`);
  redirect(`/unidades/${principalId}?ok=${encodeURIComponent(`Cochera ${cochera.codigo} eliminada`)}`);
}
