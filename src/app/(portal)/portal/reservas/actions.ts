"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { crearReserva } from "@/modules/operacion/reservas.service";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";

export async function solicitarReservaAction(formData: FormData) {
  const user = await requireUser();
  if (!user.propietarioId) redirect("/portal/reservas?error=Sin%20unidad");

  // La unidad se deriva de la titularidad del propietario, no del formulario.
  const unidades = await unidadIdsDePropietario(user.propietarioId);
  if (unidades.length === 0) redirect("/portal/reservas?error=Sin%20unidad");

  const areaId = String(formData.get("areaId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const horaInicio = String(formData.get("horaInicio") ?? "");
  const horaFin = String(formData.get("horaFin") ?? "");
  if (!areaId || !fecha || !horaInicio || !horaFin) {
    redirect("/portal/reservas?error=Completa%20los%20campos");
  }

  try {
    await crearReserva({
      areaId,
      unidadId: unidades[0],
      fecha: new Date(`${fecha}T00:00:00Z`),
      horaInicio,
      horaFin,
      solicitanteId: user.userId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/portal/reservas?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/portal/reservas");
  redirect("/portal/reservas?ok=1");
}
