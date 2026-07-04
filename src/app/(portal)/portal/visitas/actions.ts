"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { preautorizarVisita } from "@/modules/operacion/accesos.service";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";

export async function preautorizarAction(formData: FormData) {
  const user = await requireUser();
  if (!user.propietarioId) redirect("/portal/visitas?error=Sin%20unidad");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2) redirect("/portal/visitas?error=Nombre%20requerido");

  const unidades = await unidadIdsDePropietario(user.propietarioId);
  if (unidades.length === 0) redirect("/portal/visitas?error=Sin%20unidad");

  await preautorizarVisita({
    unidadId: unidades[0],
    nombre,
    documento: (formData.get("documento") as string) || null,
    placa: (formData.get("placa") as string) || null,
    usuarioId: user.userId,
  });
  revalidatePath("/portal/visitas");
  redirect("/portal/visitas?ok=1");
}
