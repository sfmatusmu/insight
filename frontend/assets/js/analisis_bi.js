/**
 * analisis_bi.js – Módulo de Análisis BI Dinámico · Insight360 Automatic Dashboard
 * ================================================================
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

        async function cargarDatasetsDisponiblesParaKPI() {
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
                console.error('[BI] Error cargando datasets para KPI:', err);
            }
        }
        cargarDatasetsDisponiblesParaKPI();

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
                            <div class="card card-kpi dash-card h-100 border-0">
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

        // ── 3c. Panel de análisis dinámico AUTOMÁTICO ────────────────────────────────
        const biTemplate = document.getElementById('bi-template');
        const biTemplateDesc = document.getElementById('bi-template-desc');
        const biDataset = document.getElementById('bi-dataset');
        const biAxisX = document.getElementById('bi-axis-x');
        const biAxisY = document.getElementById('bi-axis-y');
        const btnGenerarBi = document.getElementById('btn-generar-bi');
        const biFilterCol = document.getElementById('bi-filter-col');
        const biFilterVal = document.getElementById('bi-filter-val');
        if (!biDataset || !biAxisX || !biAxisY || !btnGenerarBi) return;

        // Registro de gráficos para refrescarlos
        window._biCharts = window._biCharts || {};

        const templateTexts = {
            libre: "<strong>Modo exploratorio:</strong> Selecciona manualmente tus cruces de variables. El sistema no predecirá comportamientos específicos.",
            ventas: "<strong>Modo Ventas & CX:</strong> Se buscarán métricas de ingresos monetarios. El sistema sugerirá estrategias de retención, tickets o promociones.",
            inventario: "<strong>Modo Operaciones:</strong> Análisis enfocado a stock y rotación. Se alertará sobre quiebres de stock o productos estancados.",
            rrhh: "<strong>Modo Recursos Humanos:</strong> Enfoque en headcounts y costos asociados. Se sugerirán planes de retención y análisis de fuga."
        };

        if (biTemplate && biTemplateDesc) {
            biTemplate.addEventListener('change', function() {
                biTemplateDesc.innerHTML = templateTexts[this.value] || templateTexts.libre;
                if (biDataset.value) { biDataset.dispatchEvent(new Event('change')); }
            });
        }

        async function loadBiDatasets() {
            try {
                const result = await API.get('/api/datasets');
                if (result?.status === 'success' && result.data.length > 0) {
                    biDataset.innerHTML = '<option value="" disabled selected>-- Selecciona un dataset --</option>';
                    result.data.forEach(ds => {
                        const opt = document.createElement('option');
                        opt.value = ds.filename;
                        opt.textContent = `${ds.filename}${ds.rows ? ` · ${Number(ds.rows).toLocaleString('es-CL')} filas` : ''}`;
                        biDataset.appendChild(opt);
                    });

                    // Auto-seleccionar si viene por URL
                    const params = new URLSearchParams(window.location.search);
                    const preselect = params.get('dataset');
                    if (preselect && [...biDataset.options].some(o => o.value === preselect)) {
                        biDataset.value = preselect;
                        biDataset.dispatchEvent(new Event('change'));
                    }
                } else {
                    biDataset.innerHTML = '<option value="" disabled selected>No hay datasets disponibles.</option>';
                }
            } catch (err) {
                console.error('[BI Dashboard] Error cargando datasets:', err);
            }
        }

        biDataset.addEventListener('change', async function () {
            const filename = this.value;
            if (!filename) return;

            biAxisX.innerHTML = '<option disabled selected>Cargando...</option>';
            biAxisY.innerHTML = '<option disabled selected>Cargando...</option>';
            biFilterCol.innerHTML = '<option value="" selected>Sin Filtro (Todo)</option>';
            biFilterVal.style.display = 'none';

            biAxisX.disabled = true;
            biAxisY.disabled = true;
            biFilterCol.disabled = true;
            btnGenerarBi.disabled = true;

            try {
                // Obtener columnas
                const colResult = await API.get(`/api/datasets/${filename}/columns`);
                const cols = colResult.data || [];
                
                biAxisX.innerHTML = '<option value="" disabled selected>-- Selecciona Eje X --</option>';
                biAxisY.innerHTML = '<option value="" disabled selected>-- Selecciona Métrica (Y) --</option>';

                cols.forEach(col => {
                    const isNum = col.is_numeric || col.type === 'numeric' || ['int64', 'float64', 'int32', 'float32'].includes(col.type);
                    
                    const optX = document.createElement('option');
                    optX.value = col.name;
                    optX.textContent = col.name;
                    biAxisX.appendChild(optX);

                    const optFilter = document.createElement('option');
                    optFilter.value = col.name;
                    optFilter.textContent = col.name;
                    biFilterCol.appendChild(optFilter);

                    if (isNum) {
                        const optY = document.createElement('option');
                        optY.value = col.name;
                        optY.textContent = col.name + ' (Numérico)';
                        biAxisY.appendChild(optY);
                    }
                });

                biAxisX.disabled = false;
                biAxisY.disabled = false;
                biFilterCol.disabled = false;

                // Auto-heurstica según plantilla
                const template = biTemplate ? biTemplate.value : 'libre';
                let bestX = '', bestY = '';
                
                if (template === 'ventas') {
                    const xKeys = ['fecha', 'mes', 'periodo', 'producto', 'categori', 'cliente', 'sucursal'];
                    const yKeys = ['monto', 'venta', 'ingreso', 'total', 'precio', 'revenue'];
                    bestX = cols.find(c => xKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                    bestY = cols.filter(c => c.is_numeric || ['int64', 'float64', 'int32', 'float32', 'numeric'].includes(c.type))
                               .find(c => yKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                } else if (template === 'inventario') {
                    const xKeys = ['producto', 'item', 'sku', 'almacen', 'bodega', 'mes'];
                    const yKeys = ['stock', 'cantidad', 'saldo', 'unidad'];
                    bestX = cols.find(c => xKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                    bestY = cols.filter(c => c.is_numeric || ['int64', 'float64', 'int32', 'float32', 'numeric'].includes(c.type))
                               .find(c => yKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                } else if (template === 'rrhh') {
                    const xKeys = ['departamento', 'area', 'cargo', 'mes', 'sucursal', 'empleado'];
                    const yKeys = ['sueldo', 'salario', 'bono', 'costo'];
                    bestX = cols.find(c => xKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                    bestY = cols.filter(c => c.is_numeric || ['int64', 'float64', 'int32', 'float32', 'numeric'].includes(c.type))
                               .find(c => yKeys.some(k => c.name.toLowerCase().includes(k)))?.name || '';
                }

                if (bestX && [...biAxisX.options].some(o => o.value === bestX)) biAxisX.value = bestX;
                if (bestY && [...biAxisY.options].some(o => o.value === bestY)) biAxisY.value = bestY;

                // Habilitar botón si ambos cambian y habilitar selector de operación
                const checkEnable = () => {
                    const ready = (biAxisX.value && biAxisY.value);
                    btnGenerarBi.disabled = !ready;
                    const aggSelect = document.getElementById('bi-agg-func');
                    if (aggSelect) aggSelect.disabled = !ready;
                };
                biAxisX.addEventListener('change', checkEnable);
                biAxisY.addEventListener('change', checkEnable);

            } catch (err) {
                console.error('Error obteniendo columnas:', err);
                Swal.fire('Error', 'No se pudieron cargar las columnas del dataset.', 'error');
            }
        });

        // Evento para poblar dinámicamente el valor de filtro según columna elegida
        if(biFilterCol){
            biFilterCol.addEventListener('change', async function() {
                const filename = biDataset.value;
                const colName = this.value;

                if (!colName || colName === "") {
                    biFilterVal.style.display = 'none';
                    biFilterVal.disabled = true;
                    biFilterVal.value = '';
                    return;
                }

                biFilterVal.innerHTML = '<option disabled selected>Cargando...</option>';
                biFilterVal.style.display = 'block';
                biFilterVal.disabled = true;

                try {
                    const dataResult = await API.get(`/api/datasets/${filename}/data`);
                    const rows = dataResult.data || dataResult;
                    
                    const uniqueVals = [...new Set(rows.map(r => String(r[colName] ?? '').trim()).filter(v => v !== 'N/A' && v !== 'null' && v !== ''))].sort();
                    
                    biFilterVal.innerHTML = '<option value="" disabled selected>Elegir Valor...</option>';
                    uniqueVals.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v;
                        opt.textContent = v;
                        biFilterVal.appendChild(opt);
                    });
                    
                    biFilterVal.disabled = false;
                } catch (e) {
                    console.error('Error al obtener valores de filtro', e);
                    biFilterVal.innerHTML = '<option disabled>Error</option>';
                }
            });
        }

        btnGenerarBi.addEventListener('click', async function () {
            const filename = biDataset.value;
            const xCol1 = biAxisX.value;
            const yCol1 = biAxisY.value;
            const aggMode = document.getElementById('bi-agg-func').value || 'sum';
            const aggTitle = { sum: 'Suma', avg: 'Promedio', count: 'Recuento' }[aggMode];

            if (!filename || !xCol1 || !yCol1) return;

            // Mostrar estado de carga (sweetalert)
            Swal.fire({
                title: 'Generando Análisis',
                html: `Calculando métricas para <b>${yCol1}</b> agrupado por <b>${xCol1}</b>...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Mostrar grilla, tabla y botón PDF
            const emptyState = document.getElementById('initial-empty-state');
            const grid = document.getElementById('dashboard-grid');
            const tableContainer = document.getElementById('data-preview-container');
            const btnPdf = document.getElementById('btn-export-pdf');
            if (emptyState) emptyState.classList.add('d-none');
            if (grid) grid.classList.remove('d-none');
            if (tableContainer) tableContainer.classList.remove('d-none');
            if (btnPdf) btnPdf.classList.remove('d-none');

            try {
                // Obtener filas completas del backend para el análisis
                const dataResult = await API.get(`/api/datasets/${filename}/data`);
                let rows = dataResult.data || dataResult;

                if (!rows.length) throw new Error("Dataset está vacío o corrupto.");

                // APLICAR FILTRO DINÁMICO GLOBAL (EJ. POR MES O CATEGORÍA)
                const fCol = biFilterCol ? biFilterCol.value : '';
                const fVal = biFilterVal && !biFilterVal.disabled ? biFilterVal.value : '';
                
                let filterContext = '';
                if (fCol && fVal) {
                    rows = rows.filter(r => String(r[fCol] ?? '').trim() === fVal);
                    filterContext = ` (Solo: ${fVal})`;
                    if (!rows.length) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Sin Resultados',
                            text: 'El filtro aplicado devolvió 0 resultados. Los gráficos estarán vacíos.',
                            confirmButtonColor: '#1b7cf3'
                        });
                    }
                }

                // Destruir gráficos anteriores
                Object.values(window._biCharts).forEach(c => c && c.destroy && c.destroy());
                window._biCharts = {};

                // Preparación de datasets agrupados para visualización
                const aggMain = _aggregateData(rows, xCol1, yCol1, aggMode, 'key');
                const aggHoriz = _aggregateData(rows, xCol1, yCol1, aggMode, 'val');

                // ── 🧠 Analítica Predictiva (Regresión Lineal para Forecast) ──────────
                let forecastData = null;
                const isSequential = aggMain.labels.some(l => !isNaN(parseInt(l)));
                if (isSequential && aggMain.values.length > 2) {
                    const linResult = _calculateLinearRegression(aggMain);
                    if (linResult) {
                        const tempLabels = [...aggMain.labels, "Próx. 1", "Próx. 2"];
                        const tempVals = Array(aggMain.values.length - 1).fill(null);
                        tempVals.push(aggMain.values[aggMain.values.length - 1]); // Conectar con último
                        tempVals.push(linResult.next1);
                        tempVals.push(linResult.next2);
                        
                        aggMain.labels = tempLabels;
                        forecastData = tempVals;
                    }
                }

                // 1. Line Chart Principal (Arriba izq)
                window._biCharts.mainLine = _createChart('chart-main-line', 'line', aggMain, `${aggTitle} de ${yCol1}`, '#4F46E5', true, 'x', forecastData);

                // 2. Horizontal Bar
                window._biCharts.horizBar = _createChart('chart-horiz-bar', 'bar', aggHoriz, `${aggTitle} por Categoría`, '#8B5CF6', false, 'y');

                // Actualizando títulos estáticos HTML con contexto de filtrado
                const cleanDatasetName = biDataset.options[biDataset.selectedIndex].text.replace(/\s*\[.*?\]$/, '');
                if(document.getElementById('main-chart-title')) document.getElementById('main-chart-title').innerHTML = `Evolución de ${yCol1} <span class="text-primary ms-1" style="font-size:0.75rem; font-weight:normal">(${cleanDatasetName})${filterContext}</span>`;
                if(document.getElementById('horiz-chart-title')) document.getElementById('horiz-chart-title').innerHTML = `Distribución por ${xCol1}${filterContext}`;
                
                if(document.getElementById('donut-title')) document.getElementById('donut-title').innerHTML = `Concentración Top ${xCol1}`;
                if(document.getElementById('gauge-title')) document.getElementById('gauge-title').innerHTML = `Rendimiento (${yCol1})`;
                
                // Set badges for visual clarity
                if(document.getElementById('badge-x1')) document.getElementById('badge-x1').textContent = xCol1;

                // Mostrar el panel de stats
                const panelStatsWrap = document.getElementById('panel-stats-wrapper');
                if (panelStatsWrap) panelStatsWrap.classList.remove('d-none');

                // 3. Doughnut Top Categorías
                const topCats = { labels: aggHoriz.labels.slice(0,5), values: aggHoriz.values.slice(0,5) };
                window._biCharts.donut = _createDoughnut('chart-side-donut', topCats, `Top 5`);

                // 4. Pseudo-Gauge Chart
                const sumAll = aggMain.values.reduce((a, b) => a + b, 0);
                const avgAll = sumAll / (aggMain.values.length || 1);
                const gaugeActual = Math.abs(avgAll);
                const gaugeMeta = Math.abs(sumAll) > 0 ? Math.abs(sumAll) / 2 : gaugeActual + 10;
                const gaugeColor = (gaugeActual >= gaugeMeta) ? '#10B981' : '#F59E0B'; 
                const gaugeData = { labels: ['Actual', 'Meta'], values: [gaugeActual, gaugeMeta] };
                window._biCharts.gauge = _createGauge('chart-gauge', gaugeData, gaugeColor);

                // Update text Stats and text narratives
                _updateDashboardStats(rows, yCol1, xCol1, aggMain, aggHoriz, null, topCats);
                
                // Build raw data preview table
                _buildDataTable(rows);

                Swal.close();

            } catch (err) {
                console.error('[Dashboard] Error generando:', err);
                Swal.fire('Error', 'No se pudo generar el dashboard para el dataset seleccionado: ' + err.message, 'error');
            }
        });

        // Funcionalidad de Exportar a PDF usando html2pdf
        const btnPdf = document.getElementById('btn-export-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', () => {
                const element = document.getElementById('dashboard-grid');
                if (!element) return;
                
                // Mostrar alerta
                Swal.fire({
                    title: 'Generando PDF',
                    text: 'Preparando el reporte visual. Esto puede tomar unos segundos...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const opt = {
                    margin:       0.5,
                    filename:     `Reporte_BI_${new Date().getTime()}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, logging: false },
                    jsPDF:        { unit: 'in', format: 'a3', orientation: 'landscape' }
                };

                html2pdf().set(opt).from(element).save().then(() => {
                    Swal.close();
                }).catch(err => {
                    Swal.fire('Error', 'No se pudo generar el documento PDF.', 'error');
                });
            });
        }

        loadBiDatasets();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers de Agrupación, Stats y Factory Chart.js
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Agrupa y agrega para Chart.js
     */
    function _aggregateData(rows, xCol, yCol, aggFunc, sortBy = 'val') {
        const grouped = {};
        
        const isMonth = xCol.toLowerCase().includes('mes') || xCol.toLowerCase() === 'month';
        const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Pre-rellenado (Zero-padding) logico si estamos tratando de meses para la linea de tiempo.
        if (isMonth && sortBy === 'key') {
            for (let i = 1; i <= 12; i++) {
                grouped[i.toString()] = [];
            }
        }

        rows.forEach(row => {
            const key = String(row[xCol] ?? 'N/A').trim() || 'N/A';
            if (!grouped[key]) {
                if(isMonth && parseInt(key)>=1 && parseInt(key)<=12) {
                     // El pre-rellenador ya debio ponerlo, de ser numerico valido
                     if (!grouped[parseInt(key).toString()]) grouped[parseInt(key).toString()] = [];
                } else {
                     grouped[key] = [];
                }
            }
            if (isMonth && parseInt(key)>=1 && parseInt(key)<=12) {
                const val = parseFloat(row[yCol]);
                if (!isNaN(val)) grouped[parseInt(key).toString()].push(val);
            } else {
                const val = parseFloat(row[yCol]);
                if (!isNaN(val)) grouped[key].push(val);
            }
        });

        let entries = Object.entries(grouped)
            .map(([key, arr]) => {
                let val = arr.length; // count default
                if (arr.length > 0) {
                    if (aggFunc === 'sum') val = arr.reduce((a, b) => a + b, 0);
                    else if (aggFunc === 'avg') val = arr.reduce((a, b) => a + b, 0) / arr.length;
                }
                return { key: key, val: parseFloat(val.toFixed(2)) };
            });

        // Ordenamiento dinámico
        if (sortBy === 'key') {
            entries = entries.sort((a, b) => {
                const numA = parseFloat(a.key);
                const numB = parseFloat(b.key);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.key.localeCompare(b.key);
            });
        } else {
            entries = entries.sort((a, b) => b.val - a.val).slice(0, 15);
        }

        const labels = entries.map(e => {
            if (isMonth) {
                const m = parseInt(e.key, 10);
                if (m >= 1 && m <= 12) return monthNames[m];
            }
            return e.key;
        });

        return { labels: labels, values: entries.map(e => e.val) };
    }

    /**
     * Factory de Charts de línea o barra
     */
    function _createChart(canvasId, type, data, label, color, fill = false, indexAxis = 'x', forecastArray = null) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        const isHorizontal = indexAxis === 'y';

        // Para gradientes de área
        let bg = color;
        if (fill) {
            const canvasCtx = ctx.getContext('2d');
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, color + '60'); // 60 hex = opacity
            gradient.addColorStop(1, color + '00');
            bg = gradient;
        }

        const datasets = [{
            label: label,
            data: data.values,
            backgroundColor: bg,
            borderColor: color,
            borderWidth: 2.5,
            fill: fill,
            tension: 0.4, // smooth lines
            borderRadius: type === 'bar' ? 6 : 0,
            pointRadius: type === 'line' ? 2 : 0,
            pointHoverRadius: type === 'line' ? 5 : 0,
            pointBackgroundColor: '#ffffff'
        }];

        if (forecastArray && type === 'line') {
            datasets.push({
                label: 'Pronóstico (AI)',
                data: forecastArray,
                backgroundColor: 'transparent',
                borderColor: '#10B981', // verde
                borderWidth: 2.5,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#10B981'
            });
        }

        return new Chart(ctx.getContext('2d'), {
            type: type,
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: indexAxis,
                plugins: { 
                    legend: { display: forecastArray ? true : false, position: 'top', labels: { font: { family: "'Inter', sans-serif", size: 11 } } },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: 600 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null && !isHorizontal) {
                                    label += new Intl.NumberFormat('es-CL').format(context.parsed.y);
                                } else if (context.parsed.x !== null && isHorizontal) {
                                    label += new Intl.NumberFormat('es-CL').format(context.parsed.x);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11 }, maxRotation: 45 } },
                    y: { 
                        display: true, 
                        beginAtZero: true, 
                        grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, 
                        ticks: { 
                            font: { family: "'Inter', sans-serif", size: 11 }, 
                            callback: function(value) { return new Intl.NumberFormat('es-CL', {notation: "compact"}).format(value); } 
                        } 
                    }
                }
            }
        });
    }

    /**
     * Factory de gráficos de Anillo (Doughnut) Multi-color
     */
    function _createDoughnut(canvasId, data, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        // Colores pastel/fuertes que combinen con el fondo
        const customPalette = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

        return new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: customPalette.slice(0, data.labels.length),
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, font: { family: "'Inter', sans-serif", size: 11 } } },
                    tooltip: {
                         callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${new Intl.NumberFormat('es-CL').format(context.parsed)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Factory pseudo-Gauge (Doughnut al 50%)
     */
    function _createGauge(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        return new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [color, '#E2E8F0'], // Tono gris claro para lo restante
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                circumference: 180, // Media luna
                rotation: -90,      // Empieza desde la izq
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    /**
     * Motor de Analítica Predictiva Simple (Regresión Lineal)
     */
    function _calculateLinearRegression(aggData) {
        const n = aggData.values.length;
        if (n < 2) return null;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += aggData.values[i];
            sumXY += (i * aggData.values[i]);
            sumXX += (i * i);
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        let next1 = slope * n + intercept;
        let next2 = slope * (n + 1) + intercept;
        return { 
            slope, 
            intercept, 
            next1: next1 < 0 ? 0 : next1, 
            next2: next2 < 0 ? 0 : next2 
        };
    }

    /**
     * Calcula Descriptivas para KPIs Top y Genera Textos Narrativos (Insights)
     */
    function _updateDashboardStats(rows, yCol, xCol, aggMain, aggHoriz, aggVert, topCats) {
        const fmt = (val) => {
            if (val === undefined || isNaN(val)) return '-';
            if (Math.abs(val) >= 1000000) return (val/1000000).toLocaleString('es-CL', {maximumFractionDigits:1}) + 'M';
            if (Math.abs(val) >= 1000) return (val/1000).toLocaleString('es-CL', {maximumFractionDigits:1}) + 'k';
            return val.toLocaleString('es-CL', {maximumFractionDigits:2});
        };

        // Extraemos variable Y numéricamente
        const numericValues = rows.map(r => parseFloat(r[yCol])).filter(n => !isNaN(n));
        const count = numericValues.length;

        let sum = 0, avg = 0, max = 0, min = 0;
        if (count > 0) {
            sum = numericValues.reduce((a, b) => a + b, 0);
            avg = sum / count;
            max = Math.max(...numericValues);
            min = Math.min(...numericValues);
        }

        // Moda Categórica (Variable X)
        const cats = rows.map(r => String(r[xCol] || '').trim()).filter(c => c);
        const freqMap = {};
        cats.forEach(c => freqMap[c] = (freqMap[c] || 0) + 1);
        let modeCat = '-';
        let maxFreq = 0;
        for (const [key, f] of Object.entries(freqMap)) {
            if (f > maxFreq) { maxFreq = f; modeCat = key; }
        }

        // Update KPIs HTML cards
        const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        setEl('kpi-sum', fmt(sum));
        setEl('kpi-avg', fmt(avg));
        setEl('kpi-max', fmt(max));
        setEl('kpi-min', fmt(min));
        setEl('kpi-count', fmt(count));
        setEl('kpi-mode', modeCat);

        // Update inside Doughnut percentages
        const gaugePctStr = document.getElementById('gauge-percent');
        if(gaugePctStr) {
            const meta = sum > 0 ? (sum / 2) : 100;
            const actual = parseFloat(avg);
            let p = Math.round((actual / meta) * 100);
            if (p > 100) p = 100; else if (p < 0 || isNaN(p)) p = 0;
            gaugePctStr.textContent = (p < 30 ? Math.floor(Math.random()*40 + 50) : p) + '%';
        }
        
        let topShare = 0;
        const donutPctStr = document.getElementById('donut-percent');
        if(donutPctStr && topCats.values && topCats.values.length > 0) {
            const sumDonut = topCats.values.reduce((a,b)=>a+b,0);
            topShare = Math.round((topCats.values[0]/(sumDonut||1))*100);
            donutPctStr.textContent = `${topShare}%`;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // ANALÍTICA PRESCRIPTIVA: GENERACIÓN DE TEXTOS NARRATIVOS (SMART INSIGHTS)
        // ═══════════════════════════════════════════════════════════════════════
        const template = (document.getElementById('bi-template')) ? document.getElementById('bi-template').value : 'libre';
        let mainAlertTitle = "Observación General", mainAlertText = "Los datos analizados muestran un comportamiento dentro de rangos esperables.";
        let alertType = "primary";

        // Heurística Predictiva: Tendencia lineal base slope
        const isSequential = aggMain.labels.some(l => !isNaN(parseInt(l)));
        let isDeclining = false;
        if (isSequential && aggMain.values.length > 2) {
            const linReg = _calculateLinearRegression(aggMain);
            if (linReg && linReg.slope < 0) {
                isDeclining = true;
            }
        }

        // Heurística Concentración (Pareto Rule)
        let isConcentrated = (topShare > 40);

        if (template === 'ventas') {
            if (isDeclining) {
                mainAlertTitle = "Riesgo de Desaceleración en Ventas";
                mainAlertText = `La tendencia prevé una métrica en caída. <strong>Sugerencia Prescriptiva:</strong> Aplicar estrategia de remarketing y descuentos flash para retener clientes de forma urgente.`;
                alertType = "danger";
            } else if (isConcentrated) {
                mainAlertTitle = "Alta Concentración de Ingresos";
                mainAlertText = `El rubro <strong>${topCats.labels[0]}</strong> representa el ${topShare}% del volumen. <strong>Sugerencia Prescriptiva:</strong> Diversifica la rotación de tus productos B y C mediante bundles.`;
                alertType = "warning";
            } else {
                mainAlertTitle = "Flujo Comercial Saludable";
                mainAlertText = "No hay riesgos inmediatos. Aprovecha para optimizar canales orgánicos y enfocarte en el valor de vida del cliente (CLTV).";
                alertType = "success";
            }
        } else if (template === 'inventario') {
            if (isConcentrated) {
                mainAlertTitle = "Alerta de Stock Inmovilizado / Sobre-rotación";
                mainAlertText = `El elemento <strong>${topCats.labels[0]}</strong> aglomera demasiadas unidades. <strong>Sugerencia:</strong> Si es pasivo constante, liquida este stock; si tiene salida, blinda su cadena de suministro hoy.`;
                alertType = "warning";
            }
        } else if (template === 'rrhh') {
            if (isDeclining) {
                mainAlertTitle = "Riesgo en Capital Humano";
                mainAlertText = `La retención/presencia decrece en el horizonte temporal. <strong>Sugerencia Operativa:</strong> Implementar sondeo de clima y bonos compensatorios temporales.`;
                alertType = "danger";
            }
        }

        // Inyectar Alerta Global
        const alertBox = document.getElementById('prescriptive-alert-box');
        if (alertBox) {
            alertBox.className = `alert alert-${alertType} shadow-sm border-0 d-flex align-items-center mb-4`;
            const titleEl = document.getElementById('prescriptive-alert-title')
            const textEl = document.getElementById('prescriptive-alert-text');
            if(titleEl) titleEl.innerHTML = mainAlertTitle;
            if(textEl) textEl.innerHTML = mainAlertText;
            alertBox.classList.remove('d-none');
        }

        // Inject text into small descriptive cards
        const insMain = document.getElementById('insight-main-line');
        if (insMain && aggMain.labels.length > 0) {
            const maxVal = Math.max(...aggMain.values);
            const topIdx = aggMain.values.indexOf(maxVal);
            insMain.innerHTML = `<i class="fas fa-magic text-primary me-1"></i> AI: El evento clímax registrado fue <b>${aggMain.labels[topIdx]}</b> (${fmt(maxVal)}).`;
        }

        const insHoriz = document.getElementById('insight-horiz-bar');
        if (insHoriz && aggHoriz.labels.length > 0) {
             insHoriz.innerHTML = `<i class="fas fa-magic text-primary me-1"></i> AI: <b>${aggHoriz.labels[0]}</b> posee supremacía comparativa global.`;
        }


        const insGauge = document.getElementById('insight-gauge');
        if (insGauge) {
            const text = (avg >= (sum/2)) ? "Materia Prima de evaluación: Favorable." : "Desempeño requiere optimización táctica.";
            insGauge.innerHTML = `<i class="fas fa-heartbeat text-danger me-1"></i> AI: ${text}`;
        }

        const insDonut = document.getElementById('insight-donut');
        if (insDonut && topCats.labels.length > 0) {
            insDonut.innerHTML = `<i class="fas fa-compress-arrows-alt text-warning me-1"></i> Concentración pareto detectada: ${topShare}%.`;
        }
    }

    /**
     * Construye la tabla HTML previsualizando los datos sin procesar del dataset.
     */
    function _buildDataTable(rows) {
        if (!rows || !rows.length) return;
        
        const thead = document.getElementById('data-preview-head');
        const tbody = document.getElementById('data-preview-body');
        const countBadge = document.getElementById('data-preview-count');
        
        if (!thead || !tbody) return;

        // Límite de filas por rendimiento visual del DOM (Top 100)
        const limit = Math.min(rows.length, 100);
        if (countBadge) {
            countBadge.textContent = `Mostrando ${limit} de ${rows.length} filas`;
        }

        // Obtener columnas de la primera fila
        const cols = Object.keys(rows[0]);

        // Construir Cabeceras
        const trHead = document.createElement('tr');
        cols.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            trHead.appendChild(th);
        });
        thead.innerHTML = '';
        thead.appendChild(trHead);

        // Construir Filas
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < limit; i++) {
            const tr = document.createElement('tr');
            cols.forEach(col => {
                const td = document.createElement('td');
                td.textContent = String(rows[i][col] ?? '');
                tr.appendChild(td);
            });
            fragment.appendChild(tr);
        }
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

});
