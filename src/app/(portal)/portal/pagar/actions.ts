"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { pagarEnLinea } from "@/modules/finanzas/pagos.service";

export async function pagarEnLineaAction(formData: FormData) {
  const user = await requireUser();
  if (!user.propietarioId) redirect("/portal/pagar?error=Sin%20unidad");
  const monto = Number(formData.get("monto"));
  if (!monto || monto <= 0) redirect("/portal/pagar?error=Monto%20inv%C3%A1lido");

  // Pasarela simulada: en producción, la confirmación llega por webhook.
  const opSimulada = "PSL-" + String(monto).replace(".", "");
  try {
    await pagarEnLinea(
      {
        propietarioId: user.propietarioId,
        fechaPago: new Date(),
        monto,
        numeroOperacion: opSimulada,
      },
      user.userId,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/portal/pagar?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/portal");
  redirect("/portal?ok=1");
}
