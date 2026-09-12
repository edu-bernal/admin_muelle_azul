import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estadoCuentaPropietario } from "@/modules/finanzas/estado-cuenta.service";
import { EstadoCuentaView } from "@/components/estado-cuenta-view";
import {
  Card,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
  LinkButton,
} from "@/components/ui";
import { formatPEN } from "@/lib/money";
import { ACCEPT_COMPROBANTE } from "@/lib/comprobantes";
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

  const [ec, cuentas, declarados] = await Promise.all([
    estadoCuentaPropietario(user.propietarioId),
    prisma.configuracion.findUnique({
      where: { clave: "cuentas_bancarias_condominio" },
    }),
    // Lo declarado y aún sin validar: aquí el propietario comprueba que su
    // comprobante llegó, y ve el motivo si la administración lo rechazó.
    prisma.pago.findMany({
      where: {
        propietarioId: user.propietarioId,
        estado: { in: ["POR_VALIDAR", "RECHAZADO"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const bancos = Array.isArray(cuentas?.valor)
    ? (cuentas!.valor as { banco: string; numero: string }[])
    : [];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Hola, {user.nombre.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">Este es tu estado de cuenta.</p>
        </div>
        {ec.saldoNeto > 0 && (
          <LinkButton href="/portal/pagar">💳 Pagar en línea</LinkButton>
        )}
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
            <div>
              <label className={labelClass} htmlFor="comprobante">
                Comprobante del banco (opcional)
              </label>
              <input
                id="comprobante"
                name="comprobante"
                type="file"
                accept={ACCEPT_COMPROBANTE}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="mt-1 text-xs text-slate-400">
                Foto o PDF del voucher, la constancia de transferencia o la
                captura de Yape/Plin. Hasta 8 MB. Adjuntarlo agiliza la
                validación.
              </p>
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

      {declarados.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Pagos que declaraste
          </h2>
          <ul className="space-y-2">
            {declarados.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">
                  {p.fechaPago.toISOString().slice(0, 10)} · {p.medio}
                  {p.numeroOperacion ? ` · Op. ${p.numeroOperacion}` : ""}
                </span>
                <span className="flex items-center gap-3">
                  {p.voucherArchivoId ? (
                    <a
                      href={`/api/comprobantes/${p.voucherArchivoId}`}
                      target="_blank"
                      rel="noopener"
                      className="text-brand hover:underline"
                    >
                      Ver comprobante
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sin comprobante</span>
                  )}
                  <span className="font-medium tabular-nums">
                    {formatPEN(p.monto)}
                  </span>
                  <Badge>
                    {p.estado === "POR_VALIDAR" ? "Por validar" : "Rechazado"}
                  </Badge>
                </span>
                {p.estado === "RECHAZADO" && p.rechazoMotivo && (
                  <p className="w-full text-xs text-red-600">
                    Motivo: {p.rechazoMotivo}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Un pago declarado recién se refleja en tu estado de cuenta cuando la
            administración lo valida.
          </p>
        </Card>
      )}
    </>
  );
}
