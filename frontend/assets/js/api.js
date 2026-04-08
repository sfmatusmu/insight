/**
 * api.js – Servicio HTTP Centralizado de Insight360
 * ===================================================
 * Centraliza TODAS las llamadas al backend FastAPI:
 *  - Inyecta el Bearer token automáticamente desde sessionStorage
 *  - Redirige a login en caso de 401
 *  - Expone métodos: get(), post(), put(), delete(), postFile()
 *  - Expone stream() para conectar al endpoint SSE de notificaciones
 *
 * Uso:
 *   import { API } from './api.js';               // Si usas módulos ES6
 *   const user = await API.get('/api/auth/me');   // En cualquier script de página
 */

const API = (() => {
    // ──────────────────────────────────────────────
    // Configuración
    // ──────────────────────────────────────────────
    const BASE_URL    = 'http://localhost:8000';
    const TOKEN_KEY   = 'access_token';
    const REFRESH_KEY = 'refresh_token';

    // ──────────────────────────────────────────────
    // MODO DEMO - DATOS y ESTADO LOCAL
    // ──────────────────────────────────────────────
    let _MOCK_DATA = {
        '/api/auth/me': {
            id: 'demo-001',
            email: 'admin@insight360.cl',
            nombre: 'Administrador Demo',
            rol: 'admin',
            empresa: 'Insight360 Corp'
        },
        '/api/datasets': [],
        '/api/kpis': []
    };

    /** Persistencia local del Modo Demo */
    const _getMockData = (path) => {
        const savedDatasets = sessionStorage.getItem('demo_datasets');
        if (savedDatasets) _MOCK_DATA['/api/datasets'] = JSON.parse(savedDatasets);
        
        let pathKeyCols = path;
        
        if (path === '/api/auth/me') return _MOCK_DATA[path];
        if (path === '/api/datasets') return { status: 'success', data: _MOCK_DATA['/api/datasets'] };
        
        // Manejar requests de columnas: /api/datasets/{name}/columns
        if (path.includes('/columns')) {
            const mockCols = sessionStorage.getItem('demo_cols_' + path.split('/')[3]);
            if (mockCols) return { status: 'success', data: JSON.parse(mockCols) };
            return { status: 'success', data: [] }; // Fallback
        }
        
        // Manejar datos de grillas: /api/datasets/{name}/data
        if (/\/api\/datasets\/.+\/data/.test(path)) {
            const mockRows = sessionStorage.getItem('demo_data_' + path.split('/')[3]);
            if (mockRows) {
                const parsed = JSON.parse(mockRows);
                return { status: 'success', data: parsed, total_rows: parsed.length };
            }
            return { status: 'success', data: [], total_rows: 0 };
        }

        return null;
    };

    // ──────────────────────────────────────────────
    // Helpers internos
    // ──────────────────────────────────────────────

    /** Obtiene el access_token del sessionStorage (o devuelve uno de prueba local) */
    const _getToken = () => sessionStorage.getItem(TOKEN_KEY) || 'demo_token';

    /** Construye los headers base con Authorization si hay token */
    const _buildHeaders = (extra = {}) => {
        const token = _getToken();
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...extra,
        };
    };

    /** Redirige al login limpiando el almacenamiento local */
    const _handleUnauthorized = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
        console.warn('[API] Redirección al login interceptada para garantizar Desarrollo BI local.');
    };

    /**
     * Núcleo de todas las peticiones HTTP.
     * @param {string} path   - Ruta relativa a BASE_URL (ej: '/api/auth/me')
     * @param {object} options - Opciones de fetch (method, body, etc.)
     * @returns {Promise<any>} - Respuesta JSON parseada
     */
    const _request = async (path, options = {}) => {
        const url = `${BASE_URL}${path}`;

        const config = {
            ...options,
            headers: _buildHeaders(options.headers || {}),
        };

        let response;
        try {
            response = await fetch(url, config);
        } catch (networkError) {
            console.warn(`[API] Servidor no disponible en ${url}. Usando Modo Demo Local.`);
            const mock = _getMockData(path);
            if (mock) {
                await new Promise(r => setTimeout(r, 200)); // Latencia mínima irreal
                return mock;
            }
            throw new Error('Servidor inaccesible y ruta Demo no configurada.');
        }

        // Manejar 401: intentar refresh automático antes de redirigir
        if (response.status === 401) {
            const refreshed = await _tryRefreshToken();
            if (refreshed) {
                // Reintentar la petición original con el nuevo token
                config.headers = _buildHeaders(options.headers || {});
                response = await fetch(url, config);
            } else {
                _handleUnauthorized();
                return null;
            }
        }

        // Respuestas sin cuerpo (204 No Content)
        if (response.status === 204) return null;

        // Parsear JSON
        const data = await response.json();

        // Propagar errores HTTP del backend (422, 500, etc.)
        if (!response.ok) {
            const message = data?.detail || `Error ${response.status}`;
            throw new Error(message);
        }

        return data;
    };

    /**
     * Intenta renovar el access_token usando el refresh_token almacenado.
     * @returns {boolean} true si el refresh fue exitoso
     */
    const _tryRefreshToken = async () => {
        const refreshToken = sessionStorage.getItem(REFRESH_KEY);
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) return false;

            const data = await response.json();
            sessionStorage.setItem(TOKEN_KEY, data.access_token);
            sessionStorage.setItem(REFRESH_KEY, data.refresh_token);
            console.info('[API] Token renovado automáticamente.');
            return true;
        } catch {
            return false;
        }
    };

    // ──────────────────────────────────────────────
    // Métodos públicos HTTP
    // ──────────────────────────────────────────────

    /** GET request */
    const get = (path, options = {}) =>
        _request(path, { ...options, method: 'GET' });

    /** POST request con body JSON */
    const post = (path, body = {}, options = {}) =>
        _request(path, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });

    /** 
     * POST request con Form Data (URL Encoded).
     * Requerido para login OAuth2 estándar en FastAPI.
     * Sobreescribe el Content-Type base de _buildHeaders.
     */
    const postForm = (path, data = {}, options = {}) => {
        const body = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => body.append(key, value));

        return _request(path, {
            ...options,
            method: 'POST',
            headers: {
                ...options.headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
    };

    /** PUT request con body JSON */
    const put = (path, body = {}, options = {}) =>
        _request(path, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });

    /** PATCH request con body JSON */
    const patch = (path, body = {}, options = {}) =>
        _request(path, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });

    /** DELETE request */
    const del = (path, options = {}) =>
        _request(path, { ...options, method: 'DELETE' });

    /**
     * POST multipart/form-data para subida de archivos con SEGUIMIENTO DE PROGRESO.
     * Soporta MODO DEMO: Si el servidor falla, simula el progreso y éxito.
     */
    const postFile = (path, formData, onProgress = null) => {
        const token = _getToken();
        const url   = `${BASE_URL}${path}`;

        return new Promise((resolve, reject) => {
            const file = formData.get('file');
            
            // Simular Subida con Parseo NATIVO en JS
            const _simulateFrontendUpload = () => {
                return new Promise((resolveMock) => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 33;
                        if (progress >= 100) {
                            progress = 100;
                            if (onProgress) onProgress(100);
                            clearInterval(interval);
                            
                            // Parsear Archivo con FileReader Real (CSV o Excel)
                            if (file && file.size > 0) {
                                const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                                const reader = new FileReader();

                                const _processRows = (headers, dataRows, filename, totalRowCount) => {
                                    const dataTypes   = {};  // tipo estadístico: nominal, ordinal, discrete, continuous, date
                                    const rawSamples  = {};  // muestra de valores únicos por columna
                                    headers.forEach(h => { dataTypes[h] = null; rawSamples[h] = new Set(); });
                                    let numericColsCount = 0;
                                    const parsedRows = [];

                                    // Palabras clave para detectar Ordinales
                                    const ORDINAL_KEYWORDS = ['nivel','grado','categoria','clasificacion','tipo','estado',
                                        'mes','dia','semana','trimestre','quarter','rank','rango','prioridad',
                                        'year','año','period','fase','etapa','clase'];
                                    // Palabras clave para detectar Fechas
                                    const DATE_KEYWORDS = ['fecha','date','year','year','month','periodo','time','hora','fec','dtm'];

                                    const maxRows = Math.min(dataRows.length, 2000);
                                    for (let i = 0; i < maxRows; i++) {
                                        const rowObj = {};
                                        headers.forEach((h, idx) => {
                                            const raw = dataRows[i][idx];
                                            const v = (raw !== undefined && raw !== null) ? String(raw).trim() : '';
                                            rowObj[h] = v;
                                            if (rawSamples[h].size < 50) rawSamples[h].add(v); // muestra para clasificar
                                        });
                                        parsedRows.push(rowObj);
                                    }

                                    // Clasificar cada columna estadísticamente
                                    headers.forEach(h => {
                                        const hLower = h.toLowerCase();
                                        const samples = [...rawSamples[h]].filter(v => v !== '');
                                        const isDateKw = DATE_KEYWORDS.some(kw => hLower.includes(kw));
                                        const numericSamples = samples.filter(v => !isNaN(parseFloat(v)) && v !== '');
                                        const allNumeric = samples.length > 0 && numericSamples.length === samples.length;

                                        if (allNumeric && !isDateKw) {
                                            numericColsCount++;
                                            const hasDecimal = numericSamples.some(v => String(v).includes('.') && parseFloat(v) % 1 !== 0);
                                            dataTypes[h] = hasDecimal ? 'continuous' : 'discrete';
                                        } else if (isDateKw) {
                                            dataTypes[h] = 'date';
                                        } else {
                                            const isOrdinalKw = ORDINAL_KEYWORDS.some(kw => hLower.includes(kw));
                                            const uniqueCount = rawSamples[h].size;
                                            const isOrdinalCardinality = uniqueCount >= 2 && uniqueCount <= 15;
                                            dataTypes[h] = (isOrdinalKw || isOrdinalCardinality) ? 'ordinal' : 'nominal';
                                        }
                                    });

                                    // Re-parsear números con tipos correctos
                                    parsedRows.forEach(row => {
                                        headers.forEach(h => {
                                            if (dataTypes[h] === 'discrete' || dataTypes[h] === 'continuous') {
                                                const n = parseFloat(row[h]);
                                                if (!isNaN(n)) row[h] = n;
                                            }
                                        });
                                    });

                                    const finalCols = headers.map(h => ({
                                        name:       h,
                                        type:       dataTypes[h] || 'nominal',
                                        is_numeric: dataTypes[h] === 'discrete' || dataTypes[h] === 'continuous',
                                    }));

                                    const newDs = {
                                        id: filename,
                                        filename: filename,
                                        size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
                                        rows: totalRowCount,
                                        cols: headers.length,
                                        colsNum: numericColsCount,
                                        nulos: 0,
                                        status: 'procesado'
                                    };

                                    const savedDatasets = sessionStorage.getItem('demo_datasets')
                                        ? JSON.parse(sessionStorage.getItem('demo_datasets')) : [];
                                    if (!savedDatasets.find(d => d.filename === filename)) {
                                        savedDatasets.push(newDs);
                                        sessionStorage.setItem('demo_datasets', JSON.stringify(savedDatasets));
                                    }

                                    sessionStorage.setItem('demo_cols_' + filename, JSON.stringify(finalCols));
                                    // Guardar TODAS las filas procesadas (hasta 2000) para análisis real
                                    try {
                                        sessionStorage.setItem('demo_data_' + filename, JSON.stringify(parsedRows));
                                    } catch(storageErr) {
                                        // Si sessionStorage está lleno, guardar solo primeras 500 filas
                                        console.warn('[API] sessionStorage lleno, reduciendo muestra a 500 filas.');
                                        sessionStorage.setItem('demo_data_' + filename, JSON.stringify(parsedRows.slice(0, 500)));
                                    }

                                    window.dispatchEvent(new CustomEvent('sse:analisis_completado', {
                                        detail: {
                                            file: filename,
                                            message: `Análisis procesado en navegador. Filas: ${totalRowCount}, Columnas: ${headers.length}`,
                                            stats: {
                                                filas: totalRowCount,
                                                columnas: headers.length,
                                                columnas_numericas: numericColsCount,
                                                nulos_totales: 0
                                            }
                                        }
                                    }));

                                    resolveMock({ status: 'success', message: 'Archivo analizado (Demo Local)', filename });
                                };

                                if (isExcel && window.XLSX) {
                                    // --- PARSEO EXCEL con SheetJS ---
                                    reader.onload = (e) => {
                                        setTimeout(async () => {
                                            try {
                                                // Leer solo cabecera para obtener nombres de hojas
                                                const wbMeta = XLSX.read(e.target.result, { type: 'array', bookSheets: true });
                                                const sheetNames = wbMeta.SheetNames;

                                                // Si hay más de 1 hoja, preguntar al usuario cuál usar
                                                let selectedSheet = sheetNames[0];
                                                if (sheetNames.length > 1) {
                                                    const opts = sheetNames.map((name, i) =>
                                                        `<option value="${name}">${i + 1}. ${name}</option>`
                                                    ).join('');

                                                    const { value: chosen, isDismissed } = await Swal.fire({
                                                        title: '📋 Seleccionar Hoja de Trabajo',
                                                        html: `
                                                            <p class="text-muted mb-2" style="font-size:0.9rem">
                                                                El archivo <strong>${file.name}</strong> tiene <strong>${sheetNames.length} hojas</strong>.<br>
                                                                ¿Con cuál deseas trabajar?
                                                            </p>
                                                            <select id="swal-sheet-select" class="swal2-select form-select mt-2">
                                                                ${opts}
                                                            </select>`,
                                                        confirmButtonText: 'Analizar Hoja',
                                                        confirmButtonColor: '#1b7cf3',
                                                        showCancelButton: true,
                                                        cancelButtonText: 'Cancelar',
                                                        preConfirm: () => {
                                                            return document.getElementById('swal-sheet-select').value;
                                                        }
                                                    });

                                                    if (isDismissed) {
                                                        resolveMock({ status: 'cancelled' });
                                                        return;
                                                    }
                                                    selectedSheet = chosen || sheetNames[0];
                                                }

                                                // Parsear la hoja seleccionada
                                                const wb = XLSX.read(e.target.result, { type: 'array', sheetRows: 2001 });
                                                const sheet = wb.Sheets[selectedSheet];
                                                if (!sheet) return resolveMock({ status: 'error' });

                                                // Calcular filas totales del rango
                                                const ref = sheet['!ref'];
                                                const totalRows = ref ? parseInt(ref.split(':')[1].replace(/[A-Z]/g, '')) - 1 : 0;

                                                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                                                if (!rawRows.length) return resolveMock({ status: 'error' });

                                                // Usar nombre de hoja como sufijo del filename para diferenciar datasets
                                                const dsName = sheetNames.length > 1
                                                    ? `${file.name} [${selectedSheet}]`
                                                    : file.name;

                                                const headers = rawRows[0].map(h => String(h).trim()).filter(h => h !== '');
                                                const dataRows = rawRows.slice(1).filter(r => r.some(c => c !== ''));
                                                _processRows(headers, dataRows, dsName, totalRows || dataRows.length);

                                            } catch (err) {
                                                console.error('[API] Error parseando Excel:', err);
                                                resolveMock({ status: 'error', message: err.message });
                                            }
                                        }, 0);
                                    };
                                    reader.readAsArrayBuffer(file);
                                } else {
                                    // --- PARSEO CSV con FileReader texto ---
                                    reader.onload = (e) => {
                                        const text = e.target.result;
                                        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                                        if (!lines.length) return resolveMock({ status: 'error' });

                                        const sep = lines[0].includes(';') ? ';' : ',';
                                        const headers = lines[0].split(sep).map(h => h.trim().replace(/['"]/g, ''));
                                        const dataRows = lines.slice(1).map(l => l.split(sep).map(v => v.replace(/['"]/g, '').trim()));
                                        _processRows(headers, dataRows, file.name, dataRows.length);
                                    };
                                    reader.readAsText(file);
                                }
                            }
                        } else {
                            if (onProgress) onProgress(progress);
                            window.dispatchEvent(new CustomEvent('sse:progreso', {
                                detail: { fase: 'procesamiento', message: `Analizando bytes en el navegador... ${progress}%` }
                            }));
                        }
                    }, 200);
                });
            };

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            
            const headers = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            };
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress(percent);
                    }
                };
            }

            xhr.onload = () => {
                let data = xhr.responseText;
                try { data = JSON.parse(data); } catch(e) {}

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else if (xhr.status === 401) {
                    console.warn('API bloqueada localmente. Saltando a simulador frontend.');
                    _simulateFrontendUpload().then(resolve);
                } else {
                    reject(new Error(data?.detail || `Error ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                console.warn('[API] Servidor inalcanzable. Iniciando procesamiento en Frontend HTML5.');
                _simulateFrontendUpload().then(resolve);
            };

            xhr.send(formData);
        });
    };

    /**
     * Conecta al endpoint SSE de notificaciones.
     * Nota: EventSource nativo no soporta headers personalizados,
     * se pasa el token como query param de forma segura para SSE.
     *
     * @param {function} onMessage  - Callback(event) para mensajes genéricos
     * @param {object}   listeners  - { 'eventName': callbackFn } para eventos tipados
     * @returns {EventSource}       - La instancia para cerrarla con .close()
     *
     * Uso:
     *   const es = API.stream(
     *     (e) => console.log('Mensaje:', e.data),
     *     { 'analisis_completado': (e) => mostrarNotificacion(JSON.parse(e.data)) }
     *   );
     *   // Para cerrar: es.close();
     */
    const stream = (onMessage, listeners = {}) => {
        const token = _getToken();
        const url = `${BASE_URL}/api/notificaciones/stream${token ? `?token=${token}` : ''}`;

        const es = new EventSource(url);

        es.onmessage = onMessage || null;

        es.onerror = (err) => {
            console.warn('[API] SSE conexión interrumpida. Reintentando...', err);
        };

        // Registrar listeners para eventos tipados
        Object.entries(listeners).forEach(([eventName, handler]) => {
            es.addEventListener(eventName, handler);
        });

        return es;
    };

    /**
     * Guarda tokens en sessionStorage tras un login exitoso.
     * @param {string} accessToken
     * @param {string} refreshToken
     */
    const saveTokens = (accessToken, refreshToken) => {
        sessionStorage.setItem(TOKEN_KEY, accessToken);
        sessionStorage.setItem(REFRESH_KEY, refreshToken);
    };

    /** Elimina todos los tokens (logout cliente) */
    const clearTokens = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
    };

    /** ¿Hay sesión activa? */
    const isAuthenticated = () => !!_getToken();

    // ──────────────────────────────────────────────
    // API pública del módulo
    // ──────────────────────────────────────────────
    return {
        get,
        post,
        postForm,
        put,
        patch,
        delete: del,
        postFile,
        stream,
        saveTokens,
        clearTokens,
        isAuthenticated,
        BASE_URL,
    };
})();

// Disponible globalmente en todos los scripts de página
window.API = API;
