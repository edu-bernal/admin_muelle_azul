import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, LinkButton, Badge, inputClass, buttonClass } from "@/components/ui";
import { Paginacion, paginaActual } from "@/components/paginacion";

export const dynamic = "force-dynamic";

const POR_PAGINA = 100;

export default async function PropietariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const soloInactivos = sp.estado === "inactivos";
  const pagina = paginaActual(sp.pagina);

  const where = {
    activo: !soloInactivos,
    ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [propietarios, total] = await Promise.all([
    prisma.propietario.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        titularidades: {
          where: { fechaFin: null },
          include: { unidad: { select: { codigo: true } } },
        },
      },
    }),
    prisma.propietario.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Propietarios"
        subtitle={`${total} propietarios ${soloInactivos ? "inactivos" : "activos"}`}
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
            <th className="w-12 px-4 py-3 text-right">#</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Unidades</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {propietarios.map((p, i) => (
          <tr key={p.id}>
            <td className="px-4 py-3 text-right tabular-nums text-slate-400">
              {(pagina - 1) * POR_PAGINA + i + 1}
            </td>
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
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              Sin resultados. {q && "Prueba con otro nombre."}
            </td>
          </tr>
        )}
      </Table>

      <Paginacion
        pagina={pagina}
        porPagina={POR_PAGINA}
        total={total}
        base="/propietarios"
        params={{ q, estado: sp.estado }}
      />
    </>
  );
}
