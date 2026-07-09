import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  LinkButton,
  buttonClass,
} from "@/components/ui";
import { cambiarEstadoUnidad } from "../actions";

export const dynamic = "force-dynamic";

const BASE_CALCULO_LABEL: Record<string, string> = {
  ALICUOTA: "Por alícuota",
  FIJO: "Monto fijo",
  M2: "Por m²",
};

export default async function UnidadDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const unidad = await prisma.unidad.findUnique({
    where: { id },
    include: {
      sector: true,
      unidadPrincipal: { select: { id: true, codigo: true } },
      unidadesVinculadas: { select: { id: true, codigo: true } },
      titularidades: {
        include: { propietario: { select: { id: true, nombre: true } } },
        orderBy: { fechaInicio: "desc" },
      },
      cargos: {
        where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
        include: { conceptoCobro: true },
        orderBy: { fechaVencimiento: "asc" },
        take: 10,
      },
    },
  });
  if (!unidad) notFound();

  const activas = unidad.titularidades.filter((t) => !t.fechaFin);
  const historicas = unidad.titularidades.filter((t) => t.fechaFin);

  return (
    <>
      <PageHeader
        title={unidad.codigo}
        subtitle={`${unidad.sector.nombre} · Manzana ${unidad.manzana} · Lote ${unidad.lote}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/unidades/${id}/editar`} variant="ghost">
              Editar
            </LinkButton>
            <LinkButton href="/unidades" variant="ghost">
              ← Volver
            </LinkButton>
          </div>
        }
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Operación realizada.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Datos de la unidad</h2>
            <Badge>{unidad.activo ? "ACTIVA" : "INACTIVA"}</Badge>
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-400">Sector</dt>
              <dd>{unidad.sector.nombre}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Manzana / Lote</dt>
              <dd>
                {unidad.manzana} / {unidad.lote}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Tipo</dt>
              <dd>
                <Badge>{unidad.tipo}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Estado de ocupación</dt>
              <dd>
                <Badge>{unidad.estadoOcupacion}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Área</dt>
              <dd>{unidad.areaM2 ? `${unidad.areaM2.toString()} m²` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Alícuota</dt>
              <dd>{unidad.alicuota ? `${unidad.alicuota.toString()}%` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Base de cálculo de cuota</dt>
              <dd>
                {unidad.baseCalculoCuota
                  ? BASE_CALCULO_LABEL[unidad.baseCalculoCuota]
                  : "Usa la global"}
              </dd>
            </div>
            {unidad.montoFijoCuota && (
              <div>
                <dt className="text-slate-400">Monto fijo de cuota</dt>
                <dd>{formatPEN(unidad.montoFijoCuota)}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Unidad principal</dt>
              <dd>
                {unidad.unidadPrincipal ? (
                  <Link
                    href={`/unidades/${unidad.unidadPrincipal.id}`}
                    className="text-brand hover:underline"
                  >
                    {unidad.unidadPrincipal.codigo}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {unidad.unidadesVinculadas.length > 0 && (
              <div>
                <dt className="text-slate-400">Unidades vinculadas</dt>
                <dd className="space-x-2">
                  {unidad.unidadesVinculadas.map((u) => (
                    <Link
                      key={u.id}
                      href={`/unidades/${u.id}`}
                      className="text-brand hover:underline"
                    >
                      {u.codigo}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <form action={cambiarEstadoUnidad} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="activo" value={(!unidad.activo).toString()} />
            <button
              type="submit"
              className={buttonClass(unidad.activo ? "danger" : "primary")}
            >
              {unidad.activo ? "Inactivar unidad" : "Reactivar unidad"}
            </button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Propietarios</h2>
            <Table
              head={
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3">Desde</th>
                </tr>
              }
            >
              {activas.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/propietarios/${t.propietario.id}`}
                      className="text-brand hover:underline"
                    >
                      {t.propietario.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {t.esResponsablePago ? (
                      <Badge>Responsable de pago</Badge>
                    ) : (
                      <span className="text-slate-500">Copropietario</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{t.porcentaje.toString()}%</td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.fechaInicio.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
              {activas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin propietario asignado.
                  </td>
                </tr>
              )}
            </Table>
            <p className="mt-2 text-xs text-slate-400">
              Para asignar un propietario, entra a su ficha y usa &quot;Asignar a otra
              unidad&quot;.
            </p>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Cargos pendientes
            </h2>
            <Table
              head={
                <tr>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              }
            >
              {unidad.cargos.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{c.descripcion}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.fechaVencimiento.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatPEN(c.monto)}</td>
                  <td className="px-4 py-3">
                    <Badge>{c.estado}</Badge>
                  </td>
                </tr>
              ))}
              {unidad.cargos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin cargos pendientes.
                  </td>
                </tr>
              )}
            </Table>
          </Card>

          {historicas.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Historial de titularidad
              </h2>
              <Table
                head={
                  <tr>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Desde</th>
                    <th className="px-4 py-3">Hasta</th>
                  </tr>
                }
              >
                {historicas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.propietario.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {t.fechaInicio.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {t.fechaFin?.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
