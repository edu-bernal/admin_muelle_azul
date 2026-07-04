import { previsualizarEmision } from "@/modules/finanzas/emision.service";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { confirmarEmisionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmisionPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    venc?: string;
    ok?: string;
    total?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const tienePreview =
    sp.periodo && /^\d{4}-\d{2}$/.test(sp.periodo) && sp.venc;

  let preview = null;
  let previewError: string | null = null;
  if (tienePreview) {
    try {
      preview = await previsualizarEmision({
        conceptoCodigo: "MANT",
        periodo: new Date(`${sp.periodo}-01T00:00:00Z`),
        fechaVencimiento: new Date(`${sp.venc}T00:00:00Z`),
      });
    } catch (e) {
      previewError = e instanceof Error ? e.message : "Error";
    }
  }

  return (
    <>
      <PageHeader
        title="Emisión de cuotas"
        subtitle="Genera las cuotas de mantenimiento del período para todas las unidades activas"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Emisión confirmada: {sp.ok} cargos por un total de{" "}
          {formatPEN(sp.total ?? 0)}.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelClass} htmlFor="periodo">
              Período (mes)
            </label>
            <input
              id="periodo"
              name="periodo"
              type="month"
              required
              defaultValue={sp.periodo}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="venc">
              Fecha de vencimiento
            </label>
            <input
              id="venc"
              name="venc"
              type="date"
              required
              defaultValue={sp.venc}
              className={inputClass}
            />
          </div>
          <button type="submit" className={buttonClass("ghost")}>
            Previsualizar
          </button>
        </form>
      </Card>

      {previewError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {previewError}
        </div>
      )}

      {preview && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm text-slate-500">
                {preview.concepto} · {sp.periodo}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {preview.cantidadUnidades} unidades · {formatPEN(preview.total)}
              </p>
              {preview.yaEmitida && (
                <p className="mt-1 text-sm text-amber-600">
                  ⚠ Ya existe una emisión para este período. Anúlala antes de
                  re-emitir.
                </p>
              )}
            </div>
            {!preview.yaEmitida && (
              <form action={confirmarEmisionAction}>
                <input type="hidden" name="periodo" value={sp.periodo} />
                <input type="hidden" name="venc" value={sp.venc} />
                <input type="hidden" name="concepto" value="MANT" />
                <button type="submit" className={buttonClass()}>
                  Confirmar emisión
                </button>
              </form>
            )}
          </div>

          <Table
            head={
              <tr>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            }
          >
            {preview.detalle.slice(0, 100).map((d) => (
              <tr key={d.unidadCodigo}>
                <td className="px-4 py-3 font-medium">{d.unidadCodigo}</td>
                <td className="px-4 py-3 text-right">{formatPEN(d.monto)}</td>
              </tr>
            ))}
          </Table>
          {preview.detalle.length > 100 && (
            <p className="mt-2 text-xs text-slate-400">
              Mostrando 100 de {preview.detalle.length} unidades.
            </p>
          )}
        </>
      )}
    </>
  );
}
