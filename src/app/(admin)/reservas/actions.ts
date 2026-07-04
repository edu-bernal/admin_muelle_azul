"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  crearReserva,
  aprobarReserva,
  rechazarReserva,
} from "@/modules/operacion/reservas.service";

export async function crearReservaAction(formData: FormData) {
  await requirePermission("reservas.gestionar");
  const areaId = String(formData.get("areaId") ?? "");
  const unidadId = String(formData.get("unidadId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const horaInicio = String(formData.get("horaInicio") ?? "");
  const horaFin = String(formData.get("horaFin") ?? "");

  if (!areaId || !unidadId || !fecha || !horaInicio || !horaFin) {
    redirect("/reservas?error=Completa%20todos%20los%20campos");
  }
  try {
    await crearReserva({
      areaId,
      unidadId,
      fecha: new Date(`${fecha}T00:00:00Z`),
      horaInicio,
      horaFin,
      numPersonas: formData.get("numPersonas")
        ? Number(formData.get("numPersonas"))
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/reservas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/reservas");
  redirect("/reservas?ok=1");
}

export async function aprobarReservaAction(formData: FormData) {
  const user = await requirePermission("reservas.gestionar");
  const id = String(formData.get("id") ?? "");
  try {
    await aprobarReserva(id, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/reservas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/reservas");
  redirect("/reservas?ok=aprobada");
}

export async function rechazarReservaAction(formData: FormData) {
  const user = await requirePermission("reservas.gestionar");
  const id = String(formData.get("id") ?? "");
  await rechazarReserva(id, user.userId);
  revalidatePath("/reservas");
  redirect("/reservas?ok=rechazada");
}
