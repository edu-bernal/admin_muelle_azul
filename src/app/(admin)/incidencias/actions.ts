"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  crearIncidencia,
  cambiarEstadoIncidencia,
} from "@/modules/operacion/incidencias.service";
import type {
  CategoriaIncidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from "@prisma/client";

export async function crearIncidenciaAction(formData: FormData) {
  const user = await requirePermission("incidencias.crear");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (titulo.length < 3 || descripcion.length < 3) {
    redirect("/incidencias?error=Completa%20los%20campos");
  }
  await crearIncidencia({
    unidadId: (formData.get("unidadId") as string) || null,
    categoria: (String(formData.get("categoria") ?? "OTRO")) as CategoriaIncidencia,
    titulo,
    descripcion,
    prioridad: (String(formData.get("prioridad") ?? "MEDIA")) as PrioridadIncidencia,
    reportadoPorId: user.userId,
  });
  revalidatePath("/incidencias");
  redirect("/incidencias?ok=1");
}

export async function cambiarEstadoAction(formData: FormData) {
  const user = await requirePermission("incidencias.gestionar");
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoIncidencia;
  if (!id || !estado) redirect("/incidencias?error=Datos%20inv%C3%A1lidos");
  await cambiarEstadoIncidencia(id, estado, `Estado → ${estado}`, user.userId);
  revalidatePath("/incidencias");
  redirect("/incidencias?ok=estado");
}
