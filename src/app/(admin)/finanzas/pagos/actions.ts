"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  registrarPagoAdmin,
  confirmarPago,
  rechazarPago,
  anularPago,
  editarPago,
  type PagoResultado,
  type RegistrarPagoInput,
} from "@/modules/finanzas/pagos.service";
import type { MedioPago } from "@prisma/client";

const MEDIOS = [
  "TRANSFERENCIA",
  "YAPE",
  "PLIN",
  "EFECTIVO",
  "DEPOSITO",
  "CHEQUE",
];

export async function registrarPagoAction(formData: FormData) {
  const user = await requirePermission("finanzas.pagos.registrar");

  const propietarioId = String(formData.get("propietarioId") ?? "");
  const fechaStr = String(formData.get("fecha") ?? "");
  const monto = Number(formData.get("monto"));
  const medio = String(formData.get("medio") ?? "TRANSFERENCIA");

  if (!propietarioId || !fechaStr || !monto || monto <= 0 || !MEDIOS.includes(medio)) {
    redirect("/finanzas/pagos?error=Datos%20incompletos");
  }

  const input: RegistrarPagoInput = {
    propietarioId,
    fechaPago: new Date(`${fechaStr}T00:00:00Z`),
    monto,
    medio: medio as MedioPago,
    banco: (formData.get("banco") as string) || null,
    numeroOperacion: (formData.get("numeroOperacion") as string) || null,
  };

  let res: PagoResultado;
  try {
    res = await registrarPagoAdmin(input, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al registrar";
    redirect(`/finanzas/pagos?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/finanzas/pagos");
  redirect(
    `/finanzas/pagos?ok=recibo-${res.reciboNumero}&aplicado=${res.aplicado.toFixed(2)}`,
  );
}

export async function confirmarPagoAction(formData: FormData) {
  const user = await requirePermission("finanzas.pagos.validar");
  const pagoId = String(formData.get("pagoId") ?? "");
  if (!pagoId) redirect("/finanzas/pagos?error=Pago%20inv%C3%A1lido");

  try {
    await confirmarPago(pagoId, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/finanzas/pagos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/finanzas/pagos");
  redirect("/finanzas/pagos?ok=confirmado");
}

export async function rechazarPagoAction(formData: FormData) {
  const user = await requirePermission("finanzas.pagos.validar");
  const pagoId = String(formData.get("pagoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "Sin motivo");
  if (!pagoId) redirect("/finanzas/pagos?error=Pago%20inv%C3%A1lido");

  try {
    await rechazarPago(pagoId, motivo, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/finanzas/pagos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/finanzas/pagos");
  redirect("/finanzas/pagos?ok=rechazado");
}

export async function anularPagoAction(formData: FormData) {
  const user = await requirePermission("finanzas.pagos.validar");
  const pagoId = String(formData.get("pagoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!pagoId) redirect("/finanzas/pagos?error=Pago%20inv%C3%A1lido");
  if (!motivo) redirect("/finanzas/pagos?error=Indica%20el%20motivo%20de%20la%20anulaci%C3%B3n");

  try {
    await anularPago(pagoId, motivo, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/finanzas/pagos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/finanzas/pagos");
  redirect("/finanzas/pagos?ok=anulado");
}

export async function editarPagoAction(formData: FormData) {
  const user = await requirePermission("finanzas.pagos.registrar");
  const pagoId = String(formData.get("pagoId") ?? "");
  const fechaStr = String(formData.get("fecha") ?? "");
  const medio = String(formData.get("medio") ?? "");
  const montoStr = String(formData.get("monto") ?? "");

  if (!pagoId) redirect("/finanzas/pagos?error=Pago%20inv%C3%A1lido");
  if (!fechaStr || !MEDIOS.includes(medio)) {
    redirect(`/finanzas/pagos/${pagoId}/editar?error=Datos%20incompletos`);
  }

  try {
    await editarPago(
      pagoId,
      {
        medio: medio as MedioPago,
        banco: (formData.get("banco") as string) || null,
        numeroOperacion: (formData.get("numeroOperacion") as string) || null,
        fechaPago: new Date(`${fechaStr}T00:00:00Z`),
        monto: montoStr ? Number(montoStr) : undefined,
      },
      user.userId,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    redirect(`/finanzas/pagos/${pagoId}/editar?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/finanzas/pagos");
  redirect("/finanzas/pagos?ok=editado");
}
