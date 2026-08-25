import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { UnidadForm } from "../UnidadForm";
import { crearUnidad } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaUnidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [sectores, tipos, unidadesPrincipales] = await Promise.all([
    prisma.sector.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.tipoUnidad.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true },
    }),
    prisma.unidad.findMany({
      where: { activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nueva unidad" />
      <Card>
        <UnidadForm
          action={crearUnidad}
          error={error}
          submitLabel="Guardar"
          cancelHref="/unidades"
          sectores={sectores}
          tipos={tipos}
          unidadesPrincipales={unidadesPrincipales}
        />
      </Card>
    </div>
  );
}
