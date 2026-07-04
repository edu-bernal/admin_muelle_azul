"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { emitirVoto } from "@/modules/operacion/votaciones.service";

export async function votarAction(formData: FormData) {
  const user = await requireUser();
  if (!user.propietarioId) redirect("/portal/votaciones?error=Sin%20unidad");
  const votacionId = String(formData.get("votacionId") ?? "");
  const opcion = String(formData.get("opcion") ?? "");
  if (!votacionId || !opcion) redirect("/portal/votaciones?error=Selecciona%20una%20opci%C3%B3n");
  try {
    await emitirVoto(votacionId, user.propietarioId, opcion, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/portal/votaciones?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/portal/votaciones");
  redirect("/portal/votaciones?ok=1");
}
