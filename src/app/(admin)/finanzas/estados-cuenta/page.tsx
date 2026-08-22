import { prisma } from "@/lib/prisma";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import { PageHeader, Card, buttonClass } from "@/components/ui";
import { PropietarioCombobox } from "@/components/propietario-combobox";
import { EstadoCuentaView } from "@/components/estado-cuenta-view";

export const dynamic = "force-dynamic";

export default async function EstadosCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ propietarioId?: string }>;
}) {
  const sp = await searchParams;
  const propietariosRaw = await prisma.propietario.findMany({
    where: { activo: true, titularidades: { some: { fechaFin: null } } },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      titularidades: {
        where: { fechaFin: null },
        select: { unidad: { select: { codigo: true } } },
      },
    },
  });

  const propietarios = propietariosRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    unidades: p.titularidades.map((t) => t.unidad.codigo),
  }));

  const ec = sp.propietarioId
    ? await estadoCuentaPropietario(sp.propietarioId).catch(() => null)
    : null;

  return (
    <>
      <PageHeader
        title="Estados de cuenta"
        subtitle="Consulta el estado de cuenta consolidado de un propietario"
      />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="min-w-64 flex-1">
            <PropietarioCombobox
              propietarios={propietarios}
              defaultSelectedId={sp.propietarioId ?? ""}
            />
          </div>
          <button type="submit" className={buttonClass("ghost")}>
            Ver estado
          </button>
        </form>
      </Card>

      {ec && <EstadoCuentaView ec={ec} />}
    </>
  );
}
