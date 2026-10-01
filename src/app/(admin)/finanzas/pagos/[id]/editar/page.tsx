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
import { ACCEPT_COMPROBANTE } from "@/lib/comprobantes";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import { mediosPagoSeleccionables } from "@/modules/finanzas/medios-pago.service";

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
    include: {
      propietario: { select: { nombre: true } },
      aplicaciones: { select: { cargoId: true, montoAplicado: true } },
    },
  });
  if (!pago) notFound();

  const montoEditable = pago.estado === "POR_VALIDAR" || pago.estado === "CONFIRMADO";
  const confirmado = pago.estado === "CONFIRMADO";
  const aplicadoPorCargo = new Map(
    pago.aplicaciones.map((a) => [a.cargoId, Number(a.montoAplicado)]),
  );

  // Cuotas elegibles: las que este pago ya cubre y las que aún tienen saldo.
  const unidadIds = confirmado ? await unidadIdsDePropietario(pago.propietarioId) : [];
  const cuotas = confirmado
    ? await prisma.cargo.findMany({
        where: {
          estado: { not: "ANULADO" },
          OR: [
            { id: { in: [...aplicadoPorCargo.keys()] } },
            { unidadId: { in: unidadIds }, estado: { in: ["PENDIENTE", "PARCIAL"] } },
          ],
        },
        include: {
          unidad: { select: { codigo: true } },
          aplicaciones: { select: { montoAplicado: true } },
        },
        orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
      })
    : [];
  const fechaStr = pago.fechaPago.toISOString().slice(0, 10);

  // El medio actual se ofrece siempre, aunque esté inactivo o sea de sistema
  // (los pagos migrados): si no, el desplegable lo cambiaría sin avisar.
  const medios = await mediosPagoSeleccionables();
  if (!medios.some((m) => m.codigo === pago.medio)) {
    const actual = await prisma.medioPago.findUnique({ where: { codigo: pago.medio } });
    medios.unshift({ codigo: pago.medio, nombre: actual?.nombre ?? pago.medio });
  }

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
              </>
            )}
          </div>

          {confirmado && (
            <div>
              <input type="hidden" name="editaCuotas" value="1" />
              <p className={labelClass}>Cuotas que cubre este pago</p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                {cuotas.map((c) => {
                  const propio = aplicadoPorCargo.get(c.id) ?? 0;
                  const deOtros =
                    c.aplicaciones.reduce((a, x) => a + Number(x.montoAplicado), 0) - propio;
                  const disponible = Number(c.monto) - deOtros;
                  return (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="cargoIds"
                        value={c.id}
                        defaultChecked={aplicadoPorCargo.has(c.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="flex-1 truncate">
                        {c.descripcion}
                        <span className="ml-1 text-xs text-slate-400">{c.unidad.codigo}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {propio > 0 && `cubre ${formatPEN(propio)} · `}
                        admite {formatPEN(disponible)}
                      </span>
                    </label>
                  );
                })}
                {cuotas.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-400">
                    El propietario no tiene cuotas con saldo.
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Al guardar con otro monto u otras cuotas, el pago se vuelve a
                aplicar: cubre las marcadas de la más antigua a la más nueva y lo
                que sobre queda como saldo a favor.
              </p>
            </div>
          )}

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
                {medios.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
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

          <div>
            <label className={labelClass} htmlFor="comprobante">
              Comprobante
            </label>
            {pago.voucherArchivoId && (
              <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <a
                  href={`/api/comprobantes/${pago.voucherArchivoId}`}
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-brand hover:underline"
                >
                  Ver comprobante actual
                </a>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="quitarComprobante"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Quitar el comprobante al guardar
                </label>
              </div>
            )}
            <input
              id="comprobante"
              name="comprobante"
              type="file"
              accept={ACCEPT_COMPROBANTE}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <p className="mt-1 text-xs text-slate-400">
              Imagen o PDF, hasta 8 MB.
              {pago.voucherArchivoId
                ? " Si eliges uno nuevo, reemplaza al actual y el anterior se borra."
                : ""}
            </p>
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
