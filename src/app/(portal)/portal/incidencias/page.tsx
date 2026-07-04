import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import {
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { reportarIncidenciaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalIncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const unidadIds = user.propietarioId
    ? await unidadIdsDePropietario(user.propietarioId)
    : [];

  const incidencias = await prisma.incidencia.findMany({
    where: {
      OR: [
        { unidadId: { in: unidadIds } },
        { reportadoPorId: user.userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Incidencias</h1>

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Tu reporte fue enviado. La administración le dará seguimiento.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Reportar una incidencia
        </h2>
        <form action={reportarIncidenciaAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="titulo">
                Título
              </label>
              <input id="titulo" name="titulo" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="categoria">
                Categoría
              </label>
              <select id="categoria" name="categoria" className={inputClass}>
                <option value="ELECTRICO">Eléctrico</option>
                <option value="SANITARIO">Sanitario</option>
                <option value="PISCINA">Piscina</option>
                <option value="JARDINES">Jardines</option>
                <option value="SEGURIDAD">Seguridad</option>
                <option value="LIMPIEZA">Limpieza</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="descripcion">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              required
              rows={3}
              className={inputClass}
            />
          </div>
          <button type="submit" className={buttonClass()}>
            Enviar reporte
          </button>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Mis reportes</h2>
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {incidencias.map((i) => (
          <tr key={i.id}>
            <td className="px-4 py-3 font-medium">{i.codigo}</td>
            <td className="px-4 py-3">{i.titulo}</td>
            <td className="px-4 py-3 text-slate-500">{i.categoria}</td>
            <td className="px-4 py-3">
              <Badge>{i.estado}</Badge>
            </td>
          </tr>
        ))}
        {incidencias.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              No has reportado incidencias.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
