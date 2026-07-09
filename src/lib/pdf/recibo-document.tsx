import { Document, Page, View, Text, StyleSheet, Svg, Path, Circle } from "@react-pdf/renderer";
import { fechaCorta, mesTexto, formatearPeriodosLegible } from "./meses";

const AZUL = "#0369a1";
const AZUL_OSCURO = "#075985";
const GRIS = "#475569";
const GRIS_CLARO = "#e2e8f0";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  marco: {
    border: `1.5pt solid ${AZUL}`,
    borderRadius: 4,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: `1pt solid ${GRIS_CLARO}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  logoBox: {
    width: 52,
    height: 52,
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  nombreAsociacion: {
    fontSize: 11,
    fontWeight: 700,
    color: AZUL_OSCURO,
    marginBottom: 2,
  },
  ruc: {
    fontSize: 9,
    color: GRIS,
  },
  tituloRecibo: {
    marginTop: 6,
    textAlign: "right",
  },
  numeroRecibo: {
    fontSize: 16,
    fontWeight: 700,
    color: AZUL,
  },
  fechaRecibo: {
    fontSize: 9,
    color: GRIS,
  },
  fila: {
    flexDirection: "row",
    marginBottom: 8,
  },
  etiqueta: {
    width: 130,
    fontSize: 9,
    color: GRIS,
  },
  valor: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
  },
  importeBox: {
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: "#f0f9ff",
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  importeLabel: {
    fontSize: 10,
    color: AZUL_OSCURO,
  },
  importeValor: {
    fontSize: 18,
    fontWeight: 700,
    color: AZUL_OSCURO,
  },
  conceptoTexto: {
    fontSize: 10,
    marginTop: 2,
  },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTop: `1pt solid ${GRIS_CLARO}`,
    fontSize: 8,
    color: GRIS,
    textAlign: "center",
  },
  reimpreso: {
    marginTop: 10,
    fontSize: 8,
    color: "#b45309",
    textAlign: "center",
  },
});

function LogoOndas() {
  return (
    <Svg width={52} height={52} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={31} stroke={AZUL} strokeWidth={2} fill="#f0f9ff" />
      <Path
        d="M8 40 Q 16 32, 24 40 T 40 40 T 56 40"
        stroke={AZUL}
        strokeWidth={2.5}
        fill="none"
      />
      <Path
        d="M8 48 Q 16 40, 24 48 T 40 48 T 56 48"
        stroke={AZUL_OSCURO}
        strokeWidth={2.5}
        fill="none"
      />
      <Circle cx={32} cy={20} r={7} fill="#facc15" />
    </Svg>
  );
}

export interface ReciboPdfUnidad {
  codigo: string;
  manzana: string;
  lote: string;
  sectorNombre: string;
}

export interface ReciboPdfData {
  numero: number;
  serie: "CAJA" | "VARIOS";
  emitidoAt: Date;
  reimpresiones: number;
  condominio: { nombre: string; ruc: string | null };
  importe: number;
  recibimosDe: string;
  concepto: string;
  detallePeriodos: string | null;
  unidades: ReciboPdfUnidad[];
  fechaPago: Date;
}

export function ReciboDocument({ data }: { data: ReciboPdfData }) {
  const periodosLegibles = formatearPeriodosLegible(data.detallePeriodos);
  const esReimpresion = data.reimpresiones > 1;

  return (
    <Document title={`Recibo ${data.serie} N° ${data.numero}`}>
      <Page size="A5" style={styles.page}>
        <View style={styles.marco}>
          <View style={styles.headerRow}>
            <View style={styles.logoBox}>
              <LogoOndas />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.nombreAsociacion}>{data.condominio.nombre}</Text>
              {data.condominio.ruc && (
                <Text style={styles.ruc}>RUC N° {data.condominio.ruc}</Text>
              )}
            </View>
          </View>

          <View style={styles.tituloRecibo}>
            <Text style={styles.numeroRecibo}>
              Recibo de {data.serie === "CAJA" ? "Caja" : "Ingresos Varios"} N° {data.numero}
            </Text>
            <Text style={styles.fechaRecibo}>
              De {mesTexto(data.fechaPago)} {data.fechaPago.getUTCFullYear()}
            </Text>
          </View>

          <View style={styles.importeBox}>
            <Text style={styles.importeLabel}>Importe recibido</Text>
            <Text style={styles.importeValor}>
              S/ {data.importe.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Recibimos de:</Text>
            <Text style={styles.valor}>{data.recibimosDe}</Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Por concepto de:</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.conceptoTexto}>{data.concepto}</Text>
              {periodosLegibles && (
                <Text style={[styles.conceptoTexto, { fontWeight: 700, marginTop: 2 }]}>
                  {periodosLegibles}
                </Text>
              )}
            </View>
          </View>

          {data.unidades.length > 0 && (
            <View style={styles.fila}>
              <Text style={styles.etiqueta}>Manzana y Lote:</Text>
              <Text style={styles.valor}>
                {data.unidades
                  .map((u) => `${u.manzana} ${u.lote} (${u.sectorNombre})`)
                  .join("  ·  ")}
              </Text>
            </View>
          )}

          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Recibido el:</Text>
            <Text style={styles.valor}>
              {data.fechaPago.getUTCDate()} de {mesTexto(data.fechaPago)}{" "}
              {data.fechaPago.getUTCFullYear()}
            </Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Fecha de emisión:</Text>
            <Text style={styles.valor}>{fechaCorta(data.emitidoAt)}</Text>
          </View>

          <Text style={styles.footer}>
            Documento generado por el sistema de administración de Muelle Azul
          </Text>
          {esReimpresion && (
            <Text style={styles.reimpreso}>
              ⚠ Documento reimpreso ({data.reimpresiones}ª vez)
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
