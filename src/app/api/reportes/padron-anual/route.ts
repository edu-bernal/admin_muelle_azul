import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { padronAnual } from "@/modules/finanzas/padron-anual.service";
import { libroPadronAnual } from "@/lib/excel/padron-anual-libro";

export const runtime = "nodejs";

/** Descarga el padrón general con abonos de un año en formato Excel. */
export async function GET(req: NextRequest) {
  await requirePermission("finanzas.reportes");

  const anio = Number(req.nextUrl.searchParams.get("anio"));
  const actual = new Date().getUTCFullYear();
  if (!Number.isInteger(anio) || anio < 2000 || anio > actual + 1) {
    return NextResponse.json({ error: "Año no válido" }, { status: 400 });
  }

  const datos = await padronAnual(anio);
  const libro = await libroPadronAnual(datos);

  return new NextResponse(new Uint8Array(libro), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="padron-abonos-${anio}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
