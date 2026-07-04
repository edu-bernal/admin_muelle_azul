import { prisma } from "@/lib/prisma";
import { PageHeader, Table, LinkButton, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { razonSocial: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Proveedores"
        subtitle={`${proveedores.length} proveedores`}
        action={<LinkButton href="/proveedores/nuevo">+ Nuevo proveedor</LinkButton>}
      />
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Razón social</th>
            <th className="px-4 py-3">RUC</th>
            <th className="px-4 py-3">Rubro</th>
            <th className="px-4 py-3">Contacto</th>
          </tr>
        }
      >
        {proveedores.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium">{p.razonSocial}</td>
            <td className="px-4 py-3 text-slate-500">{p.ruc ?? "—"}</td>
            <td className="px-4 py-3">{p.rubro ?? "—"}</td>
            <td className="px-4 py-3 text-slate-500">
              {p.contactoNombre ?? p.contactoTelefono ?? "—"}
            </td>
          </tr>
        ))}
        {proveedores.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              Aún no hay proveedores.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
