import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { cargosPendientesDePropietario } from "@/modules/finanzas/cargos-pendientes.service";

export const runtime = "nodejs";

/** Alimenta el selector de deuda de la pantalla de registro de pagos. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("finanzas.pagos.registrar");
  const { id } = await params;
  const cargos = await cargosPendientesDePropietario(id);
  return NextResponse.json(
    { cargos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
