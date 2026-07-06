import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, LinkButton, Badge, inputClass, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PropietariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const soloInactivos = sp.estado === "inactivos";

  const propietarios = await prisma.propietario.findMany({
    where: {
      activo: !soloInactivos,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { nombre: "asc" },
    take: 200,
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
        subtitle={`${propietarios.length}${propietarios.length === 200 ? "+" : ""} propietarios ${soloInactivos ? "inactivos" : "activos"}`}
        action={
          <LinkButton href="/propietarios/nuevo">+ Nuevo propietario</LinkButton>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre…"
            className={inputClass}
          />
        </div>
        <select name="estado" defaultValue={sp.estado ?? "activos"} className={`${inputClass} max-w-40`}>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        <button type="submit" className={buttonClass("ghost")}>
          Buscar
        </button>
      </form>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Unidades</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {propietarios.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium">
              <Link href={`/propietarios/${p.id}`} className="text-brand hover:underline">
                {p.nombre}
              </Link>
            </td>
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
            <td className="px-4 py-3">
              <Badge>{p.activo ? "ACTIVO" : "INACTIVO"}</Badge>
            </td>
          </tr>
        ))}
        {propietarios.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              Sin resultados. {q && "Prueba con otro nombre."}
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
