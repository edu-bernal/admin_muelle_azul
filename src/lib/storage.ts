import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

/** Tipos aceptados como comprobante de pago. */
export const MIME_COMPROBANTE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

/** Tope por archivo. Una foto de celular ronda 1–3 MB. */
export const MAX_BYTES = 8 * 1024 * 1024;

export const ACCEPT_COMPROBANTE = "image/*,application/pdf";

function validar(archivo: File): void {
  if (archivo.size === 0) throw new Error("El archivo está vacío");
  if (archivo.size > MAX_BYTES)
    throw new Error(
      `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_BYTES / 1024 / 1024} MB`,
    );
  if (!MIME_COMPROBANTE.includes(archivo.type as (typeof MIME_COMPROBANTE)[number]))
    throw new Error("Solo se aceptan imágenes (JPG, PNG, WEBP, HEIC) o PDF");
}

/** Quita acentos y caracteres raros para que la clave del blob sea estable. */
function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

/**
 * Sube un comprobante a Vercel Blob y deja su registro en la tabla Archivo.
 * Devuelve el id del Archivo, que es lo que se guarda en Pago.voucherArchivoId.
 */
export async function subirComprobante(
  archivo: File,
  opciones: { usuarioId?: string | null; entidadTipo?: string; entidadId?: string },
): Promise<string> {
  validar(archivo);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Falta configurar el almacenamiento de archivos (BLOB_READ_WRITE_TOKEN). " +
        "Crea el Blob store en Vercel → Storage y vuelve a desplegar.",
    );
  }

  const blob = await put(
    `comprobantes/${nombreSeguro(archivo.name)}`,
    archivo,
    { access: "public", addRandomSuffix: true },
  );

  const registro = await prisma.archivo.create({
    data: {
      storageKey: blob.url,
      nombreOriginal: archivo.name.slice(0, 255),
      mime: archivo.type,
      tamanoBytes: archivo.size,
      subidoPorId: opciones.usuarioId ?? null,
      entidadTipo: opciones.entidadTipo ?? null,
      entidadId: opciones.entidadId ?? null,
    },
  });
  return registro.id;
}

/**
 * Borra el archivo del almacenamiento y su registro. Se usa al reemplazar un
 * comprobante; si el blob ya no existe igual se limpia la fila.
 */
export async function eliminarArchivo(archivoId: string): Promise<void> {
  const registro = await prisma.archivo.findUnique({ where: { id: archivoId } });
  if (!registro) return;
  try {
    await del(registro.storageKey);
  } catch {
    /* el blob pudo borrarse antes; la fila se limpia igual */
  }
  await prisma.archivo.delete({ where: { id: archivoId } });
}
