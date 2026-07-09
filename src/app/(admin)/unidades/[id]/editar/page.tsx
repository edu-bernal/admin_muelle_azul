import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { UnidadForm } from "../../UnidadForm";
import { actualizarUnidad } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarUnidadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const unidad = await prisma.unidad.findUnique({ where: { id } });
  if (!unidad) notFound();

  const [sectores, unidadesPrincipales] = await Promise.all([
    prisma.sector.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.unidad.findMany({
      where: { activo: true, id: { not: id } },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Editar unidad" subtitle={unidad.codigo} />
      <Card>
        <UnidadForm
          action={actualizarUnidad}
          error={error}
          submitLabel="Guardar cambios"
          cancelHref={`/unidades/${id}`}
          sectores={sectores}
          unidadesPrincipales={unidadesPrincipales}
          codigoActual={unidad.codigo}
          defaultValues={{
            id: unidad.id,
            sectorId: unidad.sectorId,
            manzana: unidad.manzana,
            lote: unidad.lote,
            tipo: unidad.tipo,
            areaM2: unidad.areaM2?.toString() ?? "",
            alicuota: unidad.alicuota?.toString() ?? "",
            baseCalculoCuota: unidad.baseCalculoCuota,
            montoFijoCuota: unidad.montoFijoCuota?.toString() ?? "",
            estadoOcupacion: unidad.estadoOcupacion,
            unidadPrincipalId: unidad.unidadPrincipalId,
          }}
        />
      </Card>
    </div>
  );
}
