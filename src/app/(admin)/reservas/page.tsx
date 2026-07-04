import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import {
  crearReservaAction,
  aprobarReservaAction,
  rechazarReservaAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [areas, unidades, reservas] = await Promise.all([
    prisma.areaComun.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.unidad.findMany({
      where: { activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
    prisma.reserva.findMany({
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      include: {
        area: { select: { nombre: true } },
        unidad: { select: { codigo: true } },
      },
      take: 100,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Reservas de áreas comunes"
        subtitle="Piscina, parrillas, salón y más"
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((a) => (
          <Card key={a.id}>
            <p className="font-medium text-slate-900">{a.nombre}</p>
            <p className="text-sm text-slate-500">
              {a.aforo ? `Aforo ${a.aforo} · ` : ""}
              {Number(a.tarifa) > 0 ? formatPEN(a.tarifa) : "Sin costo"}
            </p>
            {a.requiereAprobacion && (
              <p className="mt-1 text-xs text-amber-600">Requiere aprobación</p>
            )}
          </Card>
        ))}
        {areas.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">
              No hay áreas configuradas (se cargan en el seed).
            </p>
          </Card>
        )}
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva reserva</h2>
        <form action={crearReservaAction} className="grid gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="areaId">
              Área
            </label>
            <select id="areaId" name="areaId" required className={inputClass}>
              <option value="">Selecciona…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="unidadId">
              Unidad
            </label>
            <select id="unidadId" name="unidadId" required className={inputClass}>
              <option value="">Selecciona…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="fecha">
              Fecha
            </label>
            <input id="fecha" name="fecha" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="horaInicio">
              Hora inicio
            </label>
            <input id="horaInicio" name="horaInicio" type="time" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="horaFin">
              Hora fin
            </label>
            <input id="horaFin" name="horaFin" type="time" required className={inputClass} />
          </div>
          <div className="flex items-end">
            <button type="submit" className={buttonClass()}>
              Crear reserva
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Área</th>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        }
      >
        {reservas.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3">{r.fecha.toISOString().slice(0, 10)}</td>
            <td className="px-4 py-3 font-medium">{r.area.nombre}</td>
            <td className="px-4 py-3 text-slate-500">{r.unidad.codigo}</td>
            <td className="px-4 py-3 text-slate-500">
              {r.horaInicio}–{r.horaFin}
            </td>
            <td className="px-4 py-3">
              <Badge>{r.estado}</Badge>
            </td>
            <td className="px-4 py-3">
              {r.estado === "SOLICITADA" ? (
                <div className="flex gap-1">
                  <form action={aprobarReservaAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Aprobar
                    </button>
                  </form>
                  <form action={rechazarReservaAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </td>
          </tr>
        ))}
        {reservas.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              No hay reservas.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
