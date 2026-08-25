import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Cartola } from "@/modules/finanzas/cartola.service";

const AZUL = "#0369a1";
const NEGRO = "#000000";
const GRIS = "#555555";

/** Courier es monoespaciada y viene incluida: da el aire de cartola impresa. */
const MONO = "Courier";
const MONO_BOLD = "Courier-Bold";

const MOVS_POR_PAGINA = 34;

const s = StyleSheet.create({
  page: { padding: 28, fontFamily: MONO, fontSize: 8, color: NEGRO },

  titulo: { fontFamily: MONO_BOLD, fontSize: 11, marginBottom: 14 },

  bloqueSuperior: { flexDirection: "row", justifyContent: "space-between" },
  titular: { width: "52%" },
  nombre: { fontFamily: MONO_BOLD, fontSize: 9, marginBottom: 3 },
  direccion: { fontSize: 8, lineHeight: 1.4 },

  cajas: { width: "45%" },
  filaCajas: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 6 },
  caja: { borderWidth: 1, borderColor: NEGRO, marginLeft: 6 },
  cajaEtiqueta: {
    fontSize: 5.5,
    textAlign: "center",
    color: GRIS,
    borderBottomWidth: 1,
    borderBottomColor: NEGRO,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  cajaValor: { fontSize: 9, textAlign: "center", paddingVertical: 3, paddingHorizontal: 6 },
  paginaLinea: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  paginaTexto: { fontSize: 8, color: GRIS, marginRight: 10 },
  paginaNumero: { fontSize: 8 },

  tabla: { marginTop: 16, borderWidth: 1, borderColor: NEGRO },
  encabezado: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NEGRO },
  celdaEnc: {
    fontSize: 6,
    color: AZUL,
    textAlign: "center",
    paddingVertical: 3,
    borderRightWidth: 1,
    borderRightColor: NEGRO,
  },
  fila: { flexDirection: "row", paddingVertical: 1.2 },
  celda: { fontSize: 7.5, color: AZUL, paddingHorizontal: 3 },

  colFecha: { width: "10%" },
  colValor: { width: "10%" },
  colDesc: { width: "45%" },
  colCargo: { width: "17.5%", textAlign: "right" },
  colAbono: { width: "17.5%", textAlign: "right" },

  totales: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: NEGRO,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalItem: { fontSize: 8 },
  totalValor: { fontFamily: MONO_BOLD },

  pie: { position: "absolute", bottom: 18, left: 28, right: 28, fontSize: 6, color: GRIS },
});

/**
 * Courier usa la codificación WinAnsi, que no incluye guiones largos ni
 * comillas tipográficas: sin esto desaparecen del PDF sin previo aviso.
 */
function limpiar(texto: string): string {
  return texto
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...");
}

function monto(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** dd/mm/aa como en la cartola del banco. */
function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

function Caja({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.caja}>
      <Text style={s.cajaEtiqueta}>{etiqueta}</Text>
      <Text style={s.cajaValor}>{valor}</Text>
    </View>
  );
}

