"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { ROLES_ADMIN, type RolCodigo } from "@/lib/rbac";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=campos");

  const user = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true },
  });

  if (!user || !user.passwordHash || user.estado !== "ACTIVO") {
    redirect("/login?error=credenciales");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect("/login?error=credenciales");

  await prisma.usuario.update({
    where: { id: user.id },
    data: { ultimoAcceso: new Date() },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    nombre: user.nombreCompleto,
    rol: user.rol.codigo,
    propietarioId: user.propietarioId,
  });

  const esAdmin = ROLES_ADMIN.includes(user.rol.codigo as RolCodigo);
  redirect(esAdmin ? "/dashboard" : "/portal");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
