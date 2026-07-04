"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { generarPlanilla, pagarPlanilla } from "@/modules/finanzas/planilla.service";

export async function generarPlanillaAction(formData: FormData) {
  const user = await requirePermission("planillas.gestionar");
  const periodoStr = String(formData.get("periodo") ?? "");
  if (!/^\d{4}-\d{2}$/.test(periodoStr)) {
    redirect("/planillas?error=Per%C3%ADodo%20inv%C3%A1lido");
  }
  try {
    await generarPlanilla(new Date(`${periodoStr}-01T00:00:00Z`), user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/planillas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/planillas");
  redirect("/planillas?ok=generada");
}

export async function pagarPlanillaAction(formData: FormData) {
  const user = await requirePermission("planillas.gestionar");
  const id = String(formData.get("id") ?? "");
  try {
    await pagarPlanilla(id, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/planillas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/planillas");
  redirect("/planillas?ok=pagada");
}
