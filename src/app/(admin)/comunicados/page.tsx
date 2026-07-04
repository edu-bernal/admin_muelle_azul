import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { crearComunicado } from "./actions";

export const dynamic = "force-dynamic";

export default async function ComunicadosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const comunicados = await prisma.comunicado.findMany({
    orderBy: { publicadoAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="Comunicados"
        subtitle="Publica avisos para los propietarios"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Comunicado publicado.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Nuevo comunicado
          </h2>
          <form action={crearComunicado} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="titulo">
                Título
              </label>
              <input id="titulo" name="titulo" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cuerpo">
                Mensaje
              </label>
              <textarea
                id="cuerpo"
                name="cuerpo"
                required
                rows={5}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="audiencia">
                  Audiencia
                </label>
                <select id="audiencia" name="audiencia" className={inputClass}>
                  <option value="TODOS">Todos</option>
                  <option value="MA_C">MA Central</option>
                  <option value="MA_A">MA Ampliación</option>
                  <option value="MA_O">MA Oeste</option>
                  <option value="MA_N">MA Norte</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="vigenteHasta">
                  Vigente hasta
                </label>
                <input
                  id="vigenteHasta"
                  name="vigenteHasta"
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="requiereConfirmacion" />
              Requiere confirmación de lectura
            </label>
            <button type="submit" className={buttonClass()}>
              Publicar
            </button>
          </form>
        </Card>

        <div className="space-y-3 lg:col-span-3">
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
              <p className="text-sm text-slate-500">Aún no hay comunicados.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
