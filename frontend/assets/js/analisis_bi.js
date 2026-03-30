/**
 * analisis_bi.js – Módulo de Análisis BI Dinámico · Insight360
 * ================================================================
 * Secciones:
 *  1. Configuración global Chart.js
 *  2. Gráficos estáticos de referencia (sin cambios visuales)
 *  3. Panel de análisis dinámico:
 *     - Carga de datasets disponibles
 *     - Carga de columnas al seleccionar dataset
 *     - Generación de gráfico principal con Chart.js
 *     - Tarjetas KPI (SUM / AVG / COUNT) en tiempo real
 *     - Tabla preview de las primeras 10 filas
 */

document.addEventListener('DOMContentLoaded', function () {

    // ── Paleta de colores corporativa ─────────────────────────────────────
    const PALETTE = [
        '#1b7cf3', '#1a3a5f', '#36a2eb', '#4bc0c0',
        '#ff6384', '#ff9f40', '#9966ff', '#22c55e',
        '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    ];

    // ── 1. Chart.js – defaults globales ───────────────────────────────────
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color       = '#4a5568';

    // ── Panel de Análisis Dinámico ─────────────────────────────────────
    _initDynamicAnalysis();

    // ═══════════════════════════════════════════════════════════════════════
    //  ANÁLISIS DINÁMICO
    // ═══════════════════════════════════════════════════════════════════════
    function _initDynamicAnalysis() {

        // ── 3a. Selectores del modal de KPI (mantiene funcionalidad original) ──
        const selectDataset = document.getElementById('kpi-dataset');
        const selectColumna = document.getElementById('kpi-columna');
        let datasetsCache   = [];

        async function cargarDatasetsDisponibles() {
            if (!selectDataset) return;
            try {
                const result = await API.get('/api/datasets');
                if (result?.status === 'success' && result.data.length > 0) {
                    datasetsCache = result.data;
                    selectDataset.innerHTML = '<option value="" disabled selected>-- Elige un dataset --</option>';
                    result.data.forEach(ds => {
                        const opt = document.createElement('option');
                        opt.value = ds.filename;
                        opt.textContent = ds.filename;
                        selectDataset.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error('[BI] Error cargando datasets:', err);
            }
        }

        if (selectDataset) {
            selectDataset.addEventListener('change', async function () {
                const filename = this.value;
                if (!filename) return;

                const ds = datasetsCache.find(d => d.filename === filename);

                if (selectColumna) {
                    selectColumna.innerHTML = '<option disabled selected>Cargando columnas...</option>';
                    try {
                        const result = await API.get(`/api/datasets/${filename}/columns`);
                        if (result?.status === 'success') {
                            selectColumna.innerHTML = '';
                            result.data.forEach(col => {
                                const opt = document.createElement('option');
                                const isNum = col.is_numeric || col.type === 'numeric' || ['int64', 'float64', 'int32', 'float32'].includes(col.type);
                                opt.value = col.name;
                                opt.textContent = `${col.name} ${isNum ? '(numérico)' : '('+col.type+')'}`;
                                opt.dataset.isNum = isNum;
                                selectColumna.appendChild(opt);
                            });
                        }
                    } catch {
                        Swal.fire('Error', 'No se pudieron cargar las columnas del dataset', 'error');
                    }
                }
            });
        }

        // ── 3b. Botón "Crear KPI" del modal ──
        const btnCrearKpi = document.getElementById('btn-crear-kpi');
        if (btnCrearKpi) {
            btnCrearKpi.addEventListener('click', async function (e) {
                e.preventDefault();
                const nombre  = document.getElementById('kpi-nombre').value;
                const aggr    = document.getElementById('kpi-agregacion').value;
                const dataset = document.getElementById('kpi-dataset').value;
                const colSel  = document.getElementById('kpi-columna');
                const columna = colSel.value;

                if (!nombre || !columna || !dataset) {
                    Swal.fire({ icon: 'error', title: 'Falta información', text: 'Debes completar el nombre, el dataset y la columna.', confirmButtonColor: '#1b7cf3' });
                    return;
                }

                const optSeleccionada = colSel.options[colSel.selectedIndex];
                const isNum = optSeleccionada ? optSeleccionada.dataset.isNum === 'true' : false;

                if ((aggr === 'sum' || aggr === 'avg') && !isNum) {
                    Swal.fire({ icon: 'warning', title: 'Tipo de dato', text: 'No puedes sumar o promediar una columna no numérica. Usa COUNT (Conteo) o cambia de columna.', confirmButtonColor: '#1b7cf3' });
                    return;
                }

                const modalEl = document.getElementById('kpiModal');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();

                Swal.fire({
                    title: 'Procesando Métrica',
                    html: `Calculando <b>${aggr.toUpperCase()}</b> en <b>${columna}</b>...`,
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); },
                });

                try {
                    const result = await API.get(`/api/datasets/${dataset}/data`);
                    const rows = result.data || result;
                    let finalValue = 0;

                    if (rows && rows.length > 0) {
                        if (aggr === 'count') {
                            finalValue = rows.filter(r => r[columna] !== null && r[columna] !== undefined && r[columna] !== '').length;
                        } else {
                            const vals = rows.map(r => parseFloat(r[columna])).filter(v => !isNaN(v));
                            if (vals.length > 0) {
                                if (aggr === 'sum') finalValue = vals.reduce((a, b) => a + b, 0);
                                else if (aggr === 'avg') finalValue = vals.reduce((a, b) => a + b, 0) / vals.length;
                            }
                        }
                    }

                    const isMoneyOptions = ['monto', 'precio', 'ingreso', 'revenue', 'costo', 'total', 'saldo', 'valor', 'gasto', 'venta'];
                    const isMoney = isMoneyOptions.some(kw => nombre.toLowerCase().includes(kw) || columna.toLowerCase().includes(kw));

                    let displayVal = finalValue.toLocaleString('es-CL', { maximumFractionDigits: 2 });
                    if (isMoney && (aggr === 'sum' || aggr === 'avg')) {
                        if (finalValue >= 1000000) {
                            displayVal = '$' + (finalValue/1000000).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + 'M';
                        } else if (finalValue >= 1000) {
                            displayVal = '$' + (finalValue/1000).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + 'k';
                        } else {
                            displayVal = '$' + finalValue.toLocaleString('es-CL', { maximumFractionDigits: 2 });
                        }
                    } else if (aggr === 'avg' || aggr === 'sum') {
                        if (finalValue >= 1000000) displayVal = (finalValue/1000000).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + 'M';
                        else if (finalValue >= 1000) displayVal = (finalValue/1000).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + 'k';
                    }

                    const kpiRow      = document.getElementById('kpi-cards-row');
                    const cardCreator = document.getElementById('kpi-card-creator');
                    if (kpiRow && cardCreator) {
                        const newCol = document.createElement('div');
                        newCol.className = 'col-md-3 col-sm-6';
                        newCol.innerHTML = `
                            <div class="card card-kpi h-100 border-primary border-bottom-0 border-end-0 border-start-0 border-4">
                                <div class="card-body">
                                    <h6 class="text-muted fw-semibold text-uppercase text-truncate" style="font-size:0.8rem;letter-spacing:0.5px" title="${nombre}">${nombre}</h6>
                                    <h3 class="fw-bold text-dark mb-0">${displayVal} <small class="text-success fs-6"><i class="fas fa-check-circle"></i> Listo</small></h3>
                                    <small class="text-muted text-truncate d-block" style="font-size:0.70rem" title="DS: ${dataset} | Col: ${columna} | Agg: ${aggr.toUpperCase()}">Dataset: ${dataset} | Col: ${columna}</small>
                                </div>
                            </div>`;
                        kpiRow.insertBefore(newCol, cardCreator);
                    }
                    Swal.fire({ title: '¡Métrica Calculada!', text: `El KPI "${nombre}" se ha generado a partir del dataset ${dataset}.`, icon: 'success', timer: 2000, showConfirmButton: false });
                    document.getElementById('kpi-nombre').value = '';

                } catch (err) {
                    Swal.fire('Error', 'No se pudieron calcular los datos: ' + err.message, 'error');
                }
            });
        }

        cargarDatasetsDisponibles();

        // ── 3c. Panel de análisis dinámico ────────────────────────────────
        const biDataset   = document.getElementById('bi-dataset');
        const biAxisX     = document.getElementById('bi-axis-x');
        const biAxisY     = document.getElementById('bi-axis-y');
        const biAgg       = document.getElementById('bi-aggregation');
        const biChartType = document.getElementById('bi-chart-type');
        const btnGenerar  = document.getElementById('btn-generar-bi');

        if (!biDataset) return; // El panel no está presente en la página

        // Instancia global de Chart para poder destruirla antes de re-renderizar
        window._biMainChart = null;

        // ── Cargar datasets en el selector del panel ──
        async function loadBiDatasets() {
            try {
                const result = await API.get('/api/datasets');
                if (result?.status === 'success' && result.data.length > 0) {
                    biDataset.innerHTML = '<option value="" disabled selected>-- Selecciona un dataset --</option>';
                    result.data.forEach(ds => {
                        const opt  = document.createElement('option');
                        opt.value  = ds.filename;
                        opt.textContent = `${ds.filename}${ds.rows ? ` · ${Number(ds.rows).toLocaleString('es-CL')} filas` : ''}`;
                        biDataset.appendChild(opt);
                    });

                    // Auto-seleccionar si viene desde carga_datos con ?dataset=…
                    const params    = new URLSearchParams(window.location.search);
                    const preselect = params.get('dataset');
                    if (preselect && [...biDataset.options].some(o => o.value === preselect)) {
                        biDataset.value = preselect;
                        biDataset.dispatchEvent(new Event('change'));
                    }
                } else {
                    biDataset.innerHTML = '<option value="" disabled selected>No hay datasets disponibles. Sube un archivo primero.</option>';
                }
            } catch (err) {
                console.error('[BI Panel] Error cargando datasets:', err);
            }
        }

        // ── Cargar columnas al cambiar dataset ──
        biDataset.addEventListener('change', async function () {
            const filename = this.value;
            if (!filename) return;

            // Reset UI
            biAxisX.innerHTML  = '<option disabled selected>Cargando columnas...</option>';
            biAxisY.innerHTML  = '<option disabled selected>Cargando columnas...</option>';
            biAxisX.disabled   = true;
            biAxisY.disabled   = true;
            btnGenerar.disabled = true;

            // Ocultar sección previa de resultado
            document.getElementById('bi-main-wrapper').classList.add('d-none');

            try {
                const result = await API.get(`/api/datasets/${filename}/columns`);
                if (!result?.data) throw new Error('Sin columnas');

                const cols        = result.data;
                const numericCols = cols.filter(c => c.is_numeric || c.type === 'numeric' ||
                    ['int64','float64','int32','float32'].includes(c.type));
                const catCols     = cols.filter(c => !numericCols.includes(c));
                const dateCols    = cols.filter(c =>
                    ['fecha','date','año','mes','year','month','periodo','period'].some(kw =>
                        c.name.toLowerCase().includes(kw)) || c.type === 'datetime'
                );

                // ── Poblar selectores X e Y ──
                biAxisX.innerHTML = '<option value="" disabled selected>-- Eje X (categorías) --</option>';
                [...catCols, ...numericCols].forEach(col => {
                    const opt = document.createElement('option');
                    opt.value = col.name; opt.textContent = col.name;
                    biAxisX.appendChild(opt);
                });

                biAxisY.innerHTML = '<option value="" disabled selected>-- Eje Y (métrica numérica) --</option>';
                [...numericCols, ...catCols].forEach(col => {
                    const opt = document.createElement('option');
                    opt.value = col.name;
                    opt.textContent = numericCols.includes(col) ? `${col.name} (numérico)` : col.name;
                    biAxisY.appendChild(opt);
                });

                biAxisX.disabled   = false;
                biAxisY.disabled   = false;
                btnGenerar.disabled = false;

                // Auto-seleccionar primeras opciones sensibles
                if (biAxisX.options.length > 1) biAxisX.selectedIndex = 1;
                if (biAxisY.options.length > 1) {
                    const firstNum = [...biAxisY.options].findIndex(o => o.textContent.includes('numérico'));
                    biAxisY.selectedIndex = firstNum > 0 ? firstNum : 1;
                }

                // ── Renderizar chips de columnas ──
                _renderColumnCards(cols);

                // ── Registrar botones de tipo de análisis ──
                _setupAnalysisButtons(cols, numericCols, catCols, dateCols);

                // ── Cargar preview de datos inmediatamente ──
                try {
                    const dataResult = await API.get(`/api/datasets/${filename}/data`);
                    if (dataResult?.data?.length) {
                        _renderPreviewTable(dataResult.data.slice(0, 10));
                        document.getElementById('bi-preview-wrapper').classList.remove('d-none');
                    }
                } catch (previewErr) {
                    console.warn('[BI Panel] No se pudo cargar la vista previa:', previewErr);
                }

                // Mostrar panel de columnas y tipos
                document.getElementById('bi-columns-wrapper').classList.remove('d-none');

            } catch (err) {
                biAxisX.innerHTML = '<option>Error cargando columnas</option>';
                biAxisY.innerHTML = '<option>Error cargando columnas</option>';
                console.error('[BI Panel] Error cargando columnas:', err);
            }
        });

        // ── Generar gráfico ──
        btnGenerar.addEventListener('click', async function () {
            const filename  = biDataset.value;
            const xCol      = biAxisX.value;
            const yCol      = biAxisY.value;
            const aggFunc   = biAgg.value;
            const chartType = biChartType.value;

            if (!filename || !xCol || !yCol) {
                Swal.fire({ icon: 'warning', title: 'Selección incompleta', text: 'Debes elegir un dataset, la variable X y la variable Y.', confirmButtonColor: '#1b7cf3' });
                return;
            }

            // Estado de carga del botón
            const originalHtml = this.innerHTML;
            this.innerHTML  = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Analizando...';
            this.disabled   = true;

            try {
                const result = await API.get(`/api/datasets/${filename}/data`);
                if (!result) throw new Error('Sin respuesta del servidor');

                const rows = result.data || result;
                if (!rows || rows.length === 0) throw new Error('El dataset no contiene datos');

                // Agregar datos
                const { labels, values } = _aggregateData(rows, xCol, yCol, aggFunc);

                // Mostrar paneles
                document.getElementById('bi-main-wrapper').classList.remove('d-none');
                document.getElementById('bi-preview-wrapper').classList.remove('d-none');

                // Actualizar cabecera
                const aggLabels = { sum: 'Suma', avg: 'Promedio', count: 'Conteo' };
                document.getElementById('bi-chart-title').textContent =
                    `${aggLabels[aggFunc] || aggFunc} de "${yCol}" por "${xCol}"`;
                document.getElementById('bi-badge-dataset').textContent = filename;
                document.getElementById('bi-badge-rows').textContent =
                    `${rows.length.toLocaleString('es-CL')} registros`;

                // Renderizar gráfico, stats y tabla preview
                _renderMainChart(labels, values, chartType, yCol, aggFunc);
                _updateKpiStats(rows, yCol);
                _renderPreviewTable(rows.slice(0, 10));

                // Scroll suave hacia el gráfico
                document.getElementById('bi-main-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });

            } catch (err) {
                console.error('[BI Panel] Error generando gráfico:', err);
                Swal.fire('Error al cargar datos', err.message || 'Verifica que el dataset esté disponible.', 'error');
            } finally {
                this.innerHTML = originalHtml;
                this.disabled  = false;
            }
        });

        // Escuchar cuando se complete un nuevo análisis SSE (dataset recién subido)
        window.addEventListener('sse:analisis_completado', async () => {
            await loadBiDatasets();
        });

        // Configurar exportación a PDF
        const btnPdf = document.getElementById('btn-descargar-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', () => {
                const element = document.getElementById('bi-main-wrapper');
                const opt = {
                    margin:       0.5,
                    filename:     `Reporte_BI_${new Date().getTime()}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
                };

                // Cambiar estado visual del botón
                const originalHtml = btnPdf.innerHTML;
                btnPdf.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> PDF...';
                btnPdf.disabled = true;

                html2pdf().set(opt).from(element).save().then(() => {
                    btnPdf.innerHTML = originalHtml;
                    btnPdf.disabled = false;
                });
            });
        }

        loadBiDatasets();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  UTILIDADES DE DATOS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Agrupa filas por xCol y aplica aggFunc sobre yCol.
     * Devuelve hasta 20 categorías ordenadas de mayor a menor.
     */
    function _aggregateData(rows, xCol, yCol, aggFunc) {
        const grouped = {};

        rows.forEach(row => {
            const key = String(row[xCol] ?? 'N/A').trim() || 'N/A';
            if (!grouped[key]) grouped[key] = [];
            const val = parseFloat(row[yCol]);
            if (!isNaN(val)) grouped[key].push(val);
        });

        const entries = Object.entries(grouped)
            .map(([key, arr]) => {
                let val = 0;
                if (arr.length > 0) {
                    if (aggFunc === 'sum')      val = arr.reduce((a, b) => a + b, 0);
                    else if (aggFunc === 'avg') val = arr.reduce((a, b) => a + b, 0) / arr.length;
                    else if (aggFunc === 'max') val = Math.max(...arr);
                    else if (aggFunc === 'min') val = Math.min(...arr);
                    else if (aggFunc === 'median') {
                        const sorted = [...arr].sort((a, b) => a - b);
                        const mid = Math.floor(sorted.length / 2);
                        val = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                    }
                    else if (aggFunc === 'mode') {
                        const freqs = {};
                        arr.forEach(v => freqs[v] = (freqs[v] || 0) + 1);
                        val = parseFloat(Object.keys(freqs).reduce((a, b) => freqs[a] > freqs[b] ? a : b));
                    }
                    else if (aggFunc === 'variance') {
                        if (arr.length > 1) {
                            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
                            val = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
                        } else val = 0;
                    }
                    else                        val = arr.length; // count
                }
                return [key, parseFloat(val.toFixed(2))];
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30); // Mostrar hasta 30 categorías

        return {
            labels: entries.map(e => e[0]),
            values: entries.map(e => e[1]),
        };
    }

    /**
     * Renderiza (o actualiza) el gráfico dinámico principal.
     * Destruye la instancia anterior para evitar memory leaks.
     */
    function _renderMainChart(labels, values, chartType, yCol, aggFunc) {
        const canvas = document.getElementById('mainChart');
        if (!canvas) return;

        // Destruir instancia anterior
        if (window._biMainChart) {
            window._biMainChart.destroy();
            window._biMainChart = null;
        }

        const isHorizontal = chartType === 'horizontalBar';
        const isArea       = chartType === 'area';
        const isDoughnut   = chartType === 'doughnut';
        const isPie        = chartType === 'pie';
        const isPolar      = chartType === 'polarArea';
        const isRadar      = chartType === 'radar';
        
        const isCircular   = isDoughnut || isPie || isPolar;

        let actualType = chartType;
        if (isHorizontal) actualType = 'bar';
        if (isArea)       actualType = 'line';

        const mapLabels = { sum: 'Suma', avg: 'Promedio', count: 'Conteo', max: 'Máximo', min: 'Mínimo', median: 'Mediana', mode: 'Moda', variance: 'Varianza' };
        const aggLabel = mapLabels[aggFunc] || aggFunc;

        // Repetir paleta si hay más categorías que colores para circulares
        const repeatedPalette = Array.from({ length: Math.ceil(labels.length / PALETTE.length) }, () => PALETTE).flat();

        const bgColors = isCircular
            ? repeatedPalette.slice(0, labels.length)
            : (isArea || isRadar ? 'rgba(27,124,243,0.25)' : 'rgba(27,124,243,0.82)');

        const dataset = {
            label:           `${aggLabel} de ${yCol}`,
            data:            values,
            backgroundColor: bgColors,
            borderColor:     isCircular ? repeatedPalette.slice(0, labels.length) : '#1b7cf3',
            borderWidth:     (actualType === 'line' || isRadar) ? 2.5 : 1,
            borderRadius:    actualType === 'bar'  ? 6   : 0,
            fill:            isArea || isRadar,
            tension:         0.38,
            pointBackgroundColor: '#fff',
            pointBorderColor:    '#1b7cf3',
            pointRadius:     (actualType === 'line' || isRadar) ? 4 : 0,
            pointHoverRadius: (actualType === 'line' || isRadar) ? 6 : 0,
        };

        const trendValues = _calculateIntelligentInsights(labels, values, yCol);
        const datasetsArray = [dataset];

        if (trendValues && trendValues.length > 0 && !isCircular && !isRadar) {
            datasetsArray.push({
                type: 'line',
                label: 'Tendencia IA (Forecast)',
                data: trendValues,
                borderColor: '#d99500',
                borderWidth: 2,
                borderDash: [6, 4],
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0
            });
        }

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: isHorizontal ? 'y' : 'x',
            animation:  { duration: 700, easing: 'easeInOutQuart' },
            plugins: {
                legend: {
                    display:  isCircular || isRadar,
                    position: isHorizontal ? 'bottom' : 'right',
                    labels:   { usePointStyle: true, padding: 16, font: { size: 12 } },
                },
                tooltip: {
                    backgroundColor: 'rgba(26,58,95,0.92)',
                    padding:    12,
                    cornerRadius: 8,
                    titleFont:  { size: 13, weight: 'bold' },
                    bodyFont:   { size: 13 },
                    callbacks: {
                        label: ctx => {
                            let v = ctx.parsed; // defaultValue for circular/radar
                            if (ctx.parsed.y !== undefined && !isHorizontal) v = ctx.parsed.y;
                            if (ctx.parsed.x !== undefined && isHorizontal) v = ctx.parsed.x;
                            if (isPolar || isPie || isDoughnut) v = ctx.parsed;
                            if (isRadar) v = ctx.parsed.r;

                            return ` ${aggLabel}: ${Number(v).toLocaleString('es-CL', { maximumFractionDigits: 2 })}`;
                        },
                    },
                },
            },
            scales: (isCircular || isRadar) ? {} : {
                x: {
                    grid:  { display: isHorizontal, color: '#edf2f7', drawBorder: false },
                    ticks: { font: { size: 11 }, maxRotation: 40 },
                },
                y: {
                    beginAtZero: true,
                    grid:  { color: '#edf2f7', drawBorder: false },
                    ticks: {
                        font:     { size: 11 },
                        callback: v => Number(v).toLocaleString('es-CL'),
                    },
                },
            },
        };

        window._biMainChart = new Chart(canvas.getContext('2d'), {
            type:    actualType,
            data:    { labels, datasets: datasetsArray },
            options,
        });
    }

    /**
     * Motor IA (Demo): Genera Insights Descriptivos, Predictivos y Prescriptivos en base a Mínimos Cuadrados
     */
    function _calculateIntelligentInsights(labels, values, yCol) {
        const descEl = document.getElementById('ia-descriptive-text');
        const predEl = document.getElementById('ia-predictive-text');
        const presEl = document.getElementById('ia-prescriptive-text');
        const container = document.getElementById('bi-insight-ia-container');
        
        if (!descEl || !values.length) return null;
        
        // --- 1. Análisis Descriptivo ---
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        const maxIdx = values.indexOf(maxVal);
        const minIdx = values.indexOf(minVal);
        const avg = values.reduce((a,b)=>a+b,0) / values.length;
        
        descEl.innerHTML = `La columna analizada revela que el segmento dominante es <b>${labels[maxIdx]}</b> alcanzando <b>${maxVal.toLocaleString('es-CL')}</b>. El extremo más bajo corresponde a <b>${labels[minIdx]}</b> (${minVal.toLocaleString('es-CL')}). El rendimiento medio estructural es de ${avg.toLocaleString('es-CL', {maximumFractionDigits:1})}.`;
        
        // --- 2. Análisis Predictivo (Regresión Lineal) ---
        let trendData = [];
        let slope = 0;
        
        if (values.length >= 3) {
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            const N = values.length;
            
            // X e Y están invertidos visualmente porque ordenamos de mayor a menor en _aggregateData
            // Para "tendencia" respecto al orden de las labels:
            for (let i = 0; i < N; i++) {
                sumX += i;
                sumY += values[i];
                sumXY += i * values[i];
                sumX2 += i * i;
            }
            slope = (N * sumXY - sumX * sumY) / (N * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / N;
            
            for (let i = 0; i < N; i++) {
                trendData.push(slope * i + intercept);
            }
            
            const nextValue = slope * N + intercept;
            let pLabel = "";
            let absImpact = Math.abs(slope * N);
            
            if (slope > 0) pLabel = `marcado por una <b class="text-success">Tendencia Alcista</b>`;
            else if (slope < 0) pLabel = `atravesando una <b class="text-danger">Tendencia a la Baja</b>`;
            else pLabel = `con una Tendencia Estable`;
            
            predEl.innerHTML = `Algoritmo matemático de Regresión Lineal identifica que el conjunto está ${pLabel}. De mantenerse las condiciones de este modelo, el siguiente hito descriptivo (n+1) gravitaría cerca del valor <b>${Math.max(0, nextValue).toLocaleString('es-CL', {maximumFractionDigits:1})}</b>.`;
        } else {
            predEl.innerHTML = "Subconjunto muy estrecho. Se recomiendan al menos 3 categorías o fechas para trazar pronósticos predictivos confiables mediante Mínimos Cuadrados.";
        }
        
        // --- 3. Análisis Prescriptivo ---
        if (values.length < 3 || slope === 0) {
            presEl.innerHTML = `ℹ️ <b>Evaluación:</b> Fase de recolección temporal. Explora y consolida nuevas métricas para sugerir planes de acción.`;
        } else if (slope > 0) {
            presEl.innerHTML = `✅ <b>Mantener Estrategia:</b> Escenario favorable. Se aconseja inyectar recursos adicionales o replicar las políticas exitosas de <b>${labels[maxIdx]}</b> sobre los segmentos rezagados para maximizar utilidades.`;
        } else {
            presEl.innerHTML = `⚠️ <b>Riesgo Estructural:</b> Curva en desgaste progresivo. Recomendamos auditar exhaustivamente el cuello de botella en <b>${labels[minIdx]}</b> o aplicar planes de retención agresivos a corto plazo.`;
        }
        
        container.classList.remove('d-none');
        return trendData;
    }

    /**
     * Calcula y muestra SUM, AVG y COUNT de la columna Y en las tarjetas mini KPI.
     */
    function _updateKpiStats(rows, yCol) {
        const values = rows.map(r => parseFloat(r[yCol])).filter(v => !isNaN(v));
        
        const sum    = values.reduce((a, b) => a + b, 0);
        const avg    = values.length ? sum / values.length : 0;
        const count  = values.length;
        const max    = values.length ? Math.max(...values) : 0;
        const min    = values.length ? Math.min(...values) : 0;
        
        let median = 0, mode = 0, variance = 0;
        
        if (values.length) {
            const sorted = [...values].sort((a,b) => a-b);
            const mid = Math.floor(sorted.length/2);
            median = sorted.length % 2 === 0 ? (sorted[mid-1]+sorted[mid])/2 : sorted[mid];
            
            const freqs = {};
            values.forEach(v => freqs[v] = (freqs[v]||0)+1);
            mode = parseFloat(Object.keys(freqs).reduce((a, b) => freqs[a] > freqs[b] ? a : b));
        }
        
        if (values.length > 1) {
            variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
        }

        const fmt = n => Number(n).toLocaleString('es-CL', { maximumFractionDigits: 2 });
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        set('bi-stat-sum',    fmt(sum));
        set('bi-stat-avg',    fmt(avg));
        set('bi-stat-count',  count.toLocaleString('es-CL'));
        set('bi-stat-max',    fmt(max));
        set('bi-stat-min',    fmt(min));
        set('bi-stat-median', fmt(median));
        set('bi-stat-mode',   fmt(mode));
        set('bi-stat-var',    fmt(variance));
    }

    /**
     * Genera la tabla de preview con las primeras N filas del dataset.
     */
    function _renderPreviewTable(rows) {
        if (!rows?.length) return;

        const thead   = document.getElementById('bi-preview-thead');
        const tbody   = document.getElementById('bi-preview-tbody');
        const countEl = document.getElementById('bi-preview-count');
        if (!thead || !tbody) return;

        const columns = Object.keys(rows[0]);

        thead.innerHTML = columns
            .map(c => `<th class="px-3 py-2 text-nowrap">${c}</th>`)
            .join('');

        tbody.innerHTML = rows
            .map(row =>
                `<tr>${columns.map(c => `<td class="px-3 py-1 text-nowrap small">${row[c] ?? ''}</td>`).join('')}</tr>`
            )
            .join('');

        if (countEl) countEl.textContent = `Mostrando ${rows.length} filas`;
    }

    /**
     * Renderiza chips de columnas con color según su tipo de dato.
     *  🔵 Numérico   → badge bg-primary
     *  🟢 Fecha      → badge bg-success
     *  ⚫ Texto/Cat  → badge bg-secondary
     */
    function _renderColumnCards(cols) {
        const list    = document.getElementById('bi-columns-list');
        const countEl = document.getElementById('bi-col-count');
        if (!list) return;

        const DATE_KEYWORDS = ['fecha', 'date', 'año', 'mes', 'year', 'month', 'periodo', 'period', 'time', 'hora'];

        list.innerHTML = cols.map(col => {
            const isNumeric = col.is_numeric || col.type === 'numeric' ||
                ['int64', 'float64', 'int32', 'float32'].includes(col.type);
            const isDate = DATE_KEYWORDS.some(kw => col.name.toLowerCase().includes(kw)) ||
                col.type === 'datetime';

            let iconCls, bgCls, typeLabel;
            if (isNumeric)     { iconCls = 'fa-hashtag';     bgCls = 'bg-primary';   typeLabel = 'num'; }
            else if (isDate)   { iconCls = 'fa-calendar-alt'; bgCls = 'bg-success';  typeLabel = 'fecha'; }
            else               { iconCls = 'fa-font';         bgCls = 'bg-secondary'; typeLabel = 'texto'; }

            return `
                <span class="badge ${bgCls} text-white rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1"
                      style="font-size:0.78rem;font-weight:500;cursor:default"
                      title="Tipo: ${typeLabel}">
                    <i class="fas ${iconCls}" style="font-size:0.65rem;opacity:0.85"></i>
                    ${col.name}
                </span>`;
        }).join('');

        if (countEl) countEl.textContent = `${cols.length} columna${cols.length !== 1 ? 's' : ''}`;
    }

    /**
     * Configura los 4 botones de análisis rápido.
     * Al hacer clic, auto-seleccionan Eje X, Eje Y, Agregación y Tipo de Gráfico.
     */
    function _setupAnalysisButtons(cols, numericCols, catCols, dateCols) {
        // Helpers de búsqueda segura
        const firstVal = (arr) => arr.length ? arr[0].name : null;
        const setSelect = (id, val) => {
            const el = document.getElementById(id);
            if (!el || !val) return;
            // Buscar la opción que coincida
            const opt = [...el.options].find(o => o.value === val);
            if (opt) el.value = val;
        };

        // Resetear estado activo de botones
        const resetBtns = () => {
            document.querySelectorAll('.bi-analysis-btn').forEach(b => {
                b.classList.remove('active');
                // Restaurar clase outline original
                const type = b.dataset.type;
                const colorMap = { comparison: 'primary', temporal: 'success', distribution: 'warning', area: 'danger' };
                b.className = b.className.replace(/btn-[a-z]+\s/g, '');
            });
        };

        document.querySelectorAll('.bi-analysis-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                resetBtns();
                this.classList.add('active');
                const type = this.dataset.type;

                const xDateOrCat = firstVal(dateCols) || firstVal(catCols) || firstVal(cols);
                const xCat       = firstVal(catCols) || firstVal(cols);
                const yNum       = firstVal(numericCols);

                switch (type) {
                    case 'comparison':
                        setSelect('bi-axis-x',       xCat);
                        setSelect('bi-axis-y',       yNum);
                        setSelect('bi-aggregation',  'sum');
                        setSelect('bi-chart-type',   'bar');
                        break;

                    case 'temporal':
                        setSelect('bi-axis-x',       xDateOrCat);
                        setSelect('bi-axis-y',       yNum);
                        setSelect('bi-aggregation',  'sum');
                        setSelect('bi-chart-type',   'line');
                        break;

                    case 'distribution':
                        setSelect('bi-axis-x',       xCat);
                        setSelect('bi-axis-y',       yNum || firstVal(cols));
                        setSelect('bi-aggregation',  'count');
                        setSelect('bi-chart-type',   'doughnut');
                        break;

                    case 'area':
                        setSelect('bi-axis-x',       xDateOrCat);
                        setSelect('bi-axis-y',       yNum);
                        setSelect('bi-aggregation',  'avg');
                        setSelect('bi-chart-type',   'area');
                        break;
                }

                // Feedback visual breve
                const btnGenerar = document.getElementById('btn-generar-bi');
                if (btnGenerar) {
                    const orig = btnGenerar.innerHTML;
                    btnGenerar.innerHTML = '<i class="fas fa-check me-1"></i> Listo';
                    setTimeout(() => { btnGenerar.innerHTML = orig; }, 900);
                }
            });
        });
    }

});
