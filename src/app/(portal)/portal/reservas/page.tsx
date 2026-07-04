import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import {
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { solicitarReservaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const unidadIds = user.propietarioId
    ? await unidadIdsDePropietario(user.propietarioId)
    : [];

  const [areas, reservas] = await Promise.all([
    prisma.areaComun.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.reserva.findMany({
      where: { unidadId: { in: unidadIds } },
      orderBy: { fecha: "desc" },
      include: { area: { select: { nombre: true } } },
      take: 30,
    }),
  ]);

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Reservas de áreas comunes
      </h1>

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Tu reserva fue registrada.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva reserva</h2>
        <form action={solicitarReservaAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="areaId">
              Área
            </label>
            <select id="areaId" name="areaId" required className={inputClass}>
              <option value="">Selecciona…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {Number(a.tarifa) > 0 ? ` — ${formatPEN(a.tarifa)}` : " — sin costo"}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="horaInicio">
                Desde
              </label>
              <input id="horaInicio" name="horaInicio" type="time" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="horaFin">
                Hasta
              </label>
              <input id="horaFin" name="horaFin" type="time" required className={inputClass} />
            </div>
          </div>
          <div>
            <button type="submit" className={buttonClass()}>
              Solicitar reserva
            </button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Mis reservas</h2>
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Área</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        }
      >
        {reservas.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3">{r.fecha.toISOString().slice(0, 10)}</td>
            <td className="px-4 py-3 font-medium">{r.area.nombre}</td>
            <td className="px-4 py-3 text-slate-500">
              {r.horaInicio}–{r.horaFin}
            </td>
            <td className="px-4 py-3">
              <Badge>{r.estado}</Badge>
            </td>
          </tr>
        ))}
        {reservas.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              Aún no tienes reservas.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
