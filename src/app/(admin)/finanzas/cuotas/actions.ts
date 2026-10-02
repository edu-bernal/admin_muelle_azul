"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { editarCargo, mensajeCuotaEditada } from "@/modules/finanzas/cargos.service";

/** Solo se vuelve a rutas internas: el destino llega en el formulario. */
function rutaSegura(volver: string): string {
  return volver.startsWith("/") && !volver.startsWith("//") ? volver : "/finanzas/estados-cuenta";
}

function conMensaje(ruta: string, clave: "ok" | "error", mensaje: string): string {
  return `${ruta}${ruta.includes("?") ? "&" : "?"}${clave}=${encodeURIComponent(mensaje)}`;
}

export async function editarCuotaAction(formData: FormData) {
  const user = await requirePermission("finanzas.emitir");
  const cargoId = String(formData.get("cargoId") ?? "");
  const volver = rutaSegura(String(formData.get("volver") ?? ""));
  const monto = Number(formData.get("monto"));
  const conceptoCobroId = String(formData.get("conceptoCobroId") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "");
  const propia = `/finanzas/cuotas/${cargoId}/editar?volver=${encodeURIComponent(volver)}`;

  if (!cargoId) redirect(conMensaje(volver, "error", "Cuota inválida"));
  if (!Number.isFinite(monto) || monto <= 0) {
    redirect(conMensaje(propia, "error", "El monto debe ser mayor que cero"));
  }

  // El redirect de éxito va fuera del try: redirect() señaliza lanzando una
  // excepción, y dentro del try el catch la tomaría por un fallo.
  let res: Awaited<ReturnType<typeof editarCargo>>;
  try {
    res = await editarCargo(cargoId, { monto, conceptoCobroId, descripcion }, user.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo editar la cuota";
    redirect(conMensaje(propia, "error", msg));
  }

  revalidatePath("/finanzas/estados-cuenta");
  redirect(conMensaje(volver, "ok", `${res.codigoUnidad}: ${mensajeCuotaEditada(res)}`));
}
