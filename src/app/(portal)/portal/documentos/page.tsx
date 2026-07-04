import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PortalDocumentosPage() {
  const documentos = await prisma.documento.findMany({
    where: { visibilidad: "PUBLICO_PROPIETARIOS" },
    orderBy: [{ carpeta: "asc" }, { createdAt: "desc" }],
  });

  const porCarpeta = documentos.reduce<Record<string, typeof documentos>>((acc, d) => {
    (acc[d.carpeta] ??= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Documentos</h1>
      {Object.keys(porCarpeta).length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">No hay documentos disponibles.</p>
        </Card>
      )}
      <div className="space-y-4">
        {Object.entries(porCarpeta).map(([carpeta, docs]) => (
          <Card key={carpeta}>
            <h2 className="mb-2 font-semibold text-slate-900">{carpeta}</h2>
            <ul className="space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between">
                  <span>{d.nombre}</span>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noopener" className="text-brand underline">
                      Abrir
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
