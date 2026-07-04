import {
  ejecucionPresupuestal,
  simuladorCuota,
} from "@/modules/finanzas/presupuesto.service";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  StatCard,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; gasto?: string }>;
}) {
  const sp = await searchParams;
  const anio = sp.anio ? Number(sp.anio) : new Date().getFullYear();
  const ejec = await ejecucionPresupuestal(anio);
  const gasto = sp.gasto ? Number(sp.gasto) : ejec.totalPresupuestado;
  const sim = await simuladorCuota(gasto || 0);

  return (
    <>
      <PageHeader
        title="Presupuesto anual"
        subtitle={`Ejecución presupuestal ${anio}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Presupuestado" value={formatPEN(ejec.totalPresupuestado)} />
        <StatCard
          label="Ejecutado"
          value={formatPEN(ejec.totalEjecutado)}
          tone="success"
        />
        <StatCard
          label="Saldo"
          value={formatPEN(ejec.totalPresupuestado - ejec.totalEjecutado)}
        />
      </div>

      {!ejec.existe && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay un presupuesto definido para {anio}. El seed incluye uno de ejemplo
          para el año en curso.
        </div>
      )}

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Partida</th>
            <th className="px-4 py-3 text-right">Presupuestado</th>
            <th className="px-4 py-3 text-right">Ejecutado</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3">Avance</th>
          </tr>
        }
      >
        {ejec.filas.map((f) => (
          <tr key={f.partida}>
            <td className="px-4 py-3 font-medium">{f.partida}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.presupuestado)}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.ejecutado)}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.saldo)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${f.porcentaje > 100 ? "bg-red-500" : "bg-brand"}`}
                    style={{ width: `${Math.min(f.porcentaje, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{f.porcentaje}%</span>
              </div>
            </td>
          </tr>
        ))}
        {ejec.filas.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
              Sin partidas presupuestadas.
            </td>
          </tr>
        )}
      </Table>

      <Card className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Simulador de cuota
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Calcula la cuota mensual por unidad para cubrir el gasto anual (reparto
          igualitario entre {sim.unidadesActivas} unidades activas).
        </p>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="anio" value={anio} />
          <div>
            <label className={labelClass} htmlFor="gasto">
              Gasto anual estimado (S/)
            </label>
            <input
              id="gasto"
              name="gasto"
              type="number"
              step="100"
              defaultValue={gasto || ""}
              className={inputClass}
            />
          </div>
          <button type="submit" className={buttonClass("ghost")}>
            Calcular
          </button>
          <div className="rounded-lg bg-brand/10 px-4 py-2">
            <span className="text-sm text-slate-600">Cuota mensual sugerida: </span>
            <span className="text-lg font-semibold text-brand">
              {formatPEN(sim.cuotaMensualSugerida)}
            </span>
          </div>
        </form>
      </Card>
    </>
  );
}
