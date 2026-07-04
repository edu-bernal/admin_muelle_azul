import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PortalComunicadosPage() {
  const comunicados = await prisma.comunicado.findMany({
    orderBy: { publicadoAt: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Comunicados</h1>
      <div className="space-y-3">
        {comunicados.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{c.titulo}</h3>
              <span className="shrink-0 text-xs text-slate-400">
                {c.publicadoAt.toISOString().slice(0, 10)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
              {c.cuerpo}
            </p>
          </Card>
        ))}
        {comunicados.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">No hay comunicados por ahora.</p>
          </Card>
        )}
      </div>
    </>
  );
}
