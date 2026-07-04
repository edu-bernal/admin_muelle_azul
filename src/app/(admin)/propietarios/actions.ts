"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  nombre: z.string().min(3, "Nombre requerido"),
  tipoDocumento: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]).optional(),
  numeroDocumento: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  canalEnvio: z.enum(["CORREO", "WHATSAPP"]).default("CORREO"),
});

export async function crearPropietario(formData: FormData) {
  const user = await requirePermission("propietarios.gestionar");

  const parsed = schema.safeParse({
    nombre: formData.get("nombre"),
    tipoDocumento: formData.get("tipoDocumento") || undefined,
    numeroDocumento: formData.get("numeroDocumento") || undefined,
    email: formData.get("email") || "",
    telefono: formData.get("telefono") || undefined,
    canalEnvio: formData.get("canalEnvio") || "CORREO",
  });
  if (!parsed.success) redirect("/propietarios/nuevo?error=validacion");

  const d = parsed.data;
  const creado = await prisma.propietario.create({
    data: {
      nombre: d.nombre,
      tipoDocumento: d.tipoDocumento ?? null,
      numeroDocumento: d.numeroDocumento || null,
      email: d.email || null,
      telefono: d.telefono || null,
      canalEnvio: d.canalEnvio,
    },
  });
  await audit({
    usuarioId: user.userId,
    accion: "CREAR_PROPIETARIO",
    entidad: "Propietario",
    entidadId: creado.id,
    datosDespues: { nombre: d.nombre },
  });

  revalidatePath("/propietarios");
  redirect("/propietarios");
}
