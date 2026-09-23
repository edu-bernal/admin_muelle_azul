import ExcelJS from "exceljs";
import { MESES, type PadronAnual } from "@/modules/finanzas/padron-anual.service";

const AZUL = "FF1D4ED8";
const AZUL_SUAVE = "FFDBEAFE";
const GRIS = "FFF1F5F9";

/**
 * Arma el libro "Padrón general con abonos" del año: una fila por propiedad,
 * doce columnas de meses, la extraordinaria y los totales — el mismo formato
 * que la administración lleva a mano en Excel, pero con todas las propiedades
 * y los importes tomados de lo efectivamente aplicado.
 */
export async function libroPadronAnual(datos: PadronAnual): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Muelle Azul";
  libro.created = new Date();

  const hoja = libro.addWorksheet(`PAGOS ${datos.anio}`, {
    views: [{ state: "frozen", xSplit: 6, ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const cabeceras = [
    "N°",
    "Sector",
    "Manzana",
    "Lote",
    "M&L",
    "Propietario 1",
    "Propietario 2",
    "Tipo",
    ...MESES,
    "Extraordinaria",
    "Total",
  ];
  const ULTIMA = cabeceras.length;

  // Título
  hoja.mergeCells(1, 1, 1, ULTIMA);
  const titulo = hoja.getCell(1, 1);
  titulo.value = `Condominio Muelle Azul — Padrón general con abonos ${datos.anio}`;
  titulo.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  hoja.getRow(1).height = 26;

  hoja.mergeCells(2, 1, 2, ULTIMA);
  const subtitulo = hoja.getCell(2, 1);
  subtitulo.value =
    `${datos.filas.length} propiedades · Cobrado S/ ${datos.total.toFixed(2)} ` +
    `de S/ ${datos.totalEmitido.toFixed(2)} emitidos · ` +
    `Generado el ${new Date().toISOString().slice(0, 10)}`;
  subtitulo.alignment = { horizontal: "center" };
  subtitulo.font = { size: 10, color: { argb: "FF475569" } };

  const filaCabecera = hoja.addRow(cabeceras);
  filaCabecera.eachCell((celda) => {
    celda.font = { bold: true, size: 10 };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_SUAVE } };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    celda.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  filaCabecera.height = 30;

  for (const f of datos.filas) {
    const fila = hoja.addRow([
      f.numero,
      f.sector,
      f.manzana,
      f.lote,
      f.codigoCorto,
      f.propietario1,
      f.propietario2,
      f.tipo,
      ...f.meses,
      f.extraordinaria,
      f.total,
    ]);

    fila.eachCell((celda, col) => {
      celda.font = { size: 10 };
      celda.border = {
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
        right: { style: "hair", color: { argb: "FFE2E8F0" } },
      };
      // Las columnas de dinero empiezan tras los ocho datos de la propiedad.
      if (col > 8) {
        celda.numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
        celda.alignment = { horizontal: "right" };
        if (col === ULTIMA) celda.font = { size: 10, bold: true };
      }
    });
    // Un cero aquí significa "no abonó ese mes": se atenúa para que la vista
    // salte a los meses con movimiento.
    for (let col = 9; col <= ULTIMA; col++) {
      if (fila.getCell(col).value === 0) {
        fila.getCell(col).font = { size: 10, color: { argb: "FFCBD5E1" } };
      }
    }
  }

  const filaTotales = hoja.addRow([
    "",
    "",
    "",
    "",
    "",
    "TOTALES",
    "",
    "",
    ...datos.totalesMes,
    datos.totalExtraordinaria,
    datos.total,
  ]);
  filaTotales.eachCell((celda, col) => {
    celda.font = { bold: true, size: 10 };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    if (col > 8) {
      celda.numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
      celda.alignment = { horizontal: "right" };
    }
    celda.border = { top: { style: "thin", color: { argb: "FF94A3B8" } } };
  });

  const anchos = [5, 8, 9, 7, 10, 34, 34, 20];
  for (let i = 0; i < ULTIMA; i++) {
    hoja.getColumn(i + 1).width = anchos[i] ?? (i + 1 === ULTIMA ? 13 : 11);
  }
  hoja.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: ULTIMA } };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
