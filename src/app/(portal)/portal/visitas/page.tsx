import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import {
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { preautorizarAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalVisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const unidadIds = user.propietarioId
    ? await unidadIdsDePropietario(user.propietarioId)
    : [];

  const visitas = await prisma.visita.findMany({
    where: { unidadId: { in: unidadIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Mis visitas</h1>

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Visita pre-autorizada. La garita podrá validar su ingreso.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Pre-autorizar una visita
        </h2>
        <form action={preautorizarAction} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre
            </label>
            <input id="nombre" name="nombre" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="documento">
              Documento
            </label>
            <input id="documento" name="documento" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="placa">
              Placa (opcional)
            </label>
            <input id="placa" name="placa" className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className={buttonClass()}>
              Pre-autorizar
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Placa</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {visitas.map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3 font-medium">{v.nombre}</td>
            <td className="px-4 py-3 text-slate-500">{v.documento ?? "—"}</td>
            <td className="px-4 py-3 text-slate-500">{v.placa ?? "—"}</td>
            <td className="px-4 py-3">
              <Badge>
                {v.salidaAt ? "Finalizada" : v.ingresoAt ? "Dentro" : "Pre-autorizada"}
              </Badge>
            </td>
          </tr>
        ))}
        {visitas.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              No has pre-autorizado visitas.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
