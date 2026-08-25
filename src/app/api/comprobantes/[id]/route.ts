import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, can } from "@/lib/auth";
import { leerArchivo } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Entrega el comprobante de un pago. El contenido se retransmite desde el
 * almacenamiento en vez de redirigir, para que la URL del blob no llegue
 * nunca al navegador y el acceso quede siempre sujeto a la sesión.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const archivo = await prisma.archivo.findUnique({ where: { id } });
  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  // Un propietario solo ve los comprobantes de sus propios pagos.
  const esStaff =
    can(user, "finanzas.pagos.validar") || can(user, "finanzas.reportes");
  if (!esStaff) {
    const propio = await prisma.pago.findFirst({
      where: { voucherArchivoId: id, propietarioId: user.propietarioId ?? "" },
      select: { id: true },
    });
    if (!propio) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  let contenido: Buffer;
  try {
    contenido = await leerArchivo(archivo.storageKey);
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo almacenado" },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(contenido), {
    status: 200,
    headers: {
      "Content-Type": archivo.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(archivo.nombreOriginal)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
