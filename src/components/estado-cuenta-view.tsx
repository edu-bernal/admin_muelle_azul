import { formatPEN } from "@/lib/money";
import type { EstadoCuenta } from "@/modules/finanzas/estado-cuenta.service";
import { Table, Badge, StatCard } from "./ui";

/**
 * Estado de cuenta de un propietario. Lo usan la administración y el portal:
 * con `editarVolver` (solo en la administración) cada cuota lleva un enlace
 * para editarla, que al guardar regresa a esa ruta.
 */
export function EstadoCuentaView({
  ec,
  editarVolver,
}: {
  ec: EstadoCuenta;
  editarVolver?: string;
}) {
  const alDia = ec.saldoNeto <= 0;
  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total cargado" value={formatPEN(ec.totalCargado)} />
        <StatCard
          label="Total pagado"
          value={formatPEN(ec.totalPagado)}
          tone="success"
        />
        <StatCard
          label={alDia ? "Saldo (al día)" : "Saldo por pagar"}
          value={formatPEN(Math.abs(ec.saldoNeto))}
          tone={alDia ? "success" : "danger"}
          hint={
            ec.saldoFavor > 0 ? `Incluye saldo a favor ${formatPEN(ec.saldoFavor)}` : undefined
          }
        />
      </div>

      <p className="mb-2 text-sm text-slate-500">
        {ec.propietarioNombre} · Unidades: {ec.unidades.join(", ") || "—"}
      </p>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3">Vence</th>
            <th className="px-4 py-3 text-right">Monto</th>
            <th className="px-4 py-3 text-right">Pagado</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3">Estado</th>
            {editarVolver && <th className="px-4 py-3">Acción</th>}
          </tr>
        }
      >
        {ec.movimientos.map((m) => (
          <tr key={m.cargoId}>
            <td className="px-4 py-3 font-medium">{m.unidadCodigo}</td>
            <td className="px-4 py-3">{m.descripcion}</td>
            <td className="px-4 py-3 text-slate-500">{m.fechaVencimiento}</td>
            <td className="px-4 py-3 text-right">{formatPEN(m.monto)}</td>
            <td className="px-4 py-3 text-right text-emerald-600">
              {formatPEN(m.aplicado)}
            </td>
            <td className="px-4 py-3 text-right font-medium">
              {formatPEN(m.saldo)}
            </td>
            <td className="px-4 py-3">
              <Badge>{m.estado}</Badge>
            </td>
            {editarVolver && (
              <td className="px-4 py-3">
                <a
                  href={`/finanzas/cuotas/${m.cargoId}/editar?volver=${encodeURIComponent(editarVolver)}`}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Editar
                </a>
              </td>
            )}
          </tr>
        ))}
        {ec.movimientos.length === 0 && (
          <tr>
            <td colSpan={editarVolver ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
              Sin movimientos.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
