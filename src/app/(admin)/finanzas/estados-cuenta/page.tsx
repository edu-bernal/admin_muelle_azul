import { prisma } from "@/lib/prisma";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import {
  PageHeader,
  Card,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";
import { PropietarioCombobox } from "@/components/propietario-combobox";
import { EstadoCuentaView } from "@/components/estado-cuenta-view";

export const dynamic = "force-dynamic";

export default async function EstadosCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ propietarioId?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  // Por defecto, el año en curso: es el rango que se pide en ventanilla.
  const desde = sp.desde || `${hoy.slice(0, 4)}-01-01`;
  const hasta = sp.hasta || hoy;
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
          <div>
            <label className={labelClass} htmlFor="desde">
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="hasta">
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta}
              className={inputClass}
            />
          </div>
          <button type="submit" className={buttonClass("ghost")}>
            Ver estado
          </button>
        </form>
      </Card>

      {ec && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">
              Estado de cuenta del {desde} al {hasta}
            </span>
            <a
              href={`/api/estados-cuenta/${sp.propietarioId}/pdf?desde=${desde}&hasta=${hasta}`}
              target="_blank"
              rel="noopener"
              className={buttonClass()}
            >
              Descargar PDF
            </a>
          </div>
          <EstadoCuentaView ec={ec} />
        </>
      )}
    </>
  );
}
