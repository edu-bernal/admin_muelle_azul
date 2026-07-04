import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { generarPlanillaAction, pagarPlanillaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlanillasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [trabajadores, planillas] = await Promise.all([
    prisma.trabajador.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.planilla.findMany({
      orderBy: { periodo: "desc" },
      include: {
        detalles: { include: { trabajador: { select: { nombre: true, puesto: true } } } },
      },
      take: 12,
    }),
  ]);

  const costoMensual = trabajadores.reduce((acc, t) => acc + Number(t.sueldoBase), 0);

  return (
    <>
      <PageHeader
        title="Planillas de personal"
        subtitle="Personal administrativo y de mantenimiento"
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Personal activo</p>
          <p className="mt-1 text-2xl font-semibold">{trabajadores.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Costo base mensual</p>
          <p className="mt-1 text-2xl font-semibold">{formatPEN(costoMensual)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Planillas generadas</p>
          <p className="mt-1 text-2xl font-semibold">{planillas.length}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Generar planilla</h2>
        <p className="mb-4 text-sm text-slate-500">
          Crea la planilla del período con el personal activo, aplicando el descuento de
          pensión (13%) y los adelantos pendientes.
        </p>
        <form action={generarPlanillaAction} className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelClass} htmlFor="periodo">
              Período
            </label>
            <input id="periodo" name="periodo" type="month" required className={inputClass} />
          </div>
          <button type="submit" className={buttonClass()}>
            Generar planilla
          </button>
        </form>
      </Card>

      {planillas.map((pl) => (
        <div key={pl.id} className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Planilla {pl.periodo.toISOString().slice(0, 7)}{" "}
              <span className="ml-2 align-middle">
                <Badge>{pl.estado}</Badge>
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                Neto total: <strong>{formatPEN(pl.totalNeto)}</strong>
              </span>
              {pl.estado !== "PAGADA" && (
                <form action={pagarPlanillaAction}>
                  <input type="hidden" name="id" value={pl.id} />
                  <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                    Marcar pagada
                  </button>
                </form>
              )}
            </div>
          </div>
          <Table
            head={
              <tr>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3 text-right">Sueldo</th>
                <th className="px-4 py-3 text-right">Descuentos</th>
                <th className="px-4 py-3 text-right">Adelantos</th>
                <th className="px-4 py-3 text-right">Neto</th>
              </tr>
            }
          >
            {pl.detalles.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">{d.trabajador.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{d.trabajador.puesto}</td>
                <td className="px-4 py-3 text-right">{formatPEN(d.sueldoBase)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{formatPEN(d.descuentos)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{formatPEN(d.adelantosDescontados)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatPEN(d.netoPagar)}</td>
              </tr>
            ))}
          </Table>
        </div>
      ))}

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Personal</h2>
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Puesto</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3 text-right">Sueldo base</th>
          </tr>
        }
      >
        {trabajadores.map((t) => (
          <tr key={t.id}>
            <td className="px-4 py-3 font-medium">{t.nombre}</td>
            <td className="px-4 py-3">{t.puesto}</td>
            <td className="px-4 py-3">
              <Badge>{t.tipo}</Badge>
            </td>
            <td className="px-4 py-3 text-right">{formatPEN(t.sueldoBase)}</td>
          </tr>
        ))}
        {trabajadores.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              No hay personal registrado.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
