import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/money";
import { Card, Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PortalRecibosPage() {
  const user = await requireUser();

  const pagos = user.propietarioId
    ? await prisma.pago.findMany({
        where: { propietarioId: user.propietarioId, estado: "CONFIRMADO" },
        include: { recibo: true },
        orderBy: { fechaPago: "desc" },
        take: 50,
      })
    : [];

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Mis recibos</h1>

      <Table
        head={
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Medio</th>
            <th className="px-4 py-3 text-right">Monto</th>
            <th className="px-4 py-3">Recibo</th>
          </tr>
        }
      >
        {pagos.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3">{p.fechaPago.toISOString().slice(0, 10)}</td>
            <td className="px-4 py-3 text-slate-500">
              <Badge>{p.medio}</Badge>
            </td>
            <td className="px-4 py-3 text-right font-medium">{formatPEN(p.monto)}</td>
            <td className="px-4 py-3">
              {p.recibo ? (
                <a
                  href={`/api/recibos/${p.recibo.id}/pdf`}
                  target="_blank"
                  rel="noopener"
                  className="text-brand hover:underline"
                >
                  N° {p.recibo.numero} · Descargar PDF
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
        {pagos.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
              Aún no tienes pagos confirmados.
            </td>
          </tr>
        )}
      </Table>

      {!user.propietarioId && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">
            Tu usuario aún no está asociado a una propiedad.
          </p>
        </Card>
      )}
    </>
  );
}
