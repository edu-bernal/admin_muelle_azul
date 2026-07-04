import { formatPEN } from "@/lib/money";
import type { EstadoCuenta } from "@/modules/finanzas/estado-cuenta.service";
import { Table, Badge, StatCard } from "./ui";

export function EstadoCuentaView({ ec }: { ec: EstadoCuenta }) {
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
          </tr>
        ))}
        {ec.movimientos.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              Sin movimientos.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
