import { LinkButton } from "@/components/ui";

export default function SinAcceso() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="text-xl font-semibold text-slate-900">Sin acceso</h1>
      <p className="max-w-sm text-sm text-slate-500">
        No tienes permisos para ver esta sección. Si crees que es un error,
        contacta a la administración.
      </p>
      <LinkButton href="/" variant="ghost">
        Volver al inicio
      </LinkButton>
    </div>
  );
}
