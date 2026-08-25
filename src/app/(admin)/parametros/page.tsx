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
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; sector?: string; tipo?: string }>;
}) {
  await requirePermission("config.gestionar");
  const sp = await searchParams;

  const [sectores, tipos] = await Promise.all([
    prisma.sector.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { unidades: true } } },
    }),
    prisma.tipoUnidad.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { unidades: true } } },
    }),
  ]);

  // Un id en la URL abre ese registro para edición en el formulario lateral.
  const sectorEnEdicion = sectores.find((s) => s.id === sp.sector);
  const tipoEnEdicion = tipos.find((t) => t.id === sp.tipo);

  return (
    <>
      <PageHeader
        title="Parámetros del sistema"
        subtitle="Maestros que alimentan los formularios de propiedades"
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

      <p className="mt-6 max-w-2xl text-xs text-slate-400">
        Un sector o tipo con unidades asociadas no se puede desactivar, porque
        dejaría de aparecer en los formularios mientras esas unidades siguen
        activas. Primero hay que reasignar las unidades.
      </p>
    </>
  );
}
