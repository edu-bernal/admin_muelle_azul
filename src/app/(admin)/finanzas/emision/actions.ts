"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  confirmarEmision,
  type EmisionResultado,
} from "@/modules/finanzas/emision.service";

export async function confirmarEmisionAction(formData: FormData) {
  const user = await requirePermission("finanzas.emitir");
  const periodoStr = String(formData.get("periodo") ?? "");
  const vencStr = String(formData.get("venc") ?? "");
  const concepto = String(formData.get("concepto") ?? "MANT");
  const montoStr = String(formData.get("monto") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "");

  if (!/^\d{4}-\d{2}$/.test(periodoStr) || !/^\d{4}-\d{2}-\d{2}$/.test(vencStr)) {
    redirect("/finanzas/emision?error=Fechas%20inv%C3%A1lidas");
  }

  const periodo = new Date(`${periodoStr}-01T00:00:00Z`);
  const fechaVencimiento = new Date(`${vencStr}T00:00:00Z`);
  const montoManual = montoStr ? Number(montoStr) : undefined;

  let res: EmisionResultado;
  try {
    res = await confirmarEmision({
      conceptoCodigo: concepto,
      periodo,
      fechaVencimiento,
      montoManual,
      descripcion: descripcion || undefined,
      creadoPorId: user.userId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al emitir";
    redirect(`/finanzas/emision?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/finanzas/emision");
  redirect(
    `/finanzas/emision?ok=${res.cantidadCargos}&total=${res.total.toFixed(2)}`,
  );
}
