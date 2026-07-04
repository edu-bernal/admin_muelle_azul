import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

interface AuditParams {
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  datosAntes?: unknown;
  datosDespues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Registra una entrada en el log de auditoría (append-only).
 * Puede recibir un cliente transaccional para escribir dentro de la misma
 * transacción de la operación financiera.
 */
export async function audit(
  params: AuditParams,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      usuarioId: params.usuarioId ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId ?? null,
      datosAntes: (params.datosAntes ?? undefined) as Prisma.InputJsonValue,
      datosDespues: (params.datosDespues ?? undefined) as Prisma.InputJsonValue,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
