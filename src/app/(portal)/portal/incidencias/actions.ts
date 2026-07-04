"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { crearIncidencia } from "@/modules/operacion/incidencias.service";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import type { CategoriaIncidencia } from "@prisma/client";

export async function reportarIncidenciaAction(formData: FormData) {
  const user = await requireUser();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (titulo.length < 3 || descripcion.length < 3) {
    redirect("/portal/incidencias?error=Completa%20los%20campos");
  }

  const unidades = user.propietarioId
    ? await unidadIdsDePropietario(user.propietarioId)
    : [];

  await crearIncidencia({
    unidadId: unidades[0] ?? null,
    categoria: (String(formData.get("categoria") ?? "OTRO")) as CategoriaIncidencia,
    titulo,
    descripcion,
    prioridad: "MEDIA",
    reportadoPorId: user.userId,
  });
  revalidatePath("/portal/incidencias");
  redirect("/portal/incidencias?ok=1");
}
