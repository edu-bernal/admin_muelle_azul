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
import { crearIncidenciaAction, cambiarEstadoAction } from "./actions";

export const dynamic = "force-dynamic";

const SIGUIENTE: Record<string, string[]> = {
  REPORTADA: ["EN_EVALUACION", "ASIGNADA"],
  EN_EVALUACION: ["ASIGNADA", "CERRADA"],
  ASIGNADA: ["EN_EJECUCION"],
  EN_EJECUCION: ["RESUELTA"],
  RESUELTA: ["CERRADA"],
  CERRADA: [],
};

export default async function IncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [incidencias, unidades] = await Promise.all([
    prisma.incidencia.findMany({
      orderBy: { createdAt: "desc" },
      include: { unidad: { select: { codigo: true } } },
      take: 100,
    }),
    prisma.unidad.findMany({
      where: { activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Incidencias"
        subtitle="Reportes de mantenimiento y su seguimiento"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Operación realizada.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Reportar incidencia
        </h2>
        <form action={crearIncidenciaAction} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="titulo">
              Título
            </label>
            <input id="titulo" name="titulo" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="unidadId">
              Unidad (opcional)
            </label>
            <select id="unidadId" name="unidadId" className={inputClass}>
              <option value="">Área común / general</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
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
          <div>
            <label className={labelClass} htmlFor="prioridad">
              Prioridad
            </label>
            <select id="prioridad" name="prioridad" className={inputClass}>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <div className="md:col-span-2">
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
          <div>
            <button type="submit" className={buttonClass()}>
              Reportar
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3">Prioridad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        }
      >
        {incidencias.map((i) => (
          <tr key={i.id}>
            <td className="px-4 py-3 font-medium">{i.codigo}</td>
            <td className="px-4 py-3">{i.titulo}</td>
            <td className="px-4 py-3 text-slate-500">
              {i.unidad?.codigo ?? "General"}
            </td>
            <td className="px-4 py-3 text-slate-500">{i.categoria}</td>
            <td className="px-4 py-3">
              <Badge>{i.prioridad}</Badge>
            </td>
            <td className="px-4 py-3">
              <Badge>{i.estado}</Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {(SIGUIENTE[i.estado] ?? []).map((next) => (
                  <form key={next} action={cambiarEstadoAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="estado" value={next} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      → {next.replace("_", " ").toLowerCase()}
                    </button>
                  </form>
                ))}
              </div>
            </td>
          </tr>
        ))}
        {incidencias.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              No hay incidencias reportadas.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
