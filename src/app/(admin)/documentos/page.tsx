import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { crearDocumento } from "./actions";

export const dynamic = "force-dynamic";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const documentos = await prisma.documento.findMany({
    orderBy: [{ carpeta: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Reglamento, actas, estados financieros y pólizas"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Documento agregado.
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Agregar documento</h2>
        <form action={crearDocumento} className="grid gap-3 md:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre
            </label>
            <input id="nombre" name="nombre" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="carpeta">
              Carpeta
            </label>
            <input id="carpeta" name="carpeta" placeholder="Actas" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="url">
              Enlace (URL)
            </label>
            <input id="url" name="url" placeholder="https://…" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="visibilidad">
              Visibilidad
            </label>
            <select id="visibilidad" name="visibilidad" className={inputClass}>
              <option value="PUBLICO_PROPIETARIOS">Propietarios</option>
              <option value="SOLO_ADMIN">Solo administración</option>
            </select>
          </div>
          <div>
            <button type="submit" className={buttonClass()}>
              Agregar
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Carpeta</th>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Visibilidad</th>
            <th className="px-4 py-3">Enlace</th>
          </tr>
        }
      >
        {documentos.map((d) => (
          <tr key={d.id}>
            <td className="px-4 py-3 text-slate-500">{d.carpeta}</td>
            <td className="px-4 py-3 font-medium">{d.nombre}</td>
            <td className="px-4 py-3">
              <Badge>
                {d.visibilidad === "SOLO_ADMIN" ? "SOLO_ADMIN" : "PROPIETARIOS"}
              </Badge>
            </td>
            <td className="px-4 py-3">
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener" className="text-brand underline">
                  Abrir
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
        {documentos.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              No hay documentos.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
