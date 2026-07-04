import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  Table,
  Badge,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import { registrarIngresoAction, registrarSalidaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccesosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [unidades, visitas] = await Promise.all([
    prisma.unidad.findMany({
      where: { activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
    prisma.visita.findMany({
      where: {
        OR: [{ ingresoAt: { gte: inicioDia } }, { salidaAt: null, ingresoAt: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      include: { unidad: { select: { codigo: true } } },
      take: 100,
    }),
  ]);

  const dentro = visitas.filter((v) => v.ingresoAt && !v.salidaAt).length;

  return (
    <>
      <PageHeader
        title="Control de accesos"
        subtitle="Registro de visitas, delivery, proveedores y trabajadores (garita)"
      />

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Registro guardado.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Actualmente dentro</p>
          <p className="mt-1 text-2xl font-semibold">{dentro}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Registros de hoy</p>
          <p className="mt-1 text-2xl font-semibold">{visitas.length}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Registrar ingreso</h2>
        <form action={registrarIngresoAction} className="grid gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre
            </label>
            <input id="nombre" name="nombre" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="documento">
              Documento
            </label>
            <input id="documento" name="documento" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="placa">
              Placa (opcional)
            </label>
            <input id="placa" name="placa" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="unidadId">
              Unidad de destino
            </label>
            <select id="unidadId" name="unidadId" className={inputClass}>
              <option value="">—</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="tipo">
              Tipo
            </label>
            <select id="tipo" name="tipo" className={inputClass}>
              <option value="VISITA">Visita</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PROVEEDOR">Proveedor</option>
              <option value="OBRERO">Obrero</option>
              <option value="INQUILINO">Inquilino</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className={buttonClass()}>
              Registrar ingreso
            </button>
          </div>
        </form>
      </Card>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Placa</th>
            <th className="px-4 py-3">Ingreso</th>
            <th className="px-4 py-3">Salida</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        }
      >
        {visitas.map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3 font-medium">
              {v.nombre}
              {v.preautorizada && (
                <span className="ml-2 text-xs text-emerald-600">✓ pre-aut.</span>
              )}
            </td>
            <td className="px-4 py-3">
              <Badge>{v.tipo}</Badge>
            </td>
            <td className="px-4 py-3 text-slate-500">{v.unidad?.codigo ?? "—"}</td>
            <td className="px-4 py-3 text-slate-500">{v.placa ?? "—"}</td>
            <td className="px-4 py-3 text-slate-500">
              {v.ingresoAt ? v.ingresoAt.toISOString().slice(11, 16) : "—"}
            </td>
            <td className="px-4 py-3 text-slate-500">
              {v.salidaAt ? v.salidaAt.toISOString().slice(11, 16) : "—"}
            </td>
            <td className="px-4 py-3">
              {v.ingresoAt && !v.salidaAt && (
                <form action={registrarSalidaAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Marcar salida
                  </button>
                </form>
              )}
            </td>
          </tr>
        ))}
        {visitas.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
              Sin registros hoy.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
