# Arquitectura del Módulo de Business Intelligence (Insight360 BI)

El módulo de Análisis BI (`analisis_bi.html` y `analisis_bi.js`) ha evolucionado de ser un simple visualizador de gráficos estáticos a un potente **Motor Analítico de Inteligencia de Negocios** que opera íntegramente en el frontend (navegador del usuario). 

A continuación se detalla la arquitectura de las tres capas analíticas que potencian Insight360.

---

## 1. Analítica Descriptiva (Reporting Visual)
La base del dashboard. Se encarga de responder a la pregunta: **¿Qué está pasando?**

*   **Ingesta Dinámica:** Utiliza la librería SheetJS para parsear en tiempo real archivos Excel (`.xlsx`, `.xls`, `.csv`) cargados por el usuario, transformándolos en arrays de objetos JSON manejables por Javascript.
*   **Agnosticismo de Columnas:** El sistema no depende de esquemas fijos. Lee las cabeceras del archivo y puebla dinámicamente los selectores de "Eje X" (categorías) y "Eje Y" (métricas numéricas).
*   **Filtro Global Inteligente:** Permite seleccionar una columna cualquiera (ej. "Mes" o "Región") y luego filtra todo el dataset por un valor específico antes de graficar.
*   **Renderizado:** Utiliza **Chart.js v4** para levantar gráficos hiper-optimizados (Líneas de tiempo, Barras de distribución, Donuts de Pareto y un Medidor de Rendimiento/Gauge customizado).

## 2. Analítica Predictiva (Forecast)
El siguiente paso analítico. Responde a la pregunta: **¿Qué va a pasar?**

*   **Machine Learning en el Navegador:** El sistema cuenta con un algoritmo de **Regresión Lineal Simple** programado en Vanilla JS (`_calculateLinearRegression`).
*   **Proyección de Tendencias:** Si el motor detecta que el usuario está graficando una serie temporal (ej. los valores del Eje X son secuenciales numéricos o meses cronológicos) y existen más de 2 puntos de datos históricos, el algoritmo calcula la Pendiente (*Slope*) y el Intercepto.
*   **Visualización Futurista:** Chart.js plotea una segunda línea adyacente (en formato punteado verde) que avanza 2 períodos en el futuro sobre el gráfico principal (`main-line`), ilustrando el crecimiento o caída inminente.

## 3. Analítica Prescriptiva (Smart AI Insights)
El pináculo del BI moderno. Responde a la pregunta: **¿Qué debo hacer al respecto?**

A diferencia de los BI tradicionales que dejan la interpretación al usuario, Insight360 integra **Plantillas Estratégicas** que contextualizan los datos y dictaminan sugerencias de negocio de forma automática en una alerta global.

*   **Plantillas Específicas:** El usuario puede setear el entorno a "Ventas", "Inventario" o "RRHH". Al hacerlo, el sistema auto-seleccionará heurísticamente las columnas ideales (buscando la palabra "ingreso", "fecha", "bodega", etc.).
*   **Heurísticas de Comportamiento:**
    *   **Regla de Concentración (Pareto):** Si el motor detecta que un solo nodo representa más del 40% del total acumulado (Top Share), disparará una alerta (*Ej. en Ventas: "Alta Concentración de Ingresos - Diversifica rotación en productos B"*).
    *   **Regla de Desaceleración:** Si el motor predictivo detecta un *slope* negativo, cruzará esa caída con el contexto de la Plantilla (*Ej. en RRHH: "Riesgo en Capital Humano - Sugerencia: Encuesta de clima laboral inmediata"*).
*   **Anotaciones Embebidas:** Cada gráfico cuenta con su propio micro-insight procesado, resaltando máximos históricos o indicando "salud" matemática sin que el usuario tenga que hojear los datos a mano.

---

### Flujo de Ejecución (Ciclo de Vida)

1.  **Carga (Upload):** `SheetJS` procesa el Excel/CSV y lo almacena localmente.
2.  **Contextualización:** Usuario selecciona `Plantilla (Ventas)` -> JS pre-selecciona Columnas.
3.  **Filtrado (Opcional):** Se aplica `array.filter()` global.
4.  **Agrupación (Reduce):** JS comprime miles de filas en agregaciones (`SUM`, `AVG`, `COUNT`).
5.  **Predicción:** Se calcula Regresión Lineal sobre el Array agrupado.
6.  **Prescripción:** Se evalúan las varianzas (Trend y Concentración) lanzando Alertas.
7.  **Render (Paint):** Se levantan los Canvases de Chart.js y las métricas KPI.
