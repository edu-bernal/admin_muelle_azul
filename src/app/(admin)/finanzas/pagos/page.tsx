import Link from "next/link";
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
import { PropietarioCombobox } from "@/components/propietario-combobox";
import {
  registrarPagoAction,
  confirmarPagoAction,
  rechazarPagoAction,
  anularPagoAction,
  eliminarPagoAction,
} from "./actions";
import type { EstadoPago, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADOS_HISTORIAL: EstadoPago[] = [
  "POR_VALIDAR",
  "CONFIRMADO",
  "RECHAZADO",
  "ANULADO",
];
const HISTORIAL_TAKE = 300;

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    aplicado?: string;
    q?: string;
    estado?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const estadoFiltro = ESTADOS_HISTORIAL.includes(sp.estado as EstadoPago)
    ? (sp.estado as EstadoPago)
    : undefined;

  const historialWhere: Prisma.PagoWhereInput = {
    ...(estadoFiltro ? { estado: estadoFiltro } : {}),
    ...(q
      ? {
          OR: [
            { propietario: { nombre: { contains: q, mode: "insensitive" } } },
            {
              aplicaciones: {
                some: {
                  cargo: {
                    unidad: { codigo: { contains: q, mode: "insensitive" } },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [propietariosRaw, porValidar, recientes, totalHistorial] =
    await Promise.all([
      prisma.propietario.findMany({
        where: { activo: true, titularidades: { some: { fechaFin: null } } },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          titularidades: {
            where: { fechaFin: null },
            select: { unidad: { select: { codigo: true } } },
          },
        },
      }),
      prisma.pago.findMany({
        where: { estado: "POR_VALIDAR" },
        include: { propietario: { select: { nombre: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pago.findMany({
        where: historialWhere,
        include: { propietario: { select: { nombre: true } }, recibo: true },
        orderBy: { createdAt: "desc" },
        take: HISTORIAL_TAKE,
      }),
      prisma.pago.count({ where: historialWhere }),
    ]);

  const propietarios = propietariosRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    unidades: p.titularidades.map((t) => t.unidad.codigo),
  }));

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Pagos"
        subtitle="Registra pagos recibidos y valida los declarados por propietarios"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Operación realizada
          {sp.ok.startsWith("recibo-") &&
            ` — ${sp.ok.replace("recibo-", "Recibo N° ")}, aplicado ${formatPEN(sp.aplicado ?? 0)}`}
          .
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Registrar pago
          </h2>
          <form action={registrarPagoAction} className="space-y-3">
            <PropietarioCombobox propietarios={propietarios} />
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
                  Fecha
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
                  <option value="CHEQUE">Cheque</option>
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
            <p className="text-xs text-slate-400">
              El pago se aplica automáticamente a los cargos más antiguos (FIFO) y
              genera un recibo de caja.
            </p>
            <button type="submit" className={buttonClass()}>
              Registrar y aplicar
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Por validar ({porValidar.length})
          </h2>
          {porValidar.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay pagos declarados pendientes de validación.
            </p>
          ) : (
            <div className="space-y-3">
              {porValidar.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.propietario.nombre}</span>
                    <span className="font-semibold">{formatPEN(p.monto)}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {p.medio} · {p.fechaPago.toISOString().slice(0, 10)}
                    {p.numeroOperacion ? ` · Op. ${p.numeroOperacion}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={confirmarPagoAction}>
                      <input type="hidden" name="pagoId" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Confirmar
                      </button>
                    </form>
                    <form action={rechazarPagoAction} className="flex gap-2">
                      <input type="hidden" name="pagoId" value={p.id} />
                      <input
                        name="motivo"
                        placeholder="Motivo"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Rechazar
                      </button>
                    </form>
                    <Link
                      href={`/finanzas/pagos/${p.id}/editar`}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <form action={eliminarPagoAction} className="flex gap-1">
                      <input type="hidden" name="pagoId" value={p.id} />
                      <input
                        name="motivo"
                        placeholder="Motivo de eliminación"
                        required
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-900"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Historial de pagos ({totalHistorial})
          </h2>
          <form className="flex flex-wrap items-end gap-2" method="get">
            <div>
              <label className={labelClass} htmlFor="q">
                Buscar
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Nombre, apellido o propiedad"
                className={`${inputClass} w-64`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="estado">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                defaultValue={estadoFiltro ?? "TODOS"}
                className={inputClass}
              >
                <option value="TODOS">Todos</option>
                <option value="CONFIRMADO">Confirmado</option>
                <option value="POR_VALIDAR">Por validar</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
            <button type="submit" className={buttonClass("ghost")}>
              Filtrar
            </button>
            {(q || estadoFiltro) && (
              <Link
                href="/finanzas/pagos"
                className="text-xs text-slate-400 hover:underline"
              >
                Limpiar
              </Link>
            )}
          </form>
        </div>
        {totalHistorial > HISTORIAL_TAKE && (
          <p className="mb-2 text-xs text-slate-400">
            Mostrando los {HISTORIAL_TAKE} pagos más recientes de{" "}
            {totalHistorial}. Usa el buscador para acotar resultados.
          </p>
        )}
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Propietario</th>
              <th className="px-4 py-3">Medio</th>
              <th className="px-4 py-3">Recibo</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {recientes.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">{p.fechaPago.toISOString().slice(0, 10)}</td>
              <td className="px-4 py-3">{p.propietario.nombre}</td>
              <td className="px-4 py-3 text-slate-500">{p.medio}</td>
              <td className="px-4 py-3 text-slate-500">
                {p.recibo ? (
                  <a
                    href={`/api/recibos/${p.recibo.id}/pdf`}
                    target="_blank"
                    rel="noopener"
                    className="text-brand hover:underline"
                  >
                    N° {p.recibo.numero} · PDF
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatPEN(p.monto)}
              </td>
              <td className="px-4 py-3">
                <Badge>{p.estado}</Badge>
                {p.estado === "ANULADO" && p.anuladoMotivo && (
                  <p className="mt-1 text-xs text-slate-400">{p.anuladoMotivo}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {p.estado === "CONFIRMADO" && (
                    <>
                      <Link
                        href={`/finanzas/pagos/${p.id}/editar`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={anularPagoAction} className="flex gap-1">
                        <input type="hidden" name="pagoId" value={p.id} />
                        <input
                          name="motivo"
                          placeholder="Motivo de anulación"
                          required
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Anular
                        </button>
                      </form>
                    </>
                  )}
                  <form action={eliminarPagoAction} className="flex gap-1">
                    <input type="hidden" name="pagoId" value={p.id} />
                    <input
                      name="motivo"
                      placeholder="Motivo de eliminación"
                      required
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {recientes.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                {q || estadoFiltro
                  ? "Sin pagos que coincidan con la búsqueda."
                  : "Sin pagos registrados."}
              </td>
            </tr>
          )}
        </Table>
      </div>
    </>
  );
}
