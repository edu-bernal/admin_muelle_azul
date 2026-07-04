import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unidadIdsDePropietario } from "@/modules/finanzas/shared";
import { Card, Badge, buttonClass } from "@/components/ui";
import { votarAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalVotacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const unidadIds = user.propietarioId
    ? await unidadIdsDePropietario(user.propietarioId)
    : [];

  const votaciones = await prisma.votacion.findMany({
    where: { estado: "ABIERTA" },
    orderBy: { createdAt: "desc" },
    include: { votos: { where: { unidadId: { in: unidadIds } } } },
  });

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Votaciones</h1>

      {sp.ok && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Tu voto fue registrado.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      <div className="space-y-4">
        {votaciones.map((v) => {
          const yaVoto = v.votos[0];
          const opciones = (v.opciones as string[]) ?? [];
          return (
            <Card key={v.id}>
              <h3 className="font-semibold text-slate-900">{v.pregunta}</h3>
              {v.descripcion && (
                <p className="mt-1 text-sm text-slate-500">{v.descripcion}</p>
              )}
              {yaVoto ? (
                <p className="mt-3 text-sm text-emerald-700">
                  ✓ Ya votaste: <strong>{yaVoto.opcion}</strong>{" "}
                  <Badge>puedes cambiarlo</Badge>
                </p>
              ) : null}
              <form action={votarAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="votacionId" value={v.id} />
                {opciones.map((op) => (
                  <button
                    key={op}
                    type="submit"
                    name="opcion"
                    value={op}
                    className={buttonClass(op === yaVoto?.opcion ? "primary" : "ghost")}
                  >
                    {op}
                  </button>
                ))}
              </form>
            </Card>
          );
        })}
        {votaciones.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">No hay votaciones abiertas.</p>
          </Card>
        )}
      </div>
    </>
  );
}
