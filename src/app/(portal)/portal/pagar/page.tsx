import { requireUser } from "@/lib/auth";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import { formatPEN } from "@/lib/money";
import { Card, inputClass, labelClass, buttonClass } from "@/components/ui";
import { pagarEnLineaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PagarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const ec = user.propietarioId
    ? await estadoCuentaPropietario(user.propietarioId)
    : null;
  const deuda = ec ? Math.max(ec.saldoNeto, 0) : 0;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Pagar en línea</h1>

      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <Card>
        <div className="mb-4 rounded-lg bg-brand/10 px-4 py-3 text-sm text-slate-700">
          Saldo pendiente:{" "}
          <span className="font-semibold text-brand">{formatPEN(deuda)}</span>
        </div>
        <form action={pagarEnLineaAction} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="monto">
              Monto a pagar (S/)
            </label>
            <input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={deuda > 0 ? deuda.toFixed(2) : ""}
              required
              className={inputClass}
            />
          </div>
          <button type="submit" className={`${buttonClass()} w-full`}>
            💳 Pagar ahora
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-slate-400">
          Pasarela de pago en modo demostración (sandbox). Al confirmar, el pago se
          aplica automáticamente a tus cuotas.
        </p>
      </Card>
    </div>
  );
}
