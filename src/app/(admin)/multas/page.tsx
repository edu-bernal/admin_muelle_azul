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
import { crearMultaAction, confirmarMultaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MultasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [unidades, infracciones, multas] = await Promise.all([
    prisma.unidad.findMany({
      where: { activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
    prisma.infraccion.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } }),
    prisma.multa.findMany({
      orderBy: { createdAt: "desc" },
      include: { unidad: { select: { codigo: true } } },
      take: 100,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Multas e infracciones"
        subtitle="Al confirmar, la multa se carga al estado de cuenta de la unidad"
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

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Registrar multa</h2>
        <form action={crearMultaAction} className="grid gap-3 md:grid-cols-4">
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
            <label className={labelClass} htmlFor="infraccionId">
              Infracción
            </label>
            <select id="infraccionId" name="infraccionId" className={inputClass}>
              <option value="">Otra</option>
              {infracciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="monto">
              Monto (S/)
            </label>
            <input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              required
              className={inputClass}
            />
          </div>
          <div className="md:col-span-4">
            <label className={labelClass} htmlFor="descripcion">
              Descripción
            </label>
            <input id="descripcion" name="descripcion" required className={inputClass} />
          </div>
          <div>
            <button type="submit" className={buttonClass()}>
              Registrar
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3 text-right">Monto</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        }
      >
        {multas.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3">{m.createdAt.toISOString().slice(0, 10)}</td>
            <td className="px-4 py-3 font-medium">{m.unidad.codigo}</td>
            <td className="px-4 py-3">{m.descripcion}</td>
            <td className="px-4 py-3 text-right">{formatPEN(m.monto)}</td>
            <td className="px-4 py-3">
              <Badge>{m.estado}</Badge>
            </td>
            <td className="px-4 py-3">
              {m.estado === "NOTIFICADA" ? (
                <form action={confirmarMultaAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
                  >
                    Confirmar y cargar
                  </button>
                </form>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </td>
          </tr>
        ))}
        {multas.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
              No hay multas registradas.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
