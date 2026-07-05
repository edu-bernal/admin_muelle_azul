# Migración de Datos — Carpeta `Tablas/`

**Versión:** 1.1 · **Fecha:** 05/07/2026

Análisis de los archivos Excel reales de la administración (carpeta `Tablas/`) y plan de migración hacia el modelo de datos del sistema. Este documento **reemplaza y detalla** la sección 9 del [Modelo de Datos](03-MODELO-DE-DATOS.md).

## Estado de la migración

| Etapa | Estado |
|---|---|
| **Padrón (propietarios + unidades + titularidad)** | ✅ **Cargado en producción** (05/07/2026) vía `prisma/import/import-maestro-entes.ts`, desde `Maestro ENTES.xlsx`. Resultado: 424 unidades (MA_C 217, MA_A 149, MA_O 31, MA_N 27), 556 propietarios únicos, 633 titularidades, 9 unidades sin propietario registrado en el Excel (pendientes de saneamiento) |
| Cargos históricos (2021→corte) | Pendiente — requiere confirmar la tabla de tarifas por año (pregunta abierta §6) |
| Pagos históricos + recibos | Pendiente — depende de los cargos históricos |
| Egresos 2026 + proveedores | Pendiente |
| Vigilancia por unidad | Pendiente |

### Cómo se ejecutó la carga del padrón

```bash
# 1. Exportar la hoja "Padron ordenado" de Maestro ENTES.xlsx a CSV (separador ;)
# 2. Dry-run (solo reporta, no escribe nada):
tsx prisma/import/import-maestro-entes.ts <ruta-csv>
# 3. Aplicar (borra los datos demo de Propietario/Unidad/Titularidad/Cargo/Pago
#    preexistentes y carga el padrón real):
tsx prisma/import/import-maestro-entes.ts <ruta-csv> --apply
```

El script (en `prisma/import/import-maestro-entes.ts`, versionado en el repo — **sin datos reales**, el CSV nunca se commitea) hace lo siguiente:
- Parsea el CSV con un parser consciente de comillas y saltos de línea embebidos.
- Toma solo filas `TIPO ENTE = PROP` (excluye administrador y proveedor del maestro).
- Construye `codigo = SECTOR-M&L` y separa manzana/lote por el primer `_`.
- Determina el titular: propietario 1 si existe; si no, propietario 2. Si ambos existen, crea dos `PropiedadTitularidad` (50%/50%, responsable de pago = propietario 1).
- Deduplica propietarios por nombre normalizado (mismo dueño en varios lotes → un solo registro).
- Marca `TERRENO` las unidades confirmadas en la hoja Seguridad (A-23, J-2, J-1); el resto queda `CASA` (valor por defecto).
- Limpia los correos/teléfonos múltiples separados por `;`, `,` o `/`.

---

## 1. Inventario de archivos fuente

| Archivo | Contenido | Rol en la migración |
|---|---|---|
| `PADRON DEL CONDOMINIO 2026.xlsx` | Padrón completo (428 filas × 100 cols) con matriz de abonos Abr 2021–Dic 2026; 12 hojas mensuales de pagos detallados; 12 hojas "I y G" (ingresos y gastos diarios); Balance 2026; Seguridad; plantillas de Recibo | **Fuente principal** (es la versión viva) |
| `Maestro ENTES y PAGOS.xlsx` | Misma estructura que el anterior (copia de trabajo) | Contraste / respaldo |
| `Maestro ENTES.xlsx` | Padrón simplificado (429 × 16): tipo de ente, sector, M&L, propietarios 1 y 2, correos, teléfonos, **canal de envío preferido** | **Fuente de datos de contacto** |
| `Padron general con abonos desde Abril 2021.xlsx` | Matriz histórica de abonos por lote, Abr 2021–2026 (425 × 92) | **Fuente de historia de pagos** (verificación cruzada) |
| `2023 PADRON DEL CONDOMINIO AL 15 ENE.xlsx` | Versión 2023 del mismo esquema | Solo referencia histórica; no se migra |

## 2. Hallazgos sobre la operación real (impactan el diseño)

1. **Estructura física**: los lotes se identifican por **Sector + Manzana + Lote** (ej. `MA_C / J_2`). Sectores reales y conteo de lotes:
   | Código | Sector | Lotes |
   |---|---|---|
   | MA_C | MA Central (Muelle Azul 1) | 217 |
   | MA_A | MA Ampliación | 149 |
   | MA_O | MA Oeste | 31 |
   | MA_N | MA Norte | 27 |
   | | **Total** | **424** |
