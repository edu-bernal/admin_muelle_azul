import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser, can } from "@/lib/auth";
import { cartolaPropietario } from "@/modules/finanzas/cartola.service";
import { CartolaDocument } from "@/lib/pdf/cartola-document";

export const runtime = "nodejs";

/** Rango por defecto: el año en curso hasta hoy. */
function rangoPorDefecto(): { desde: Date; hasta: Date } {
  const hoy = new Date();
  return {
    desde: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)),
    hasta: hoy,
  };
}

function fecha(valor: string | null, porDefecto: Date): Date {
  if (!valor) return porDefecto;
  const d = new Date(`${valor}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? porDefecto : d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  // Un propietario solo descarga su propio estado de cuenta.
  const esStaff =
    can(user, "finanzas.estadocuenta.todos") || can(user, "finanzas.reportes");
  if (!esStaff && user.propietarioId !== id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const porDefecto = rangoPorDefecto();
  const desde = fecha(req.nextUrl.searchParams.get("desde"), porDefecto.desde);
  const hasta = fecha(req.nextUrl.searchParams.get("hasta"), porDefecto.hasta);

  let cartola;
  try {
    cartola = await cartolaPropietario(id, desde, hasta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  const buffer = await renderToBuffer(CartolaDocument({ data: cartola }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="estado-cuenta-${cartola.desde}-${cartola.hasta}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
