"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function crearProveedor(formData: FormData) {
  const user = await requirePermission("proveedores.gestionar");
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  if (razonSocial.length < 2) redirect("/proveedores/nuevo?error=1");

  const creado = await prisma.proveedor.create({
    data: {
      razonSocial,
      ruc: (formData.get("ruc") as string) || null,
      rubro: (formData.get("rubro") as string) || null,
      contactoNombre: (formData.get("contactoNombre") as string) || null,
      contactoTelefono: (formData.get("contactoTelefono") as string) || null,
    },
  });
  await audit({
    usuarioId: user.userId,
    accion: "CREAR_PROVEEDOR",
    entidad: "Proveedor",
    entidadId: creado.id,
    datosDespues: { razonSocial },
  });

  revalidatePath("/proveedores");
  redirect("/proveedores");
}