2. **Tipo de propiedad**: `Casa` o `Terreno sin construir` (columna explícita en el padrón y en la hoja Seguridad). No hay departamentos ni cocheras/depósitos independientes.
3. **Entidad jurídica**: *Asociación de Propietarios del Condominio Residencial de Playa Muelle Azul*, **RUC 20610523677** (aparece en el recibo de caja).
4. **Cuota de mantenimiento**: S/ 100/mes en 2021–2024; **S/ 150/mes** vigente (importes más frecuentes 2026: 150, 300, 1,800 = 12 meses). Hay pagos parciales (recibos de S/ 50 por "saldo" de un mes).
5. **Recibos de caja correlativos**: numeración continua global (ej. recibo 628–798), con marca `ok` / `Reimpreso`. Hay series separadas para "Recibo varios" (otros conceptos). → el sistema debe emitir recibos numerados y soportar reimpresión.
6. **El pago se aplica a meses específicos**: la columna "Mes de Mantenimiento" registra en texto libre a qué períodos corresponde el abono ("Nov, dic 2024", "Ene…dic", "2026: Mayo Saldo"). Los propietarios pagan meses atrasados de años anteriores, varios meses juntos o el año adelantado. → confirma el modelo cargo–pago–aplicación con pagos multi-período y parciales.
7. **Medios de pago reales**: transferencia/depósito **BBVA** (~85%), **Yape**, efectivo.
8. **Conceptos de cobro adicionales detectados**: Cuota de Constitución (2021), aporte de Navidad, **Cuota Extraordinaria Oleaje** (2025), **Cuota Extraordinaria Obligatoria por Desastre**, almuerzos/actividades ("Almuerzo", "Platos"), ventas varias.
9. **Campaña "Ponte al Día"** (2023): beneficio de regularización — columnas "Saldo para acogerse al beneficio" (S/ 300 casas con abonos / S/ 1,500 terrenos sin abonos), "Abono de Campaña", "Saldo de Campaña". → el sistema debe soportar campañas de condonación/regularización con saldos negociados.
10. **Vigilancia por propiedad** (hoja Seguridad): servicio opcional mensual de "propiedad vigilada" por casa o terreno, con estado de pago propio, en las áreas Muelle Azul 1, Muelle Azul 2 y MA Oeste. Típico de condominio de playa (casas vacías fuera de temporada). → servicio opcional facturable por unidad.
11. **Gastos reales registrados** (hojas I y G): mantenimiento integral tercerizado ("La Planicie" ~S/ 10,400/mes), **salvavidas por día en temporada** (S/ 150–180/atención, fines de semana de verano), compras (Sodimac), luminarias. → proveedores con pagos por servicio recurrente y por jornada/temporada.
12. **Control por zona**: la administración reporta "% de participación en el pago por zona" (en Ene 2026: solo ~12% de 424 vecinos aportó en el mes). → reporte de recaudación por sector y alta morosidad estructural: la migración de deuda histórica es crítica.
13. **Balance mensual**: saldo que viene del mes anterior + cuotas + extraordinarias + ventas varias + otros ingresos − salidas = resultado. Coincide con la vista de flujo de caja diseñada.

## 3. Problemas de calidad de datos detectados

| # | Problema | Ejemplo | Tratamiento en la importación |
|---|---|---|---|
| 1 | Propietarios sin nombre (solo cónyuge o vacío) | filas donde solo hay nombre en la columna PROPIETARIO 2 | Si P1 vacío y P2 existe → P2 pasa a titular; si ambos vacíos → unidad sin titular (queda pendiente de saneamiento, no bloquea) |
| 2 | Mismo propietario con varios lotes duplicado como filas | un mismo titular repetido en dos lotes contiguos | Deduplicar por nombre normalizado + teléfono/correo → un `propietario`, dos titularidades |
| 3 | Sin documento de identidad en ninguna fuente | — | `numero_documento` queda null; el sistema lo pedirá al activar la cuenta del propietario (campo obligatorio diferido) |
| 4 | Varios correos en una celda | "quisqui777@…; elmerzelada1@…" | Separar: 1.º → email principal, resto → email secundario |
| 5 | Teléfonos múltiples y con texto | "944970397 / 950963726" | Guardar ambos (principal/secundario), normalizar dígitos |
| 6 | Valores basura en columnas | TIPO ENTE = "999118190…", SECTOR = "#N/D", "correo" | Reporte de observaciones; fila se importa solo si tiene Sector+M&L válidos |
| 7 | "Mes de Mantenimiento" en texto libre | "2025: Noviembre.", "Ene, feb…dic" | Parser de períodos con diccionario ES + revisión manual asistida de los no parseables (pantalla de conciliación) |
| 8 | Importes con formato texto | "1,800", "S/ 400" | Normalización numérica |
| 9 | El maestro mezcla entes | TIPO ENTE: PROP (425), ADM (1), PROV (1) | PROP → propietarios; ADM → usuario administrador; PROV → tabla proveedores |
| 10 | Hojas con filas fantasma (1M filas usadas) | archivo 2023 | Se leen solo filas con datos reales |

## 4. Mapeo fuente → modelo de datos

### 4.1 Padrón (`Maestro ENTES` + `PADRON 2026 / Padron ordenado`)

