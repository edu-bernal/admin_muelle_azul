import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ROLES_ADMIN, type RolCodigo } from "@/lib/rbac";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(
    ROLES_ADMIN.includes(session.rol as RolCodigo) ? "/dashboard" : "/portal",
  );
}
