"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  registrarIngreso,
  registrarSalida,
} from "@/modules/operacion/accesos.service";
import type { TipoVisita } from "@prisma/client";

export async function registrarIngresoAction(formData: FormData) {
  const user = await requirePermission("accesos.registrar");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2) redirect("/accesos?error=Nombre%20requerido");
  await registrarIngreso({
    nombre,
    documento: (formData.get("documento") as string) || null,
    placa: (formData.get("placa") as string) || null,
    unidadId: (formData.get("unidadId") as string) || null,
    tipo: (String(formData.get("tipo") ?? "VISITA")) as TipoVisita,
    registradoPorId: user.userId,
  });
  revalidatePath("/accesos");
  redirect("/accesos?ok=1");
}

export async function registrarSalidaAction(formData: FormData) {
  const user = await requirePermission("accesos.registrar");
  const id = String(formData.get("id") ?? "");
  if (id) await registrarSalida(id, user.userId);
  revalidatePath("/accesos");
  redirect("/accesos?ok=salida");
}
