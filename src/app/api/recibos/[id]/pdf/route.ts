import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { obtenerDatosRecibo } from "@/modules/finanzas/recibo-pdf.service";
import { ReciboDocument } from "@/lib/pdf/recibo-document";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const resultado = await obtenerDatosRecibo(id);
  if (!resultado) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  }

  // Un propietario solo puede ver sus propios recibos; el staff administrativo ve todos.
  const esStaff = can(user, "finanzas.pagos.validar") || can(user, "finanzas.reportes");
  if (!esStaff && resultado.propietarioId !== user.propietarioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const numeroFinal = await prisma.reciboCaja.update({
    where: { id },
    data: { reimpresiones: { increment: 1 } },
    select: { reimpresiones: true },
  });

  if (numeroFinal.reimpresiones > 1) {
    await audit({
      usuarioId: user.userId,
      accion: "REIMPRIMIR_RECIBO",
      entidad: "ReciboCaja",
      entidadId: id,
      datosDespues: { reimpresiones: numeroFinal.reimpresiones },
    });
  }

  const buffer = await renderToBuffer(
    ReciboDocument({
      data: { ...resultado.data, reimpresiones: numeroFinal.reimpresiones },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${resultado.data.serie.toLowerCase()}-${resultado.data.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
