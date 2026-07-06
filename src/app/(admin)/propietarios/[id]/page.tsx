import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  LinkButton,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import {
  asignarUnidadAction,
  finalizarTitularidadAction,
  actualizarTitularidadAction,
  cambiarEstadoPropietario,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function PropietarioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const propietario = await prisma.propietario.findUnique({
    where: { id },
    include: {
      titularidades: {
        include: { unidad: { select: { id: true, codigo: true, tipo: true } } },
        orderBy: { fechaInicio: "desc" },
      },
      usuarios: { select: { email: true, estado: true } },
    },
  });
  if (!propietario) notFound();

  const activas = propietario.titularidades.filter((t) => !t.fechaFin);
  const historicas = propietario.titularidades.filter((t) => t.fechaFin);
  const unidadesActivasIds = new Set(activas.map((t) => t.unidad.id));

  const unidadesDisponibles = await prisma.unidad.findMany({
    where: { activo: true, id: { notIn: [...unidadesActivasIds] } },
    orderBy: { codigo: "asc" },
    select: { id: true, codigo: true },
  });

  const ce = propietario.contactoEmergencia as
    | { nombre?: string | null; telefono?: string | null }
    | null;

  return (
    <>
      <PageHeader
        title={propietario.nombre}
        subtitle={
          propietario.numeroDocumento
            ? `${propietario.tipoDocumento ?? ""} ${propietario.numeroDocumento}`
            : "Sin documento registrado"
        }
        action={
          <div className="flex gap-2">
            <LinkButton href={`/propietarios/${id}/editar`} variant="ghost">
              Editar
            </LinkButton>
            <LinkButton href="/propietarios" variant="ghost">
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
            <h2 className="text-lg font-semibold text-slate-900">Datos de contacto</h2>
            <Badge>{propietario.activo ? "ACTIVO" : "INACTIVO"}</Badge>
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-400">Correo principal</dt>
              <dd>{propietario.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Correo secundario</dt>
              <dd>{propietario.emailSecundario ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Teléfono principal</dt>
              <dd>{propietario.telefono ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Teléfono secundario</dt>
              <dd>{propietario.telefonoSecundario ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Canal preferido</dt>
              <dd>
                <Badge>{propietario.canalEnvio}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Dirección habitual</dt>
              <dd>{propietario.direccionHabitual ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Contacto de emergencia</dt>
              <dd>
                {ce?.nombre
                  ? `${ce.nombre}${ce.telefono ? " · " + ce.telefono : ""}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Acceso al portal</dt>
              <dd>{propietario.usuarios[0]?.email ?? "Sin invitar"}</dd>
            </div>
          </dl>

          <form action={cambiarEstadoPropietario} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="activo" value={(!propietario.activo).toString()} />
            <button
              type="submit"
              className={buttonClass(propietario.activo ? "danger" : "primary")}
            >
              {propietario.activo ? "Inactivar propietario" : "Reactivar propietario"}
            </button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Unidades vigentes</h2>
            <Table
              head={
                <tr>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3">Desde</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              }
            >
              {activas.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.unidad.codigo}</td>
                  <td className="px-4 py-3">
                    <Badge>{t.unidad.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <form action={actualizarTitularidadAction} className="flex items-center gap-2">
                      <input type="hidden" name="titularidadId" value={t.id} />
                      <input type="hidden" name="propietarioId" value={id} />
                      <input type="hidden" name="porcentaje" value={t.porcentaje.toString()} />
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          name="esResponsablePago"
                          defaultChecked={t.esResponsablePago}
                        />
                        Responsable
                      </label>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
                      >
                        Guardar
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">{t.porcentaje.toString()}%</td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.fechaInicio.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={finalizarTitularidadAction}>
                      <input type="hidden" name="titularidadId" value={t.id} />
                      <input type="hidden" name="propietarioId" value={id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Finalizar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {activas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Sin unidades vigentes.
                  </td>
                </tr>
              )}
            </Table>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Asignar a otra unidad
            </h2>
            <form action={asignarUnidadAction} className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="propietarioId" value={id} />
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="unidadId">
                  Unidad
                </label>
                <select id="unidadId" name="unidadId" required className={inputClass}>
                  <option value="">Selecciona…</option>
                  {unidadesDisponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="porcentaje">
                  Porcentaje
                </label>
                <input
                  id="porcentaje"
                  name="porcentaje"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="100"
                  className={inputClass}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" name="esResponsablePago" defaultChecked />
                  Responsable de pago
                </label>
              </div>
              <div className="sm:col-span-4">
                <button type="submit" className={buttonClass()}>
                  Asignar unidad
                </button>
              </div>
            </form>
          </Card>

          {historicas.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Historial de titularidad
              </h2>
              <Table
                head={
                  <tr>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Desde</th>
                    <th className="px-4 py-3">Hasta</th>
                  </tr>
                }
              >
                {historicas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.unidad.codigo}</td>
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
