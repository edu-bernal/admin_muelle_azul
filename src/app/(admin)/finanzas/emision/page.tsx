import { prisma } from "@/lib/prisma";
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

const CONCEPTOS_EMISION = ["MANT", "EXTRA"];

export default async function EmisionPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    venc?: string;
    concepto?: string;
    monto?: string;
    descripcion?: string;
    ok?: string;
    total?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const conceptoCodigo = sp.concepto === "EXTRA" ? "EXTRA" : "MANT";
  const esExtraordinaria = conceptoCodigo === "EXTRA";
  const tienePreview =
    sp.periodo && /^\d{4}-\d{2}$/.test(sp.periodo) && sp.venc;

  const conceptos = await prisma.conceptoCobro.findMany({
    where: { codigo: { in: CONCEPTOS_EMISION }, activo: true },
  });

  let preview = null;
  let previewError: string | null = null;
  if (tienePreview) {
    try {
      preview = await previsualizarEmision({
        conceptoCodigo,
        periodo: new Date(`${sp.periodo}-01T00:00:00Z`),
        fechaVencimiento: new Date(`${sp.venc}T00:00:00Z`),
        montoManual: esExtraordinaria && sp.monto ? Number(sp.monto) : undefined,
        descripcion: esExtraordinaria ? sp.descripcion : undefined,
      });
    } catch (e) {
      previewError = e instanceof Error ? e.message : "Error";
    }
  }

  return (
    <>
      <PageHeader
        title="Emisión de cuotas"
        subtitle="Genera cuotas ordinarias (mantenimiento) o extraordinarias para todas las unidades activas"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Emisión confirmada: {sp.ok} cargos por un total de{" "}
          {formatPEN(sp.total ?? 0)}. Se emitirá el recibo correspondiente en
          cuanto se registre el pago de cada cargo.
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
            <label className={labelClass} htmlFor="concepto">
              Tipo de cuota
            </label>
            <select
              id="concepto"
              name="concepto"
              defaultValue={conceptoCodigo}
              className={inputClass}
            >
              <option value="MANT">Ordinaria (mantenimiento)</option>
              <option value="EXTRA">Extraordinaria</option>
            </select>
          </div>
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
          {esExtraordinaria && (
            <>
              <div>
                <label className={labelClass} htmlFor="monto">
                  Monto por unidad (S/)
                </label>
                <input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={sp.monto}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="descripcion">
                  Descripción (ej. Cuota Extraordinaria por Oleaje)
                </label>
                <input
                  id="descripcion"
                  name="descripcion"
                  defaultValue={sp.descripcion}
                  className={inputClass}
                />
              </div>
            </>
          )}
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
                  ⚠ Ya existe una emisión para este concepto y período. Anúlala
                  antes de re-emitir.
                </p>
              )}
            </div>
            {!preview.yaEmitida && (
              <form action={confirmarEmisionAction}>
                <input type="hidden" name="periodo" value={sp.periodo} />
                <input type="hidden" name="venc" value={sp.venc} />
                <input type="hidden" name="concepto" value={conceptoCodigo} />
                {esExtraordinaria && (
                  <>
                    <input type="hidden" name="monto" value={sp.monto} />
                    <input
                      type="hidden"
                      name="descripcion"
                      value={sp.descripcion ?? ""}
                    />
                  </>
                )}
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

      {conceptos.length === 0 && (
        <p className="mt-4 text-xs text-amber-600">
          No se encontraron los conceptos MANT/EXTRA en el catálogo — revisa el
          seed.
        </p>
      )}
    </>
  );
}
