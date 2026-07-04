"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { confirmarPago } from "@/modules/finanzas/pagos.service";

export async function confirmarConciliadoAction(formData: FormData) {
  const user = await requirePermission("conciliacion.gestionar");
  const pagoId = String(formData.get("pagoId") ?? "");
  if (!pagoId) redirect("/finanzas/conciliacion?error=Pago%20inv%C3%A1lido");
  try {
    await confirmarPago(pagoId, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/finanzas/conciliacion?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/finanzas/conciliacion");
  redirect("/finanzas/conciliacion?ok=1");
}
