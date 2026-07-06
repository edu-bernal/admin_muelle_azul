"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const propietarioSchema = z.object({
  nombre: z.string().min(3, "Nombre requerido"),
  tipoDocumento: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]).optional(),
  numeroDocumento: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emailSecundario: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  telefonoSecundario: z.string().optional(),
  canalEnvio: z.enum(["CORREO", "WHATSAPP"]).default("CORREO"),
  direccionHabitual: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
});

function parseForm(formData: FormData) {
  return propietarioSchema.safeParse({
    nombre: formData.get("nombre"),
    tipoDocumento: formData.get("tipoDocumento") || undefined,
    numeroDocumento: formData.get("numeroDocumento") || undefined,
    email: formData.get("email") || "",
    emailSecundario: formData.get("emailSecundario") || "",
    telefono: formData.get("telefono") || undefined,
    telefonoSecundario: formData.get("telefonoSecundario") || undefined,
    canalEnvio: formData.get("canalEnvio") || "CORREO",
    direccionHabitual: formData.get("direccionHabitual") || undefined,
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre") || undefined,
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono") || undefined,
  });
}

function toData(d: z.infer<typeof propietarioSchema>) {
  const contactoEmergencia =
    d.contactoEmergenciaNombre || d.contactoEmergenciaTelefono
      ? { nombre: d.contactoEmergenciaNombre || null, telefono: d.contactoEmergenciaTelefono || null }
      : Prisma.JsonNull;

  return {
    nombre: d.nombre,
    tipoDocumento: d.tipoDocumento ?? null,
    numeroDocumento: d.numeroDocumento || null,
    email: d.email || null,
    emailSecundario: d.emailSecundario || null,
    telefono: d.telefono || null,
    telefonoSecundario: d.telefonoSecundario || null,
    canalEnvio: d.canalEnvio,
    direccionHabitual: d.direccionHabitual || null,
    contactoEmergencia: contactoEmergencia as unknown as Prisma.InputJsonValue,
  };
}

