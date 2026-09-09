"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";

const MIN_LARGO = 8;

/**
 * Activa un acceso: la persona establece su propia contraseña con el enlace
 * de invitación. Nadie más la conoce, ni siquiera queda registrada en claro.
 */
export async function activarCuentaAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  // La anotación explícita del tipo es necesaria: sin ella TypeScript no
  // trata la llamada como un punto sin retorno y sigue viendo nulos después.
  const error: (msg: string) => never = (msg) =>
    redirect(`/activar/${token}?error=${encodeURIComponent(msg)}`);

  if (!token) error("Enlace inválido");
  if (password.length < MIN_LARGO) {
    error(`La contraseña debe tener al menos ${MIN_LARGO} caracteres`);
  }
  if (password !== confirmacion) error("Las contraseñas no coinciden");

  const usuario = await prisma.usuario.findUnique({
    where: { activationToken: token },
  });
  if (!usuario) error("Este enlace no es válido o ya fue usado");
  if (usuario.activationExpires && usuario.activationExpires < new Date()) {
    error("Este enlace caducó. Pide uno nuevo a la administración.");
  }
  if (usuario.estado === "SUSPENDIDO") {
    error("Este acceso está suspendido. Contacta a la administración.");
  }

  // El token se consume: un enlace de invitación sirve una sola vez.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash: await hashPassword(password),
      estado: "ACTIVO",
      activationToken: null,
      activationExpires: null,
    },
  });

  await audit({
    usuarioId: usuario.id,
    accion: "ACTIVAR_CUENTA",
    entidad: "Usuario",
    entidadId: usuario.id,
    datosDespues: { email: usuario.email },
  });

  redirect("/login?activado=1");
}