export function CartolaDocument({ data }: { data: Cartola }) {
  const paginas: Cartola["movimientos"][] = [];
  for (let i = 0; i < data.movimientos.length; i += MOVS_POR_PAGINA) {
    paginas.push(data.movimientos.slice(i, i + MOVS_POR_PAGINA));
  }
  if (paginas.length === 0) paginas.push([]);

  return (
    <Document
      title={`Estado de cuenta ${data.propietarioNombre}`}
      author="Asociación de Propietarios Muelle Azul"
    >
      {paginas.map((movs, indice) => (
        <Page key={indice} size="A4" style={s.page}>
          <Text style={s.titulo}>
            {limpiar("Estado de Cuenta — Condominio de Playa Muelle Azul")}
          </Text>

          <View style={s.bloqueSuperior}>
            <View style={s.titular}>
              <Text style={s.nombre}>
                {limpiar(data.propietarioNombre.toUpperCase())}
              </Text>
              {data.direccion && (
                <Text style={s.direccion}>{limpiar(data.direccion)}</Text>
              )}
              {data.documento && <Text style={s.direccion}>DOC. {data.documento}</Text>}
            </View>

            <View style={s.cajas}>
              <View style={s.paginaLinea}>
                <Text style={s.paginaTexto}>PAGINA</Text>
                <Text style={s.paginaNumero}>
                  {indice + 1} DE {paginas.length}
                </Text>
              </View>
              <View style={s.filaCajas}>
                <Caja
                  etiqueta="PROPIEDAD"
                  valor={data.unidades.join(" ") || "-"}
                />
                <Caja etiqueta="MONEDA" valor="SOLES" />
              </View>
              <View style={s.filaCajas}>
                <Caja
                  etiqueta="FECHA DE ESTADO DE CUENTA"
                  valor={`DEL  ${fechaCorta(data.desde)}  AL  ${fechaCorta(data.hasta)}`}
                />
              </View>
            </View>
          </View>

          <View style={s.tabla}>
            <View style={s.encabezado}>
              <Text style={[s.celdaEnc, s.colFecha]}>FECHA PROC.</Text>
              <Text style={[s.celdaEnc, s.colValor]}>FECHA VALOR</Text>
              <Text style={[s.celdaEnc, s.colDesc]}>DESCRIPCION</Text>
              <Text style={[s.celdaEnc, s.colCargo]}>CARGOS / DEBE</Text>
              <Text style={[s.celdaEnc, s.colAbono, { borderRightWidth: 0 }]}>
                ABONOS / HABER
              </Text>
            </View>

            {indice === 0 && (
              <View style={s.fila}>
                <Text style={[s.celda, s.colFecha]}> </Text>
                <Text style={[s.celda, s.colValor]}> </Text>
                <Text style={[s.celda, s.colDesc]}>SALDO ANTERIOR</Text>
                <Text style={[s.celda, s.colCargo]}>
                  {data.saldoAnterior >= 0 ? monto(data.saldoAnterior) : ""}
                </Text>
                <Text style={[s.celda, s.colAbono]}>
                  {data.saldoAnterior < 0 ? monto(-data.saldoAnterior) : ""}
                </Text>
              </View>
            )}

            {movs.map((m, i) => (
              <View key={i} style={s.fila}>
                <Text style={[s.celda, s.colFecha]}>{fechaCorta(m.fechaProceso)}</Text>
                <Text style={[s.celda, s.colValor]}>{fechaCorta(m.fechaValor)}</Text>
                <Text style={[s.celda, s.colDesc]}>{limpiar(m.descripcion)}</Text>
                <Text style={[s.celda, s.colCargo]}>
                  {m.cargo !== null ? monto(m.cargo) : ""}
                </Text>
                <Text style={[s.celda, s.colAbono]}>
                  {m.abono !== null ? monto(m.abono) : ""}
                </Text>
              </View>
            ))}

            {movs.length === 0 && (
              <View style={s.fila}>
                <Text style={[s.celda, s.colDesc, { width: "100%", textAlign: "center" }]}>
                  SIN MOVIMIENTOS EN EL PERIODO
                </Text>
              </View>
            )}
          </View>

          {indice === paginas.length - 1 && (
            <View style={s.totales}>
              <Text style={s.totalItem}>
                TOTAL CARGOS <Text style={s.totalValor}>{monto(data.totalCargos)}</Text>
              </Text>
              <Text style={s.totalItem}>
                TOTAL ABONOS <Text style={s.totalValor}>{monto(data.totalAbonos)}</Text>
              </Text>
              <Text style={s.totalItem}>
                {data.saldoFinal >= 0 ? "SALDO DEUDOR " : "SALDO A FAVOR "}
                <Text style={s.totalValor}>{monto(Math.abs(data.saldoFinal))}</Text>
              </Text>
            </View>
          )}

          <Text style={s.pie} fixed>
            {limpiar(
              "Asociación de Propietarios del Condominio Residencial de Playa Muelle Azul · RUC 20610523677 · Documento informativo, no es un comprobante de pago.",
            )}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
