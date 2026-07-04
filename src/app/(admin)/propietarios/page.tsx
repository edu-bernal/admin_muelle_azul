import { prisma } from "@/lib/prisma";
import { PageHeader, Table, LinkButton, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PropietariosPage() {
  const propietarios = await prisma.propietario.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      titularidades: {
        where: { fechaFin: null },
        include: { unidad: { select: { codigo: true } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Propietarios"
        subtitle={`${propietarios.length} propietarios registrados`}
        action={
          <LinkButton href="/propietarios/nuevo">+ Nuevo propietario</LinkButton>
        }
      />

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Unidades</th>
            <th className="px-4 py-3">Canal</th>
          </tr>
        }
      >
        {propietarios.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium">{p.nombre}</td>
            <td className="px-4 py-3 text-slate-500">
              {p.numeroDocumento
                ? `${p.tipoDocumento ?? ""} ${p.numeroDocumento}`
                : "—"}
            </td>
            <td className="px-4 py-3 text-slate-500">
              {p.email ?? p.telefono ?? "—"}
            </td>
            <td className="px-4 py-3">
              {p.titularidades.map((t) => t.unidad.codigo).join(", ") || "—"}
            </td>
            <td className="px-4 py-3">
              <Badge>{p.canalEnvio}</Badge>
            </td>
          </tr>
        ))}
        {propietarios.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
              Aún no hay propietarios. Crea el primero.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
