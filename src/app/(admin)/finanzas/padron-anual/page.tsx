import { requirePermission } from "@/lib/auth";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";
import {
  padronAnual,
  aniosConDatos,
  MESES,
} from "@/modules/finanzas/padron-anual.service";

export const dynamic = "force-dynamic";

/** Los ceros se atenúan: la vista debe saltar a los meses con abono. */
function Importe({ valor, negrita = false }: { valor: number; negrita?: boolean }) {
  if (valor === 0) return <span className="text-slate-300">—</span>;
  return (
    <span className={negrita ? "font-semibold" : undefined}>
      {valor.toFixed(2)}
    </span>
  );
}

export default async function PadronAnualPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  await requirePermission("finanzas.reportes");
  const sp = await searchParams;

  const anios = await aniosConDatos();
  const anio = anios.includes(Number(sp.anio))
    ? Number(sp.anio)
    : (anios[0] ?? new Date().getUTCFullYear());
  const datos = await padronAnual(anio);

  const conAbono = datos.filas.filter((f) => f.total > 0).length;
  const cobertura = datos.totalEmitido
    ? (datos.total / datos.totalEmitido) * 100
    : 0;

  return (
    <>
      <PageHeader
        title="Padrón general con abonos"
        subtitle="Lo abonado por cada propiedad, mes a mes, con todas las propiedades del padrón"
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form method="get" className="flex items-end gap-3">
            <div>
              <label className={labelClass} htmlFor="anio">
                Año
              </label>
              <select
                id="anio"
                name="anio"
                defaultValue={String(anio)}
                className={`${inputClass} w-32`}
              >
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonClass("ghost")}>
              Ver
            </button>
          </form>

          <a
            href={`/api/reportes/padron-anual?anio=${anio}`}
            className={buttonClass()}
          >
            ⬇ Descargar Excel
          </a>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Propiedades</p>
            <p className="font-semibold text-slate-900">{datos.filas.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Con algún abono</p>
            <p className="font-semibold text-slate-900">{conAbono}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Cobrado en {anio}</p>
            <p className="font-semibold text-emerald-700">
              {formatPEN(datos.total)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Emitido en {anio}</p>
            <p className="font-semibold text-slate-900">
              {formatPEN(datos.totalEmitido)}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({cobertura.toFixed(1)}% cobrado)
              </span>
            </p>
          </div>
        </div>
      </Card>

      <Table
        head={
          <tr>
            <th className="w-12 px-2 py-3 text-right">#</th>
            <th className="px-2 py-3">Propiedad</th>
            <th className="px-2 py-3">Propietario</th>
            {MESES.map((m) => (
              <th key={m} className="px-2 py-3 text-right">
                {m}
              </th>
            ))}
            <th className="px-2 py-3 text-right">Extra.</th>
            <th className="px-2 py-3 text-right">Total</th>
          </tr>
        }
      >
        {datos.filas.map((f) => (
          <tr key={f.codigo} className={f.total === 0 ? "text-slate-400" : undefined}>
            <td className="px-2 py-2 text-right tabular-nums text-slate-400">
              {f.numero}
            </td>
            <td className="whitespace-nowrap px-2 py-2 font-medium">
              {f.codigo}
              <span className="ml-1 text-xs font-normal text-slate-400">
                {f.tipo}
              </span>
            </td>
            <td className="max-w-64 truncate px-2 py-2" title={f.propietario1}>
              {f.propietario1 || "—"}
            </td>
            {f.meses.map((m, i) => (
              <td key={i} className="px-2 py-2 text-right tabular-nums">
                <Importe valor={m} />
              </td>
            ))}
            <td className="px-2 py-2 text-right tabular-nums">
              <Importe valor={f.extraordinaria} />
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              <Importe valor={f.total} negrita />
            </td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-semibold">
          <td className="px-2 py-3" colSpan={3}>
            Totales
          </td>
          {datos.totalesMes.map((m, i) => (
            <td key={i} className="px-2 py-3 text-right tabular-nums">
              <Importe valor={m} />
            </td>
          ))}
          <td className="px-2 py-3 text-right tabular-nums">
            <Importe valor={datos.totalExtraordinaria} />
          </td>
          <td className="px-2 py-3 text-right tabular-nums">
            <Importe valor={datos.total} negrita />
          </td>
        </tr>
      </Table>

      <p className="mt-3 max-w-4xl text-xs text-slate-400">
        Cada importe es lo aplicado a la cuota de ese mes, no la fecha en que
        entró el dinero: así la fila cuadra con lo que se debía mes a mes. La
        columna Extra. suma los abonos a cuotas extraordinarias del año. Lo
        pagado de más queda como saldo a favor del propietario y no aparece
        aquí, porque no cubre ninguna cuota del año. Las cocheras no se listan:
        no se les emite cuota. El archivo Excel trae además manzana, lote y el
        segundo propietario.
      </p>
    </>
  );
}
