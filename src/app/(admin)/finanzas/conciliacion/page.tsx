import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ConciliacionClient } from "./ConciliacionClient";

export const dynamic = "force-dynamic";

export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const pagos = await prisma.pago.findMany({
    where: { estado: "POR_VALIDAR" },
    include: { propietario: { select: { nombre: true } } },
    orderBy: { createdAt: "asc" },
  });

  const data = pagos.map((p) => ({
    id: p.id,
    propietario: p.propietario.nombre,
    monto: Number(p.monto),
    medio: p.medio,
    numeroOperacion: p.numeroOperacion,
    fecha: p.fechaPago.toISOString().slice(0, 10),
  }));

  return (
    <>
      <PageHeader
        title="Conciliación bancaria"
        subtitle="Cruza el extracto del banco con los pagos declarados por validar"
      />
      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Pago conciliado y confirmado.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}
      <ConciliacionClient pagos={data} />
    </>
  );
}
