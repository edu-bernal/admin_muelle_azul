"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const RUTA = "/usuarios";
/** Días que dura la invitación antes de caducar. */
const DIAS_INVITACION = 14;

function volver(mensaje: string, esError = false): never {
  redirect(`${RUTA}?${esError ? "error" : "ok"}=${encodeURIComponent(mensaje)}`);
}

function nuevaInvitacion() {
  return {
    activationToken: randomBytes(32).toString("hex"),
    activationExpires: new Date(Date.now() + DIAS_INVITACION * 24 * 60 * 60 * 1000),
  };
}

/**
 * Crea un acceso al sistema.
 *
 * El usuario nace INVITADO y sin contraseña: se le entrega un enlace de
 * invitación con el que él mismo la establece. Así nadie —ni el administrador
 * ni el sistema— llega a conocer la contraseña de otra persona.
 */
export async function crearAccesoAction(formData: FormData) {
  const actor = await requirePermission("usuarios.gestionar");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
  const rolId = String(formData.get("rolId") ?? "");
  const propietarioId = String(formData.get("propietarioId") ?? "") || null;

  if (!email || !email.includes("@")) volver("Indica un correo válido", true);
  if (!nombreCompleto) volver("Indica el nombre de la persona", true);
  if (!rolId) volver("Elige un rol", true);

  const rol = await prisma.rol.findUnique({ where: { id: rolId } });
  if (!rol) volver("Rol no válido", true);

  // Un rol de propietario sin propietario vinculado no vería nada suyo.
  if ((rol.codigo === "PROPIETARIO" || rol.codigo === "INQUILINO") && !propietarioId) {
    volver(`El rol ${rol.nombre} necesita un propietario vinculado`, true);
  }

  const invitacion = nuevaInvitacion();
  let creado;
  try {
    creado = await prisma.usuario.create({
      data: {
        email,
        nombreCompleto,
        rolId,
        propietarioId,
        estado: "INVITADO",
        ...invitacion,
      },
    });
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique")
        ? `Ya existe un acceso con el correo ${email}`
        : "No se pudo crear el acceso";
    volver(msg, true);
  }

  await audit({
    usuarioId: actor.userId,
    accion: "CREAR_ACCESO",
    entidad: "Usuario",
    entidadId: creado.id,
    datosDespues: { email, rol: rol.codigo, propietarioId },
  });

  revalidatePath(RUTA);
  // El token viaja en la URL para que el administrador copie el enlace: aún no
  // hay envío de correo desde el sistema.
  redirect(`${RUTA}?invitado=${creado.id}`);
}

/** Vuelve a generar la invitación cuando caducó o se perdió el enlace. */
export async function regenerarInvitacionAction(formData: FormData) {
  const actor = await requirePermission("usuarios.gestionar");
  const id = String(formData.get("id") ?? "");
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) volver("Acceso no encontrado", true);

  await prisma.usuario.update({
    where: { id },
    data: { ...nuevaInvitacion(), passwordHash: null, estado: "INVITADO" },
  });
  await audit({
    usuarioId: actor.userId,
    accion: "REGENERAR_INVITACION",
    entidad: "Usuario",
    entidadId: id,
    datosDespues: { email: usuario.email },
  });

  revalidatePath(RUTA);
  redirect(`${RUTA}?invitado=${id}`);
}

/** Suspende o reactiva un acceso. */
export async function alternarAccesoAction(formData: FormData) {
  const actor = await requirePermission("usuarios.gestionar");
  const id = String(formData.get("id") ?? "");
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) volver("Acceso no encontrado", true);

  // Suspenderse a uno mismo dejaría el sistema sin quien lo administre.
  if (id === actor.userId) volver("No puedes suspender tu propio acceso", true);

  const suspender = usuario.estado !== "SUSPENDIDO";
  // Quien nunca activó su invitación vuelve a INVITADO, no a ACTIVO: sin
  // contraseña no podría entrar igualmente.
  const nuevoEstado = suspender
    ? "SUSPENDIDO"
    : usuario.passwordHash
      ? "ACTIVO"
      : "INVITADO";

  await prisma.usuario.update({ where: { id }, data: { estado: nuevoEstado } });
  await audit({
    usuarioId: actor.userId,
    accion: suspender ? "SUSPENDER_ACCESO" : "REACTIVAR_ACCESO",
    entidad: "Usuario",
    entidadId: id,
    datosDespues: { email: usuario.email, estado: nuevoEstado },
  });

  revalidatePath(RUTA);
  volver(suspender ? "Acceso suspendido" : "Acceso reactivado");
}
