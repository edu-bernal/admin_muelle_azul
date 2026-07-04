import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import { EstadoCuentaView } from "@/components/estado-cuenta-view";
import {
  Card,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { declararPagoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  if (!user.propietarioId) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          Tu usuario aún no está asociado a una propiedad. Contacta a la
          administración.
        </p>
      </Card>
    );
  }

  const [ec, cuentas] = await Promise.all([
    estadoCuentaPropietario(user.propietarioId),
    prisma.configuracion.findUnique({
      where: { clave: "cuentas_bancarias_condominio" },
    }),
  ]);

  const bancos = Array.isArray(cuentas?.valor)
    ? (cuentas!.valor as { banco: string; numero: string }[])
    : [];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Hola, {user.nombre.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">Este es tu estado de cuenta.</p>
      </div>

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Tu pago fue declarado y está pendiente de validación por la
          administración.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <EstadoCuentaView ec={ec} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Declarar un pago
          </h2>
          <form action={declararPagoAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className={labelClass} htmlFor="fecha">
                  Fecha del pago
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  defaultValue={hoy}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="medio">
                  Medio
                </label>
                <select id="medio" name="medio" className={inputClass}>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEPOSITO">Depósito BBVA</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="EFECTIVO">Efectivo</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="numeroOperacion">
                  N° operación
                </label>
                <input
                  id="numeroOperacion"
                  name="numeroOperacion"
                  className={inputClass}
                />
              </div>
            </div>
            <button type="submit" className={buttonClass()}>
              Declarar pago
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Datos para el pago
          </h2>
          {bancos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Consulta las cuentas con la administración.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {bancos.map((b, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-medium">{b.banco}</span>
                  <span className="ml-2 text-slate-600">{b.numero}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-400">
            Tras declarar tu pago, la administración lo validará y lo verás
            reflejado en tu estado de cuenta.
          </p>
        </Card>
      </div>
    </>
  );
}
