import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consulta mínima a la base que Vercel Cron ejecuta una vez al día (ver
 * vercel.json). El plan gratuito de Supabase pausa el proyecto tras unos días
 * sin actividad, y entonces nadie puede iniciar sesión hasta restaurarlo a
 * mano desde el dashboard; ya pasó en agosto y noviembre de 2026. Con una
 * consulta diaria el proyecto nunca queda inactivo.
 *
 * Si existe CRON_SECRET, Vercel lo envía como "Bearer" en cada ejecución y la
 * ruta rechaza cualquier otra llamada. Sin esa variable responde a todos, lo
 * que no expone nada: solo devuelve si la base contestó.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
