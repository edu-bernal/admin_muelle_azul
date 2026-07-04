import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import { PageHeader, Table, Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlanillasPage() {
  const [trabajadores, planillas] = await Promise.all([
    prisma.trabajador.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.planilla.findMany({ orderBy: { periodo: "desc" }, take: 12 }),
  ]);

  const costoMensual = trabajadores.reduce(
    (acc, t) => acc + Number(t.sueldoBase),
    0,
  );

  return (
    <>
      <PageHeader
        title="Planillas de personal"
        subtitle="Personal administrativo y de mantenimiento"
      />

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
              No hay personal registrado todavía.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
