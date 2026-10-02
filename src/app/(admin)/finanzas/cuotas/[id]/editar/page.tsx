import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatPEN } from "@/lib/money";
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
import { editarCuotaAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarCuotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; volver?: string }>;
}) {
  await requirePermission("finanzas.emitir");
  const { id } = await params;
  const sp = await searchParams;
  const volver =
    sp.volver && sp.volver.startsWith("/") && !sp.volver.startsWith("//")
      ? sp.volver
      : "/finanzas/estados-cuenta";

  const cuota = await prisma.cargo.findUnique({
    where: { id },
    include: {
      unidad: { select: { id: true, codigo: true } },
      conceptoCobro: { select: { id: true, nombre: true } },
      aplicaciones: {
        include: {
          pago: {
            select: {
              fechaPago: true,
              medio: true,
              propietario: { select: { nombre: true } },
              recibo: { select: { numero: true } },
            },
          },
        },
      },
    },
  });
  if (!cuota) notFound();

  // Los conceptos activos, más el actual aunque se haya desactivado.
  const conceptos = await prisma.conceptoCobro.findMany({
    where: { OR: [{ activo: true }, { id: cuota.conceptoCobroId }] },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  const aplicaciones = [...cuota.aplicaciones].sort(
    (a, b) => a.pago.fechaPago.getTime() - b.pago.fechaPago.getTime(),
  );
  const pagado = aplicaciones.reduce((acc, a) => acc + Number(a.montoAplicado), 0);
  const anulada = cuota.estado === "ANULADO";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar cuota"
        subtitle={`${cuota.unidad.codigo} · ${cuota.descripcion} · vence ${cuota.fechaVencimiento
          .toISOString()
          .slice(0, 10)}`}
      />

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge>{cuota.estado}</Badge>
          <span className="text-slate-500">
            Monto {formatPEN(cuota.monto)} · pagado {formatPEN(pagado)} · saldo{" "}
            {formatPEN(Math.max(Number(cuota.monto) - pagado, 0))}
          </span>
        </div>

        {sp.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p>
        )}

        {anulada ? (
          <p className="text-sm text-slate-500">Una cuota anulada no se puede editar.</p>
        ) : (
          <form action={editarCuotaAction} className="space-y-4">
            <input type="hidden" name="cargoId" value={cuota.id} />
            <input type="hidden" name="volver" value={volver} />

            <div>
              <label className={labelClass} htmlFor="conceptoCobroId">
                Concepto
              </label>
              <select
                id="conceptoCobroId"
                name="conceptoCobroId"
                defaultValue={cuota.conceptoCobroId}
                className={inputClass}
              >
                {conceptos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="descripcion">
                Descripción
              </label>
              <input
                id="descripcion"
                name="descripcion"
                defaultValue={cuota.descripcion}
                placeholder="Si se deja vacía, se usa el nombre del concepto"
                className={inputClass}
              />
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
                defaultValue={cuota.monto.toString()}
                className={inputClass}
              />
              {pagado > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Ya tiene {formatPEN(pagado)} pagados. Si el nuevo monto es menor,
                  la diferencia se quita de los pagos más recientes y pasa a saldo
                  a favor de quien pagó.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className={buttonClass()}>
                Guardar cambios
              </button>
              <LinkButton href={volver} variant="ghost">
                Cancelar
              </LinkButton>
            </div>
          </form>
        )}
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Pagos aplicados a esta cuota ({aplicaciones.length})
      </h2>
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Pagó</th>
            <th className="px-4 py-3">Medio</th>
            <th className="px-4 py-3">Recibo</th>
            <th className="px-4 py-3 text-right">Aplicado</th>
          </tr>
        }
      >
        {aplicaciones.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3 tabular-nums">
              {a.pago.fechaPago.toISOString().slice(0, 10)}
            </td>
            <td className="px-4 py-3">{a.pago.propietario.nombre}</td>
            <td className="px-4 py-3 text-slate-500">{a.pago.medio}</td>
            <td className="px-4 py-3 tabular-nums text-slate-500">
              {a.pago.recibo ? `N° ${a.pago.recibo.numero}` : "—"}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatPEN(a.montoAplicado)}
            </td>
          </tr>
        ))}
        {aplicaciones.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
              Aún no tiene pagos aplicados.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
