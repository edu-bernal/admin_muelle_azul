import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import {
  guardarSectorAction,
  alternarSectorAction,
  guardarTipoAction,
  alternarTipoAction,
  guardarConceptoAction,
  alternarConceptoAction,
  guardarTarifaAction,
  eliminarTarifaAction,
  guardarMedioPagoAction,
  alternarMedioPagoAction,
} from "./actions";
import { formatPEN } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    sector?: string;
    tipo?: string;
    concepto?: string;
    tarifa?: string;
    medio?: string;
  }>;
}) {
  await requirePermission("config.gestionar");
  const sp = await searchParams;

  const [sectores, tipos, conceptos, tarifas, medios] = await Promise.all([
    prisma.sector.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { unidades: true } } },
    }),
    prisma.tipoUnidad.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { unidades: true } } },
    }),
    prisma.conceptoCobro.findMany({
      orderBy: { codigo: "asc" },
      include: { _count: { select: { cargos: true } } },
    }),
    prisma.tarifaCuota.findMany({
      orderBy: { vigenteDesde: "desc" },
      include: { sector: true },
    }),
    prisma.medioPago.findMany({
      // Los de sistema van al final: no se eligen en ningún formulario.
      orderBy: [{ sistema: "asc" }, { orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { pagos: true } } },
    }),
  ]);

  // Un id en la URL abre ese registro para edición en el formulario lateral.
  const sectorEnEdicion = sectores.find((s) => s.id === sp.sector);
  const tipoEnEdicion = tipos.find((t) => t.id === sp.tipo);
  const conceptoEnEdicion = conceptos.find((c) => c.id === sp.concepto);
  const tarifaEnEdicion = tarifas.find((t) => t.id === sp.tarifa);
  const medioEnEdicion = medios.find((m) => m.id === sp.medio);

  return (
    <>
      <PageHeader
        title="Parámetros del sistema"
        subtitle="Maestros que alimentan los formularios de propiedades y de pagos"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ {sp.ok}
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      {/* ── Sectores ─────────────────────────────────────────────── */}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Sectores ({sectores.length})
      </h2>
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 text-center">Unidades</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {sectores.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-medium tabular-nums">{s.codigo}</td>
              <td className="px-4 py-3">{s.nombre}</td>
              <td className="px-4 py-3 text-center tabular-nums">
                {s._count.unidades}
              </td>
              <td className="px-4 py-3">
                <Badge>{s.activo ? "ACTIVO" : "INACTIVO"}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/parametros?sector=${s.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </a>
                  <form action={alternarSectorAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      {s.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {sectorEnEdicion ? "Editar sector" : "Nuevo sector"}
          </h3>
          <form action={guardarSectorAction} className="space-y-3">
            {sectorEnEdicion && (
              <input type="hidden" name="id" value={sectorEnEdicion.id} />
            )}
            <div>
              <label className={labelClass} htmlFor="sector-codigo">
                Código
              </label>
              <input
                id="sector-codigo"
                name="codigo"
                required
                defaultValue={sectorEnEdicion?.codigo ?? ""}
                readOnly={!!sectorEnEdicion}
                placeholder="MA_S"
                className={`${inputClass} ${sectorEnEdicion ? "bg-slate-50 text-slate-500" : ""}`}
              />
              <p className="mt-1 text-xs text-slate-400">
                {sectorEnEdicion
                  ? "El código no se edita: forma parte del código de cada unidad."
                  : "Se guarda en mayúsculas. Aparece en el código de la unidad."}
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="sector-nombre">
                Nombre
              </label>
              <input
                id="sector-nombre"
                name="nombre"
                required
                defaultValue={sectorEnEdicion?.nombre ?? ""}
                placeholder="MA Sur"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass()}>
                Guardar
              </button>
              {sectorEnEdicion && (
                <a href="/parametros" className={buttonClass("ghost")}>
                  Cancelar
                </a>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* ── Tipos de propiedad ───────────────────────────────────── */}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Tipos de propiedad ({tipos.length})
      </h2>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 text-right">Cuota mensual</th>
              <th className="px-4 py-3 text-center">Orden</th>
              <th className="px-4 py-3 text-center">Unidades</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {tipos.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3 font-medium tabular-nums">{t.codigo}</td>
              <td className="px-4 py-3">{t.nombre}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {!t.generaCuota ? (
                  <span className="text-slate-400">No paga cuota</span>
                ) : t.valor === null ? (
                  <span className="text-slate-400">Según tarifa</span>
                ) : (
                  <span className="font-medium">{formatPEN(t.valor)}</span>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                {t.orden}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">
                {t._count.unidades}
              </td>
              <td className="px-4 py-3">
                <Badge>{t.activo ? "ACTIVO" : "INACTIVO"}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/parametros?tipo=${t.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </a>
                  <form action={alternarTipoAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      {t.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {tipoEnEdicion ? "Editar tipo" : "Nuevo tipo"}
          </h3>
          <form action={guardarTipoAction} className="space-y-3">
            {tipoEnEdicion && (
              <input type="hidden" name="id" value={tipoEnEdicion.id} />
            )}
            <div>
              <label className={labelClass} htmlFor="tipo-codigo">
                Código
              </label>
              <input
                id="tipo-codigo"
                name="codigo"
                required
                defaultValue={tipoEnEdicion?.codigo ?? ""}
                readOnly={!!tipoEnEdicion}
                placeholder="COCHERA"
                className={`${inputClass} ${tipoEnEdicion ? "bg-slate-50 text-slate-500" : ""}`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tipo-nombre">
                Nombre
              </label>
              <input
                id="tipo-nombre"
                name="nombre"
                required
                defaultValue={tipoEnEdicion?.nombre ?? ""}
                placeholder="Cochera"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tipo-valor">
                Cuota mensual (S/)
              </label>
              <input
                id="tipo-valor"
                name="valor"
                type="number"
                step="0.01"
                min="0"
                defaultValue={tipoEnEdicion?.valor?.toString() ?? ""}
                placeholder="Dejar vacío para usar la tarifa"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                Monto que se emitirá cada mes a las propiedades de este tipo. Si
                se deja vacío, se aplica la tarifa del sector o la general.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="generaCuota"
                  defaultChecked={tipoEnEdicion?.generaCuota ?? true}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  Genera cuota de mantenimiento
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Desmárcalo para las cocheras y cualquier tipo que no paga:
                    la emisión mensual los omite en vez de crearles un cargo de
                    S/ 0.
                  </span>
                </span>
              </label>
            </div>
            <div>
              <label className={labelClass} htmlFor="tipo-orden">
                Orden
              </label>
              <input
                id="tipo-orden"
                name="orden"
                type="number"
                min="0"
                defaultValue={tipoEnEdicion?.orden ?? tipos.length + 1}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                Posición en la lista desplegable al crear una propiedad.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass()}>
                Guardar
              </button>
              {tipoEnEdicion && (
                <a href="/parametros" className={buttonClass("ghost")}>
                  Cancelar
                </a>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* ── Conceptos de cobro ───────────────────────────────────── */}
      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
        Conceptos de cobro ({conceptos.length})
      </h2>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 text-center">Recurrente</th>
              <th className="px-4 py-3 text-center">Genera mora</th>
              <th className="px-4 py-3 text-center">Cargos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {conceptos.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium tabular-nums">{c.codigo}</td>
              <td className="px-4 py-3">{c.nombre}</td>
              <td className="px-4 py-3 text-center">{c.esRecurrente ? "Sí" : "—"}</td>
              <td className="px-4 py-3 text-center">{c.generaMora ? "Sí" : "—"}</td>
              <td className="px-4 py-3 text-center tabular-nums">{c._count.cargos}</td>
              <td className="px-4 py-3">
                <Badge>{c.activo ? "ACTIVO" : "INACTIVO"}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/parametros?concepto=${c.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </a>
                  <form action={alternarConceptoAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      {c.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {conceptoEnEdicion ? "Editar concepto" : "Nuevo concepto"}
          </h3>
          <form action={guardarConceptoAction} className="space-y-3">
            {conceptoEnEdicion && (
              <input type="hidden" name="id" value={conceptoEnEdicion.id} />
            )}
            <div>
              <label className={labelClass} htmlFor="concepto-codigo">
                Código
              </label>
              <input
                id="concepto-codigo"
                name="codigo"
                required
                defaultValue={conceptoEnEdicion?.codigo ?? ""}
                readOnly={!!conceptoEnEdicion}
                placeholder="AGUA"
                className={`${inputClass} ${conceptoEnEdicion ? "bg-slate-50 text-slate-500" : ""}`}
              />
              <p className="mt-1 text-xs text-slate-400">
                {conceptoEnEdicion
                  ? "El código no se edita: la emisión reconoce la cuota ordinaria por su código."
                  : "Se guarda en mayúsculas."}
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="concepto-nombre">
                Nombre
              </label>
              <input
                id="concepto-nombre"
                name="nombre"
                required
                defaultValue={conceptoEnEdicion?.nombre ?? ""}
                placeholder="Consumo de agua"
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="esRecurrente"
                defaultChecked={conceptoEnEdicion?.esRecurrente ?? false}
                className="h-4 w-4 rounded border-slate-300"
              />
              Es recurrente (se emite cada mes)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="generaMora"
                defaultChecked={conceptoEnEdicion?.generaMora ?? true}
                className="h-4 w-4 rounded border-slate-300"
              />
              Genera intereses por mora
            </label>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass()}>
                Guardar
              </button>
              {conceptoEnEdicion && (
                <a href="/parametros" className={buttonClass("ghost")}>
                  Cancelar
                </a>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* ── Tarifas de la cuota ordinaria ────────────────────────── */}
      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
        Tarifas de la cuota ordinaria ({tarifas.length})
      </h2>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Vigente desde</th>
              <th className="px-4 py-3 text-right">Monto mensual</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {tarifas.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3 tabular-nums">
                {t.vigenteDesde.toISOString().slice(0, 7)}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatPEN(t.montoMensual)}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {t.sector?.nombre ?? "Todos"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/parametros?tarifa=${t.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </a>
                  <form action={eliminarTarifaAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {tarifaEnEdicion ? "Editar tarifa" : "Nueva tarifa"}
          </h3>
          <form action={guardarTarifaAction} className="space-y-3">
            {tarifaEnEdicion && (
              <input type="hidden" name="id" value={tarifaEnEdicion.id} />
            )}
            <div>
              <label className={labelClass} htmlFor="tarifa-desde">
                Vigente desde
              </label>
              <input
                id="tarifa-desde"
                name="vigenteDesde"
                type="month"
                required
                defaultValue={
                  tarifaEnEdicion?.vigenteDesde.toISOString().slice(0, 7) ?? ""
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tarifa-monto">
                Monto mensual (S/)
              </label>
              <input
                id="tarifa-monto"
                name="montoMensual"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={tarifaEnEdicion?.montoMensual.toString() ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tarifa-sector">
                Sector
              </label>
              <select
                id="tarifa-sector"
                name="sectorId"
                defaultValue={tarifaEnEdicion?.sectorId ?? ""}
                className={inputClass}
              >
                <option value="">Todos los sectores</option>
                {sectores.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400">
              La tarifa de un sector gana sobre la general. Siempre debe existir
              una general. El monto por tipo de propiedad se define en su
              propio valor, más arriba.
            </p>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass()}>
                Guardar
              </button>
              {tarifaEnEdicion && (
                <a href="/parametros" className={buttonClass("ghost")}>
                  Cancelar
                </a>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* ── Medios de pago ───────────────────────────────────────── */}
      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
        Medios de pago ({medios.length})
      </h2>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 text-center">Portal</th>
              <th className="px-4 py-3 text-center">Orden</th>
              <th className="px-4 py-3 text-center">Pagos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          }
        >
          {medios.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium tabular-nums">{m.codigo}</td>
              <td className="px-4 py-3">
                {m.nombre}
                {m.sistema && (
                  <span className="ml-2 text-xs text-slate-400">del sistema</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">{m.portal ? "Sí" : "—"}</td>
              <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                {m.orden}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">{m._count.pagos}</td>
              <td className="px-4 py-3">
                <Badge>{m.activo ? "ACTIVO" : "INACTIVO"}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/parametros?medio=${m.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </a>
                  {!m.sistema && (
                    <form action={alternarMedioPagoAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {m.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {medioEnEdicion ? "Editar medio de pago" : "Nuevo medio de pago"}
          </h3>
          <form action={guardarMedioPagoAction} className="space-y-3">
            {medioEnEdicion && (
              <input type="hidden" name="id" value={medioEnEdicion.id} />
            )}
            <div>
              <label className={labelClass} htmlFor="medio-codigo">
                Código
              </label>
              <input
                id="medio-codigo"
                name="codigo"
                required
                defaultValue={medioEnEdicion?.codigo ?? ""}
                readOnly={!!medioEnEdicion}
                placeholder="DEPOSITO_BCP"
                className={`${inputClass} ${medioEnEdicion ? "bg-slate-50 text-slate-500" : ""}`}
              />
              <p className="mt-1 text-xs text-slate-400">
                {medioEnEdicion
                  ? "El código no se edita: cada pago guarda el código de su medio."
                  : "Se guarda en mayúsculas."}
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="medio-nombre">
                Nombre
              </label>
              <input
                id="medio-nombre"
                name="nombre"
                required
                defaultValue={medioEnEdicion?.nombre ?? ""}
                placeholder="Depósito BCP"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                Es lo que se ve en los formularios de pago.
              </p>
            </div>
            {!medioEnEdicion?.sistema && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="portal"
                  defaultChecked={medioEnEdicion?.portal ?? true}
                  className="h-4 w-4 rounded border-slate-300"
                />
                El propietario puede elegirlo en el portal
              </label>
            )}
            <div>
              <label className={labelClass} htmlFor="medio-orden">
                Orden
              </label>
              <input
                id="medio-orden"
                name="orden"
                type="number"
                min="0"
                defaultValue={
                  medioEnEdicion?.orden ??
                  medios.filter((m) => !m.sistema).length + 1
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                Posición en la lista desplegable de los formularios de pago.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass()}>
                Guardar
              </button>
              {medioEnEdicion && (
                <a href="/parametros" className={buttonClass("ghost")}>
                  Cancelar
                </a>
              )}
            </div>
          </form>
        </Card>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-slate-400">
        Un sector, tipo o concepto con registros asociados no se puede
        desactivar, porque dejaría de aparecer en los formularios mientras esos
        registros siguen activos. Primero hay que reasignarlos. Los medios de
        pago sí se pueden desactivar con pagos: solo dejan de ofrecerse, y los
        pagos que ya los usan los conservan.
      </p>
    </>
  );
}
