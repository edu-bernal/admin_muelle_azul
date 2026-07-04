"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import type { VisibilidadDocumento } from "@prisma/client";

export async function crearDocumento(formData: FormData) {
  const user = await requirePermission("documentos.gestionar");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const carpeta = String(formData.get("carpeta") ?? "General").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (nombre.length < 2) redirect("/documentos?error=Nombre%20requerido");

  await prisma.documento.create({
    data: {
      nombre,
      carpeta: carpeta || "General",
      url: url || null,
      visibilidad: (String(
        formData.get("visibilidad") ?? "PUBLICO_PROPIETARIOS",
      )) as VisibilidadDocumento,
      subidoPorId: user.userId,
    },
  });
  revalidatePath("/documentos");
  redirect("/documentos?ok=1");
}
