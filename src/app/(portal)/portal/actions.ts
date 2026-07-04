"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { declararPago } from "@/modules/finanzas/pagos.service";
import type { MedioPago } from "@prisma/client";

const MEDIOS = ["TRANSFERENCIA", "YAPE", "PLIN", "EFECTIVO", "DEPOSITO"];

export async function declararPagoAction(formData: FormData) {
  const user = await requireUser();
  // El propietarioId proviene SIEMPRE de la sesión, nunca del formulario.
  if (!user.propietarioId) redirect("/portal?error=Sin%20propietario%20asociado");

  const monto = Number(formData.get("monto"));
  const fechaStr = String(formData.get("fecha") ?? "");
  const medio = String(formData.get("medio") ?? "TRANSFERENCIA");

  if (!monto || monto <= 0 || !fechaStr || !MEDIOS.includes(medio)) {
    redirect("/portal?error=Datos%20incompletos");
  }

  try {
    await declararPago(
      {
        propietarioId: user.propietarioId,
        fechaPago: new Date(`${fechaStr}T00:00:00Z`),
        monto,
        medio: medio as MedioPago,
        numeroOperacion: (formData.get("numeroOperacion") as string) || null,
      },
      user.userId,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/portal?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/portal");
  redirect("/portal?ok=1");
}
