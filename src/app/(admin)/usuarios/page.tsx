import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { PropietarioCombobox } from "@/components/propietario-combobox";
import {
  crearAccesoAction,
  regenerarInvitacionAction,
  alternarAccesoAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; invitado?: string }>;
}) {
  await requirePermission("usuarios.gestionar");
  const sp = await searchParams;

  const [usuarios, roles, propietariosRaw, sinAcceso] = await Promise.all([
    prisma.usuario.findMany({
      include: {
        rol: { select: { codigo: true, nombre: true } },
        propietario: { select: { id: true, nombre: true } },
      },
      orderBy: [{ estado: "asc" }, { nombreCompleto: "asc" }],
    }),
    prisma.rol.findMany({ orderBy: { nombre: "asc" } }),
    prisma.propietario.findMany({
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
    }),
    prisma.propietario.count({
      where: { activo: true, usuarios: { none: {} } },
    }),
  ]);

  const propietarios = propietariosRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    unidades: p.titularidades.map((t) => t.unidad.codigo),
  }));

  // Tras crear o regenerar una invitación se muestra el enlace una sola vez,
  // para que el administrador lo haga llegar por su cuenta.
  const invitado = sp.invitado
    ? usuarios.find((u) => u.id === sp.invitado)
    : undefined;

  return (
    <>
      <PageHeader
        title="Usuarios y accesos"
        subtitle={`${usuarios.length} con acceso al sistema · ${sinAcceso} propietarios sin cuenta`}
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ {sp.ok}
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      {invitado?.activationToken && (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 p-5">
          <h2 className="mb-1 font-semibold text-slate-900">
            Enlace de invitación para {invitado.nombreCompleto}
          </h2>
          <p className="mb-3 text-sm text-slate-600">
            Envíaselo por WhatsApp o correo. Con él establecerá su propia
            contraseña; nadie más llega a conocerla. Caduca el{" "}
            {invitado.activationExpires?.toISOString().slice(0, 10)}.
          </p>
          <code className="block overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            /activar/{invitado.activationToken}
          </code>
          <p className="mt-2 text-xs text-slate-500">
            Antepón la dirección del sitio. Este enlace no se vuelve a mostrar:
            si se pierde, genera uno nuevo desde la tabla.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <Table
            head={
              <tr>
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Propietario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último ingreso</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            }
          >
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.nombreCompleto}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge>{u.rol.codigo}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {u.propietario?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge>{u.estado}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500 tabular-nums">
                  {u.ultimoAcceso
                    ? u.ultimoAcceso.toISOString().slice(0, 10)
                    : "Nunca"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={regenerarInvitacionAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        title="Genera un enlace nuevo y anula la contraseña actual"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Nueva invitación
                      </button>
                    </form>
                    <form action={alternarAccesoAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {u.estado === "SUSPENDIDO" ? "Reactivar" : "Suspender"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 max-w-3xl text-xs text-slate-400">
            Un acceso nunca se borra: se suspende, para conservar el rastro de
            quién hizo qué. &quot;Nueva invitación&quot; anula la contraseña
            actual y obliga a establecer otra — sirve cuando alguien la olvida.
          </p>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Dar acceso</h2>
          <form action={crearAccesoAction} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="nombreCompleto">
                Nombre
              </label>
              <input
                id="nombreCompleto"
                name="nombreCompleto"
                required
                placeholder="Nombre y apellidos"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="persona@correo.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rolId">
                Rol
              </label>
              <select id="rolId" name="rolId" required className={inputClass}>
                <option value="">Selecciona…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <PropietarioCombobox
              propietarios={propietarios}
              label="Propietario vinculado"
              required={false}
            />
            <p className="text-xs text-slate-400">
              Obligatorio para los roles Propietario e Inquilino: es lo que
              determina qué estado de cuenta y qué recibos verá. Déjalo vacío
              para personal de la administración.
            </p>

            <button type="submit" className={buttonClass()}>
              Crear acceso
            </button>
            <p className="text-xs text-slate-400">
              Se genera un enlace de invitación. La contraseña la establece la
              propia persona.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
