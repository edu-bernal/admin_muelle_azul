"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { crearVotacion, cerrarVotacion } from "@/modules/operacion/votaciones.service";

export async function crearVotacionAction(formData: FormData) {
  const user = await requirePermission("votaciones.gestionar");
  const pregunta = String(formData.get("pregunta") ?? "").trim();
  const opcionesRaw = String(formData.get("opciones") ?? "").trim();
  if (pregunta.length < 5 || !opcionesRaw) {
    redirect("/votaciones?error=Completa%20pregunta%20y%20opciones");
  }
  const opciones = opcionesRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (opciones.length < 2) redirect("/votaciones?error=Al%20menos%202%20opciones");

  await crearVotacion({
    pregunta,
    descripcion: (formData.get("descripcion") as string) || null,
    opciones,
    ponderacion: (String(formData.get("ponderacion") ?? "UNIDAD")) as "UNIDAD" | "ALICUOTA",
    creadoPorId: user.userId,
  });
  revalidatePath("/votaciones");
  redirect("/votaciones?ok=1");
}

export async function cerrarVotacionAction(formData: FormData) {
  const user = await requirePermission("votaciones.gestionar");
  const id = String(formData.get("id") ?? "");
  if (id) await cerrarVotacion(id, user.userId);
  revalidatePath("/votaciones");
  redirect("/votaciones?ok=cerrada");
}
