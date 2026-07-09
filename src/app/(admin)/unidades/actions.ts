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
  tipo: z.enum(["CASA", "TERRENO"]),
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
    tipo: formData.get("tipo") || "CASA",
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
    tipo: d.tipo,
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
