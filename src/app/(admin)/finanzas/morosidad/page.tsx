import { reporteMorosidad } from "@/modules/finanzas/morosidad.service";
import { formatPEN } from "@/lib/money";
import { PageHeader, Table, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MorosidadPage() {
  const rep = await reporteMorosidad();
  const t = rep.totales;

  return (
    <>
      <PageHeader
        title="Morosidad"
        subtitle={`Deuda por antigüedad al ${rep.corte}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Corriente" value={formatPEN(t.corriente)} />
        <StatCard label="1–30 días" value={formatPEN(t.d1_30)} />
        <StatCard label="31–60 días" value={formatPEN(t.d31_60)} />
        <StatCard label="61–90 días" value={formatPEN(t.d61_90)} />
        <StatCard label="90+ días" value={formatPEN(t.d90mas)} tone="danger" />
      </div>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Responsable</th>
            <th className="px-4 py-3 text-right">1–30</th>
            <th className="px-4 py-3 text-right">31–60</th>
            <th className="px-4 py-3 text-right">61–90</th>
            <th className="px-4 py-3 text-right">90+</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        }
      >
        {rep.filas.map((f) => (
          <tr key={f.unidadCodigo}>
            <td className="px-4 py-3 font-medium">{f.unidadCodigo}</td>
            <td className="px-4 py-3 text-slate-500">{f.sector}</td>
            <td className="px-4 py-3">{f.responsable}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.d1_30)}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.d31_60)}</td>
            <td className="px-4 py-3 text-right">{formatPEN(f.d61_90)}</td>
            <td className="px-4 py-3 text-right text-red-600">
              {formatPEN(f.d90mas)}
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatPEN(f.total)}
            </td>
          </tr>
        ))}
        {rep.filas.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
              No hay deuda registrada. 🎉
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
