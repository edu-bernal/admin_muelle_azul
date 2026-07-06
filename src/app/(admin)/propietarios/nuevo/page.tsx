import { PageHeader, Card } from "@/components/ui";
import { PropietarioForm } from "../PropietarioForm";
import { crearPropietario } from "../actions";

export default async function NuevoPropietarioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader title="Nuevo propietario" />
      <Card>
        <PropietarioForm
          action={crearPropietario}
          error={error}
          submitLabel="Guardar"
          cancelHref="/propietarios"
        />
      </Card>
    </div>
  );
}
