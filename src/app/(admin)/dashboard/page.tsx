import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import { reporteMorosidad } from "@/modules/finanzas/morosidad.service";
import { PageHeader, StatCard, Card, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [unidades, propietarios, porValidar, recaudado, morosidad] =
    await Promise.all([
      prisma.unidad.count({ where: { activo: true } }),
      prisma.propietario.count({ where: { activo: true } }),
      prisma.pago.aggregate({
        where: { estado: "POR_VALIDAR" },
        _count: true,
        _sum: { monto: true },
      }),
      prisma.pago.aggregate({
        where: { estado: "CONFIRMADO" },
        _sum: { monto: true },
      }),
      reporteMorosidad(),
    ]);

  const topDeudores = morosidad.filas.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del condominio Muelle Azul"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unidades activas" value={String(unidades)} />
        <StatCard label="Propietarios" value={String(propietarios)} />
        <StatCard
          label="Deuda total"
          value={formatPEN(morosidad.totales.total)}
          tone="danger"
          hint={`${morosidad.filas.length} unidades con saldo`}
        />
        <StatCard
          label="Pagos por validar"
          value={String(porValidar._count)}
          hint={formatPEN(porValidar._sum.monto ?? 0)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Recaudado (histórico confirmado)"
          value={formatPEN(recaudado._sum.monto ?? 0)}
          tone="success"
        />
        <StatCard
          label="Deuda 90+ días"
          value={formatPEN(morosidad.totales.d90mas)}
          tone="danger"
        />
        <StatCard
          label="Deuda corriente / 1-30 d"
          value={formatPEN(morosidad.totales.corriente + morosidad.totales.d1_30)}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Principales deudores
        </h2>
        {topDeudores.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No hay unidades con deuda registrada.
            </p>
          </Card>
        ) : (
          <Table
            head={
              <tr>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3 text-right">90+ días</th>
                <th className="px-4 py-3 text-right">Deuda total</th>
              </tr>
            }
          >
            {topDeudores.map((f) => (
              <tr key={f.unidadCodigo}>
                <td className="px-4 py-3 font-medium">{f.unidadCodigo}</td>
                <td className="px-4 py-3 text-slate-500">{f.sector}</td>
                <td className="px-4 py-3">{f.responsable}</td>
                <td className="px-4 py-3 text-right text-red-600">
                  {formatPEN(f.d90mas)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatPEN(f.total)}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
