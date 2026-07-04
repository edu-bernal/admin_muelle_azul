"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { crearMulta, confirmarMulta } from "@/modules/operacion/multas.service";

export async function crearMultaAction(formData: FormData) {
  const user = await requirePermission("multas.gestionar");
  const unidadId = String(formData.get("unidadId") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const monto = Number(formData.get("monto"));
  if (!unidadId || descripcion.length < 3 || !monto || monto <= 0) {
    redirect("/multas?error=Completa%20los%20campos");
  }
  await crearMulta({
    unidadId,
    infraccionId: (formData.get("infraccionId") as string) || null,
    descripcion,
    monto,
    registradoPorId: user.userId,
  });
  revalidatePath("/multas");
  redirect("/multas?ok=1");
}

export async function confirmarMultaAction(formData: FormData) {
  const user = await requirePermission("multas.gestionar");
  const id = String(formData.get("id") ?? "");
  try {
    await confirmarMulta(id, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/multas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/multas");
  redirect("/multas?ok=confirmada");
}