| Columna fuente | Destino |
|---|---|
| SECTOR (MA_C/MA_A/MA_O/MA_N) | `unidad.sector` (catálogo `sector`) |
| M&L (ej. `J_2`) | `unidad.manzana` = "J", `unidad.lote` = "2"; `unidad.codigo` = "MA_C-J_2" |
| Casa o Terreno sin Construir | `unidad.tipo` = CASA \| TERRENO |
| PROPIETARIO 1 | `propietario` titular + `propiedad_titularidad` (responsable de pago) |
| PROPIETARIO 2 | segundo `propietario` + titularidad como copropietario (sin responsabilidad de pago) |
| CORREO ELECTRONICO / 2 | `propietario.email` / `email_secundario` |
| TELEFONO / 2 | `propietario.telefono` / `telefono_secundario` |
| Envio (Correo \| WhatsApp) | `propietario.canal_envio_preferido` |

### 4.2 Historia de pagos (matriz Abr 2021–Dic 2026 + hojas mensuales)

Estrategia en dos capas:

1. **Cargos históricos**: se emiten cargos `MANT` por unidad y mes desde **abril 2021** hasta el mes de corte, con la tarifa vigente de cada año (2021–2024: S/ 100; 2025+: S/ 150 — confirmar tabla de tarifas por año con la administración). Cargos extraordinarios (Oleaje, Desastre, Constitución) según las columnas correspondientes.
2. **Pagos históricos**:
   - **2021–2025**: desde la matriz del padrón — un pago consolidado por celda (unidad × mes de abono) aplicado al período que indica la columna. Sin recibo ni medio (se marcan `medio = MIGRACION`).
   - **2026**: desde las hojas mensuales detalladas (Ene–Dic), que sí tienen recibo, fecha, medio (BBVA/Yape/Efectivo) e indicación de períodos aplicados → se crean `pago` + `recibo_caja` + `aplicacion_pago` reales. Los textos de período no parseables van a una **bandeja de conciliación manual**.
3. **Cuadre**: al final, `saldo por unidad` del sistema vs. columna "Saldo por Pagar" del Excel → reporte de diferencias para validación de la administración antes del go-live. La campaña Ponte al Día se migra como ajuste/condonación auditada sobre los cargos previos a Set 2023 para las unidades acogidas.

### 4.3 Egresos (hojas `* I y G` + Balance)

| Fuente | Destino |
|---|---|
| Bloque "Gastos por mes" (fecha, proveedor, detalle, monto) | `proveedor` (deduplicado) + `factura_proveedor`/`egreso` con partida |
| Bloque "Ingresos" diarios | ya cubierto por pagos (no se duplica); ingresos no-cuota → `ingreso_vario` |
| Balance 2026 | solo verificación de cuadre (no se migra: el sistema lo recalcula) |

### 4.4 Vigilancia (hoja `Seguridad`)

| Fuente | Destino |
|---|---|
| Fila (mes, tipo, propietario, área, Mz, lote, estado) | `servicio_unidad` (tipo VIGILANCIA) por unidad + cargo mensual del servicio con estado pagado |

## 5. Proceso de importación

```
Excel fuente ──► normalizador (scripts/import/)
                 ├─ 1. validar y reportar observaciones (Excel de errores)
                 ├─ 2. cargar catálogos (sectores, tarifas por año, conceptos)
                 ├─ 3. propietarios + unidades + titularidades   (idempotente)
                 ├─ 4. cargos históricos 2021→corte              (idempotente)
                 ├─ 5. pagos históricos + aplicaciones + recibos
                 ├─ 6. egresos 2026 + proveedores
                 ├─ 7. vigilancia por unidad
                 └─ 8. reporte de cuadre: saldo sistema vs. "Saldo por Pagar" Excel
```

- Todo corre en transacción por paso, re-ejecutable (upsert por claves naturales: `unidad.codigo`, correlativo de recibo, (unidad, concepto, período)).
- La numeración de recibos del sistema **continúa el correlativo actual** (≥ 799).
- Validación final firmada por la administración: listado de saldos por unidad a la fecha de corte.

## 6. Preguntas abiertas para la administración

1. Tabla exacta de tarifas por año/sector (¿la cuota fue S/ 100 hasta 2024 y S/ 150 desde 2025 en todos los sectores?).
2. ¿La deuda de terrenos sin construir se cobra igual que casas? (la campaña 2023 sugiere trato distinto).
3. ¿Qué deudas previas a la campaña Ponte al Día se consideran condonadas para quienes se acogieron?
4. Precio y condiciones del servicio de vigilancia por propiedad (¿tarifa mensual fija?, ¿difiere casa/terreno?).
5. ¿Se sigue cobrando aporte de Navidad y actividades (almuerzos) como conceptos regulares?
6. Documentos de identidad de los propietarios (no existen en los Excel; se recolectarán al activar cuentas).
