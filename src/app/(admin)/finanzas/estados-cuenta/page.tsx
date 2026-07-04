import { prisma } from "@/lib/prisma";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import {
  PageHeader,
  Card,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { EstadoCuentaView } from "@/components/estado-cuenta-view";

export const dynamic = "force-dynamic";

export default async function EstadosCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ propietarioId?: string }>;
}) {
  const sp = await searchParams;
  const propietarios = await prisma.propietario.findMany({
    where: { activo: true, titularidades: { some: { fechaFin: null } } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

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
            <label className={labelClass} htmlFor="propietarioId">
              Propietario
            </label>
            <select
              id="propietarioId"
              name="propietarioId"
              defaultValue={sp.propietarioId}
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {propietarios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
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
