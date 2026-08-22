import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, LinkButton, inputClass, buttonClass } from "@/components/ui";
import { Paginacion, paginaActual } from "@/components/paginacion";

export const dynamic = "force-dynamic";

const POR_PAGINA = 100;

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sectorId?: string;
    manzana?: string;
    lote?: string;
    estado?: string;
    pagina?: string;
  }>;
}) {
  const sp = await searchParams;
  const manzana = (sp.manzana ?? "").trim();
  const lote = (sp.lote ?? "").trim();
  const soloInactivas = sp.estado === "inactivas";
  const pagina = paginaActual(sp.pagina);

  const sectores = await prisma.sector.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  const where = {
    activo: !soloInactivas,
    ...(sp.sectorId ? { sectorId: sp.sectorId } : {}),
    ...(manzana
      ? { manzana: { equals: manzana, mode: "insensitive" as const } }
      : {}),
    ...(lote ? { lote: { equals: lote, mode: "insensitive" as const } } : {}),
  };

  const [unidades, total] = await Promise.all([
    prisma.unidad.findMany({
      where,
      orderBy: [{ sector: { nombre: "asc" } }, { manzana: "asc" }, { lote: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
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
    }),
    prisma.unidad.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Propiedades"
        subtitle={`${total} unidades ${soloInactivas ? "inactivas" : "activas"}`}
        action={<LinkButton href="/unidades/nueva">+ Nueva unidad</LinkButton>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <select name="sectorId" defaultValue={sp.sectorId ?? ""} className={`${inputClass} max-w-56`}>
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            name="manzana"
            defaultValue={manzana}
            placeholder="Manzana"
            className={`${inputClass} max-w-32`}
          />
        </div>
        <div>
          <input
            name="lote"
            defaultValue={lote}
            placeholder="Lote"
            className={`${inputClass} max-w-32`}
          />
        </div>
        <select name="estado" defaultValue={sp.estado ?? "activas"} className={`${inputClass} max-w-40`}>
          <option value="activas">Activas</option>
          <option value="inactivas">Inactivas</option>
        </select>
        <button type="submit" className={buttonClass("ghost")}>
          Buscar
        </button>
      </form>

      <Table
        head={
          <tr>
            <th className="w-12 px-4 py-3 text-right">#</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Manzana</th>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Responsable de pago</th>
            <th className="px-4 py-3 text-center">Cargos pendientes</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {unidades.map((u, i) => {
          const resp =
            u.titularidades.find((t) => t.esResponsablePago) ?? u.titularidades[0];
          return (
            <tr key={u.id}>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                {(pagina - 1) * POR_PAGINA + i + 1}
              </td>
              <td className="px-4 py-3 text-slate-500">{u.sector.nombre}</td>
              <td className="px-4 py-3">{u.manzana}</td>
              <td className="px-4 py-3">{u.lote}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/unidades/${u.id}`} className="text-brand hover:underline">
                  {u.codigo}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge>{u.tipo}</Badge>
              </td>
              <td className="px-4 py-3">{resp?.propietario.nombre ?? "—"}</td>
              <td className="px-4 py-3 text-center">{u._count.cargos}</td>
              <td className="px-4 py-3">
                <Badge>{u.activo ? "ACTIVA" : "INACTIVA"}</Badge>
              </td>
            </tr>
          );
        })}
        {unidades.length === 0 && (
          <tr>
            <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
              Sin resultados.
            </td>
          </tr>
        )}
      </Table>

      <Paginacion
        pagina={pagina}
        porPagina={POR_PAGINA}
        total={total}
        base="/unidades"
        params={{
          sectorId: sp.sectorId,
          manzana,
          lote,
          estado: sp.estado,
        }}
      />
    </>
  );
}
