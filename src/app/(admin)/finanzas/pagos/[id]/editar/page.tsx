import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import {
  PageHeader,
  Card,
  Badge,
  LinkButton,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { editarPagoAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarPagoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: { propietario: { select: { nombre: true } } },
  });
  if (!pago) notFound();

  const montoEditable = pago.estado === "POR_VALIDAR";
  const fechaStr = pago.fechaPago.toISOString().slice(0, 10);

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Editar pago"
        subtitle={`${pago.propietario.nombre} · ${formatPEN(pago.monto)}`}
      />
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">Estado:</span>
          <Badge>{pago.estado}</Badge>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form action={editarPagoAction} className="space-y-4">
          <input type="hidden" name="pagoId" value={pago.id} />

          <div>
            <label className={labelClass} htmlFor="monto">
              Monto (S/)
            </label>
            {montoEditable ? (
              <input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={pago.monto.toString()}
                className={inputClass}
              />
            ) : (
              <>
                <div className={`${inputClass} bg-slate-50 text-slate-500`}>
                  {formatPEN(pago.monto)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Este pago ya está confirmado y aplicado a uno o más cargos. Para
                  corregir el monto, anúlalo desde la lista de pagos y registra uno
                  nuevo.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="fecha">
                Fecha de pago
              </label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                required
                defaultValue={fechaStr}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="medio">
                Medio
              </label>
              <select id="medio" name="medio" defaultValue={pago.medio} className={inputClass}>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="banco">
                Banco
              </label>
              <input
                id="banco"
                name="banco"
                defaultValue={pago.banco ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="numeroOperacion">
                N° operación
              </label>
              <input
                id="numeroOperacion"
                name="numeroOperacion"
                defaultValue={pago.numeroOperacion ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className={buttonClass()}>
              Guardar cambios
            </button>
            <LinkButton href="/finanzas/pagos" variant="ghost">
              Cancelar
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
