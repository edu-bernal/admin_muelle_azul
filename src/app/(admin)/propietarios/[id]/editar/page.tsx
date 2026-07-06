import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { PropietarioForm } from "../../PropietarioForm";
import { actualizarPropietario } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarPropietarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const propietario = await prisma.propietario.findUnique({ where: { id } });
  if (!propietario) notFound();

  const ce = propietario.contactoEmergencia as
    | { nombre?: string | null; telefono?: string | null }
    | null;

  return (
    <div className="max-w-xl">
      <PageHeader title={`Editar propietario`} subtitle={propietario.nombre} />
      <Card>
        <PropietarioForm
          action={actualizarPropietario}
          error={error}
          submitLabel="Guardar cambios"
          cancelHref={`/propietarios/${id}`}
          defaultValues={{
            id: propietario.id,
            nombre: propietario.nombre,
            tipoDocumento: propietario.tipoDocumento,
            numeroDocumento: propietario.numeroDocumento,
            email: propietario.email,
            emailSecundario: propietario.emailSecundario,
            telefono: propietario.telefono,
            telefonoSecundario: propietario.telefonoSecundario,
            canalEnvio: propietario.canalEnvio,
            direccionHabitual: propietario.direccionHabitual,
            contactoEmergenciaNombre: ce?.nombre ?? "",
            contactoEmergenciaTelefono: ce?.telefono ?? "",
          }}
        />
      </Card>
    </div>
  );
}
