"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function crearComunicado(formData: FormData) {
  const user = await requirePermission("comunicados.gestionar");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  const vigenteHasta = String(formData.get("vigenteHasta") ?? "");
  const audienciaTipo = String(formData.get("audiencia") ?? "TODOS");

  if (titulo.length < 3 || cuerpo.length < 3) {
    redirect("/comunicados?error=Completa%20t%C3%ADtulo%20y%20cuerpo");
  }

  const creado = await prisma.comunicado.create({
    data: {
      titulo,
      cuerpo,
      audiencia: { tipo: audienciaTipo },
      requiereConfirmacion: formData.get("requiereConfirmacion") === "on",
      vigenteHasta: vigenteHasta ? new Date(`${vigenteHasta}T23:59:59Z`) : null,
      creadoPorId: user.userId,
    },
  });
  await audit({
    usuarioId: user.userId,
    accion: "PUBLICAR_COMUNICADO",
    entidad: "Comunicado",
    entidadId: creado.id,
    datosDespues: { titulo },
  });

  revalidatePath("/comunicados");
  redirect("/comunicados?ok=1");
}
