import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";
import { hasPermission, ROLES_ADMIN, type RolCodigo } from "./rbac";

/** Devuelve la sesión o null. */
export async function currentUser(): Promise<SessionPayload | null> {
  return getSession();
}

/** Exige sesión; si no hay, redirige a login. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Exige que el usuario tenga el permiso; si no, redirige. */
export async function requirePermission(
  permiso: string,
): Promise<SessionPayload> {
  const user = await requireUser();
  if (!hasPermission(user.rol, permiso)) redirect("/sin-acceso");
  return user;
}

/** Exige que el usuario sea de un rol administrativo. */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (!ROLES_ADMIN.includes(user.rol as RolCodigo)) redirect("/portal");
  return user;
}

export function can(user: SessionPayload | null, permiso: string): boolean {
  if (!user) return false;
  return hasPermission(user.rol, permiso);
}
