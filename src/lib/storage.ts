import { put, del, get } from "@vercel/blob";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join, resolve, basename } from "path";
import { prisma } from "@/lib/prisma";
import { MIME_COMPROBANTE, MAX_BYTES } from "@/lib/comprobantes";


/**
 * Carpeta local donde se guardan los comprobantes mientras no exista el Blob
 * store. Solo se usa fuera de Vercel: allí el sistema de archivos es efímero
 * y de solo lectura, así que lo escrito se perdería en el siguiente despliegue.
 */
function carpetaLocal(): string {
  return process.env.COMPROBANTES_DIR ?? join(process.cwd(), "Reportes");
}

/** true si toca guardar en disco en vez de Vercel Blob. */
function usarDiscoLocal(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL;
}

function validar(archivo: File): void {
  if (archivo.size === 0) throw new Error("El archivo está vacío");
  if (archivo.size > MAX_BYTES)
    throw new Error(
      `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_BYTES / 1024 / 1024} MB`,
    );
  if (!MIME_COMPROBANTE.includes(archivo.type as (typeof MIME_COMPROBANTE)[number]))
    throw new Error("Solo se aceptan imágenes (JPG, PNG, WEBP, HEIC) o PDF");
}

/** Quita acentos y caracteres raros para que la clave del archivo sea estable. */
function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

/**
 * Sube un comprobante y deja su registro en la tabla Archivo. Devuelve el id
 * del Archivo, que es lo que se guarda en Pago.voucherArchivoId.
 *
 * En `storageKey` queda una URL (Vercel Blob) o una ruta absoluta en disco;
 * `leerArchivo` distingue una de otra.
 */
export async function subirComprobante(
  archivo: File,
  opciones: { usuarioId?: string | null; entidadTipo?: string; entidadId?: string },
): Promise<string> {
  validar(archivo);

  const nombre = `${Date.now()}-${nombreSeguro(archivo.name)}`;
  let storageKey: string;

  if (usarDiscoLocal()) {
    const carpeta = carpetaLocal();
    await mkdir(carpeta, { recursive: true });
    const destino = join(carpeta, nombre);
    await writeFile(destino, Buffer.from(await archivo.arrayBuffer()));
    storageKey = destino;
  } else {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Falta configurar el almacenamiento de archivos (BLOB_READ_WRITE_TOKEN). " +
          "Crea el Blob store en Vercel → Storage y vuelve a desplegar.",
      );
    }
    // Privado: los vouchers llevan datos bancarios, así que el archivo no
    // debe ser accesible por URL ni siquiera conociéndola.
    const blob = await put(`comprobantes/${nombre}`, archivo, {
      access: "private",
      addRandomSuffix: true,
    });
    storageKey = blob.url;
  }

  const registro = await prisma.archivo.create({
    data: {
      storageKey,
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

/** Lee el contenido de un comprobante, esté en Vercel Blob o en disco. */
export async function leerArchivo(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    const resultado = await get(storageKey, { access: "private" });
    if (!resultado || resultado.statusCode !== 200 || !resultado.stream) {
      throw new Error("No se pudo leer el archivo almacenado");
    }
    return Buffer.from(
      await new Response(resultado.stream).arrayBuffer(),
    );
  }

  // Ruta local: se reconstruye desde la carpeta base usando solo el nombre,
  // para que un storageKey manipulado no pueda apuntar fuera de ella.
  const ruta = resolve(carpetaLocal(), basename(storageKey));
  return readFile(ruta);
}

/**
 * Borra el archivo del almacenamiento y su registro. Se usa al reemplazar un
 * comprobante; si el archivo ya no existe igual se limpia la fila.
 */
export async function eliminarArchivo(archivoId: string): Promise<void> {
  const registro = await prisma.archivo.findUnique({ where: { id: archivoId } });
  if (!registro) return;
  try {
    if (registro.storageKey.startsWith("http")) {
      await del(registro.storageKey);
    } else {
      await unlink(resolve(carpetaLocal(), basename(registro.storageKey)));
    }
  } catch {
    /* el archivo pudo borrarse antes; la fila se limpia igual */
  }
  await prisma.archivo.delete({ where: { id: archivoId } });
}
