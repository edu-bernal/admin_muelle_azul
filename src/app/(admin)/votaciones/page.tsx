import { prisma } from "@/lib/prisma";
import { resultados } from "@/modules/operacion/votaciones.service";
import {
  PageHeader,
  Card,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { crearVotacionAction, cerrarVotacionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VotacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const votaciones = await prisma.votacion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votos: true } } },
    take: 30,
  });
  const resultadosPorId = new Map(
    await Promise.all(
      votaciones.map(async (v) => [v.id, await resultados(v.id)] as const),
    ),
  );

  return (
    <>
      <PageHeader
        title="Votaciones"
        subtitle="Consultas a los propietarios (asamblea)"
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

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva votación</h2>
          <form action={crearVotacionAction} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="pregunta">
                Pregunta
              </label>
              <input id="pregunta" name="pregunta" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="opciones">
                Opciones (separadas por coma)
              </label>
              <input
                id="opciones"
                name="opciones"
                required
                placeholder="Sí, No, Abstención"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ponderacion">
                Ponderación
              </label>
              <select id="ponderacion" name="ponderacion" className={inputClass}>
                <option value="UNIDAD">1 unidad = 1 voto</option>
                <option value="ALICUOTA">Por alícuota</option>
              </select>
            </div>
            <button type="submit" className={buttonClass()}>
              Abrir votación
            </button>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {votaciones.map((v) => {
            const res = resultadosPorId.get(v.id) ?? [];
            const totalPeso = res.reduce((a, r) => a + r.peso, 0) || 1;
            return (
              <Card key={v.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{v.pregunta}</h3>
                  <Badge>{v.estado}</Badge>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  {v._count.votos} votos · ponderación {v.ponderacion}
                </p>
                <div className="space-y-2">
                  {res.map((r) => (
                    <div key={r.opcion}>
                      <div className="flex justify-between text-sm">
                        <span>{r.opcion}</span>
                        <span className="text-slate-500">
                          {r.votos} ({Math.round((r.peso / totalPeso) * 100)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${(r.peso / totalPeso) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {v.estado === "ABIERTA" && (
                  <form action={cerrarVotacionAction} className="mt-3">
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                    >
                      Cerrar votación
                    </button>
                  </form>
                )}
              </Card>
            );
          })}
          {votaciones.length === 0 && (
            <Card>
              <p className="text-sm text-slate-500">No hay votaciones.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
