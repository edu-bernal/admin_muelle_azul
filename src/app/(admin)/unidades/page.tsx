import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  const unidades = await prisma.unidad.findMany({
    where: { activo: true },
    orderBy: { codigo: "asc" },
    include: {
      sector: true,
      titularidades: {
        where: { fechaFin: null },
        include: { propietario: { select: { nombre: true } } },
      },
      _count: {
        select: { cargos: { where: { estado: { in: ["PENDIENTE", "PARCIAL"] } } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Propiedades"
        subtitle={`${unidades.length} unidades registradas`}
      />

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Responsable de pago</th>
            <th className="px-4 py-3 text-center">Cargos pendientes</th>
          </tr>
        }
      >
        {unidades.map((u) => {
          const resp =
            u.titularidades.find((t) => t.esResponsablePago) ??
            u.titularidades[0];
          return (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium">{u.codigo}</td>
              <td className="px-4 py-3 text-slate-500">{u.sector.nombre}</td>
              <td className="px-4 py-3">
                <Badge>{u.tipo}</Badge>
              </td>
              <td className="px-4 py-3">{resp?.propietario.nombre ?? "—"}</td>
              <td className="px-4 py-3 text-center">{u._count.cargos}</td>
            </tr>
          );
        })}
        {unidades.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
              No hay unidades. Cárgalas con el script de migración (ver docs/05).
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