function esDocumentoDuplicado(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function crearPropietario(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const parsed = parseForm(formData);
  if (!parsed.success) redirect("/propietarios/nuevo?error=Revisa%20los%20datos%20ingresados");

  let creado;
  try {
    creado = await prisma.propietario.create({ data: toData(parsed.data) });
  } catch (e) {
    const msg = esDocumentoDuplicado(e)
      ? "Ya existe un propietario con ese tipo y número de documento"
      : "No se pudo guardar el propietario";
    redirect(`/propietarios/nuevo?error=${encodeURIComponent(msg)}`);
  }

  await audit({
    usuarioId: user.userId,
    accion: "CREAR_PROPIETARIO",
    entidad: "Propietario",
    entidadId: creado.id,
    datosDespues: { nombre: parsed.data.nombre },
  });

  revalidatePath("/propietarios");
  redirect(`/propietarios/${creado.id}`);
}

export async function actualizarPropietario(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/propietarios?error=Propietario%20inv%C3%A1lido");

  const parsed = parseForm(formData);
  if (!parsed.success) redirect(`/propietarios/${id}/editar?error=Revisa%20los%20datos%20ingresados`);

  const antes = await prisma.propietario.findUnique({ where: { id } });
  if (!antes) redirect("/propietarios?error=Propietario%20no%20encontrado");

  try {
    await prisma.propietario.update({ where: { id }, data: toData(parsed.data) });
  } catch (e) {
    const msg = esDocumentoDuplicado(e)
      ? "Ya existe un propietario con ese tipo y número de documento"
      : "No se pudo guardar el propietario";
    redirect(`/propietarios/${id}/editar?error=${encodeURIComponent(msg)}`);
  }

  await audit({
    usuarioId: user.userId,
    accion: "ACTUALIZAR_PROPIETARIO",
    entidad: "Propietario",
    entidadId: id,
    datosAntes: { nombre: antes.nombre },
    datosDespues: { nombre: parsed.data.nombre },
  });

  revalidatePath("/propietarios");
  revalidatePath(`/propietarios/${id}`);
  redirect(`/propietarios/${id}`);
}

/** Inactiva o reactiva un propietario (borrado lógico — RN-P4: nunca se elimina). */
export async function cambiarEstadoPropietario(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "true";
  if (!id) redirect("/propietarios?error=Propietario%20inv%C3%A1lido");

  await prisma.propietario.update({ where: { id }, data: { activo } });
  await audit({
    usuarioId: user.userId,
    accion: activo ? "REACTIVAR_PROPIETARIO" : "INACTIVAR_PROPIETARIO",
    entidad: "Propietario",
    entidadId: id,
  });

  revalidatePath("/propietarios");
  revalidatePath(`/propietarios/${id}`);
  redirect(`/propietarios/${id}?ok=1`);
}

/** Asigna una unidad adicional a un propietario existente (nueva titularidad). */
export async function asignarUnidadAction(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const propietarioId = String(formData.get("propietarioId") ?? "");
  const unidadId = String(formData.get("unidadId") ?? "");
  const esResponsablePago = formData.get("esResponsablePago") === "on";
  const porcentaje = Number(formData.get("porcentaje") ?? 100);

  if (!propietarioId || !unidadId) {
    redirect(`/propietarios/${propietarioId}?error=Selecciona%20una%20unidad`);
  }

  const existente = await prisma.propiedadTitularidad.findFirst({
    where: { propietarioId, unidadId, fechaFin: null },
  });
  if (existente) {
    redirect(`/propietarios/${propietarioId}?error=Ya%20est%C3%A1%20asignado%20a%20esa%20unidad`);
  }

  await prisma.$transaction(async (tx) => {
    if (esResponsablePago) {
      await tx.propiedadTitularidad.updateMany({
        where: { unidadId, fechaFin: null },
        data: { esResponsablePago: false },
      });
    }
    await tx.propiedadTitularidad.create({
      data: { propietarioId, unidadId, esResponsablePago, porcentaje },
    });
  });

  await audit({
    usuarioId: user.userId,
    accion: "ASIGNAR_UNIDAD",
    entidad: "PropiedadTitularidad",
    entidadId: propietarioId,
    datosDespues: { unidadId, esResponsablePago, porcentaje },
  });

  revalidatePath(`/propietarios/${propietarioId}`);
  redirect(`/propietarios/${propietarioId}?ok=1`);
}

/** Marca el fin de una titularidad (venta/transferencia de la unidad). */
export async function finalizarTitularidadAction(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const titularidadId = String(formData.get("titularidadId") ?? "");
  const propietarioId = String(formData.get("propietarioId") ?? "");
  if (!titularidadId) redirect(`/propietarios/${propietarioId}?error=Inv%C3%A1lido`);

  await prisma.propiedadTitularidad.update({
    where: { id: titularidadId },
    data: { fechaFin: new Date() },
  });
  await audit({
    usuarioId: user.userId,
    accion: "FINALIZAR_TITULARIDAD",
    entidad: "PropiedadTitularidad",
    entidadId: titularidadId,
  });

  revalidatePath(`/propietarios/${propietarioId}`);
  redirect(`/propietarios/${propietarioId}?ok=1`);
}

/** Actualiza el rol (responsable de pago / %) de una titularidad vigente. */
export async function actualizarTitularidadAction(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");
  const titularidadId = String(formData.get("titularidadId") ?? "");
  const propietarioId = String(formData.get("propietarioId") ?? "");
  const esResponsablePago = formData.get("esResponsablePago") === "on";
  const porcentaje = Number(formData.get("porcentaje") ?? 100);
  if (!titularidadId) redirect(`/propietarios/${propietarioId}?error=Inv%C3%A1lido`);

  await prisma.$transaction(async (tx) => {
    if (esResponsablePago) {
      const t = await tx.propiedadTitularidad.findUnique({ where: { id: titularidadId } });
      if (t) {
        await tx.propiedadTitularidad.updateMany({
          where: { unidadId: t.unidadId, fechaFin: null, id: { not: titularidadId } },
          data: { esResponsablePago: false },
        });
      }
    }
    await tx.propiedadTitularidad.update({
      where: { id: titularidadId },
      data: { esResponsablePago, porcentaje },
    });
  });

  await audit({
    usuarioId: user.userId,
    accion: "ACTUALIZAR_TITULARIDAD",
    entidad: "PropiedadTitularidad",
    entidadId: titularidadId,
    datosDespues: { esResponsablePago, porcentaje },
  });

  revalidatePath(`/propietarios/${propietarioId}`);
  redirect(`/propietarios/${propietarioId}?ok=1`);
}
