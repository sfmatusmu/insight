/* carga_datos.js - Lógica específica para módulo carga_datos */

document.addEventListener("DOMContentLoaded", function() {
    const fileInput = document.getElementById('fileInput');
    const btnSubir = document.getElementById('btnSubir');
    const dropZone = document.getElementById('dropZone');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const btnRemoveFile = document.getElementById('btnRemoveFile');

    let modalExito, modalError;
    if(document.getElementById('modalExito')) modalExito = new bootstrap.Modal(document.getElementById('modalExito'));
    if(document.getElementById('modalError')) modalError = new bootstrap.Modal(document.getElementById('modalError'));

    if(dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', e => {
            e.preventDefault(); dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); }
        });

        fileInput.addEventListener('change', function() {
            if (this.files.length) {
                fileNameDisplay.textContent = this.files[0].name;
                fileNameDisplay.classList.add('fw-bold');
                btnRemoveFile.classList.remove('d-none');
            } else {
                fileNameDisplay.textContent = 'para seleccionar un archivo';
                btnRemoveFile.classList.add('d-none');
            }
        });

        btnRemoveFile.addEventListener('click', e => {
            e.stopPropagation(); fileInput.value = ""; fileInput.dispatchEvent(new Event('change'));
        });

        btnSubir.addEventListener('click', async () => {
            if (!fileInput.files.length) return fileInput.click();
            
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            // UI Elements
            const progressContainer = document.getElementById('uploadProgressContainer');
            const progressBar = document.getElementById('uploadProgressBar');
            const percentText = document.getElementById('uploadPercentText');
            const statusText = document.getElementById('uploadStatusText');
            
            btnSubir.disabled = true;
            progressContainer.classList.remove('d-none');
            
            try {
                // Timeout de seguridad: si en 30s no llega el evento, desbloquear UI
                const safetyTimer = setTimeout(() => {
                    btnSubir.disabled = false;
                    const pc = document.getElementById('uploadProgressContainer');
                    if (pc) pc.classList.add('d-none');
                    console.warn('[Upload] Timeout de seguridad activado.');
                }, 30000);

                // Guardar ref del timer para cancelarlo si el evento llega bien
                window._uploadSafetyTimer = safetyTimer;

                const response = await API.postFile('/api/upload', formData, (percent) => {
                    progressBar.style.width = percent + '%';
                    percentText.textContent = percent + '%';
                    if (percent === 100) {
                        statusText.textContent = 'Analizando archivo localmente...';
                        progressBar.classList.add('bg-success');
                    }
                });

                console.info('[Upload] Archivo procesado:', response);
                
            } catch (error) {
                console.error('Upload error:', error);
                btnSubir.disabled = false;
                progressContainer.classList.add('d-none');
                Swal.fire('Error', error.message || 'Error al subir el archivo', 'error');
            }
        });

        // Escuchar evento de finalización via SSE / CustomEvent local
        window.addEventListener('sse:analisis_completado', (e) => {
            // Cancelar timer de seguridad
            if (window._uploadSafetyTimer) {
                clearTimeout(window._uploadSafetyTimer);
                window._uploadSafetyTimer = null;
            }

            const data = e.detail;
            const pc = document.getElementById('uploadProgressContainer');
            if (pc) pc.classList.add('d-none');
            btnSubir.disabled = false;

            // Actualizar Stats Cards con datos reales
            const stats = data.stats;
            if (stats) {
                const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                setStat('stat-filas', stats.filas || '0');
                setStat('stat-columnas', stats.columnas || '0');
                setStat('stat-numericas', stats.columnas_numericas || '0');
                setStat('stat-nulos', stats.nulos_totales || '0');

                // Log de Operaciones
                const logList = document.getElementById('log-list');
                const logEsperando = document.getElementById('log-esperando');
                if (logEsperando) logEsperando.remove();
                if (logList) {
                    const li = document.createElement('li');
                    li.className = 'mb-2';
                    li.innerHTML = `<i class="fas fa-circle text-success me-2" style="font-size: 0.45rem;"></i> ${data.message}`;
                    logList.prepend(li);
                }

                // Cargar tipos de datos de las columnas
                fetchColumnTypes(data.file);
            }

            // Mostrar banner "Ir a Análisis BI"
            const banner   = document.getElementById('bi-ready-banner');
            const fnameEl  = document.getElementById('bi-ready-filename');
            const linkEl   = document.getElementById('bi-ready-link');
            if (banner && fnameEl && linkEl) {
                fnameEl.textContent = `${data.file} procesado correctamente`;
                linkEl.href = `analisis_bi.html?dataset=${encodeURIComponent(data.file)}`;
                banner.classList.remove('d-none');
            }

            Swal.fire({
                title: '¡Análisis Listo!',
                text: `El archivo ${data.file} ha sido procesado correctamente.`,
                icon: 'success',
                confirmButtonText: 'Ir a Análisis BI',
                showCancelButton: true,
                cancelButtonText: 'Quedarme aquí',
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `analisis_bi.html?dataset=${encodeURIComponent(data.file)}`;
                }
            });
        });
    }

    async function fetchColumnTypes(filename) {
        try {
            const result = await API.get(`/api/datasets/${filename}/columns`);
            if (result?.status === 'success' && result.data) {
                const DATE_KEYWORDS = ['fecha', 'date', 'año', 'mes', 'year', 'month', 'periodo', 'period', 'time', 'hora'];
                const list = document.getElementById('col-types-list');
                if (!list) return;

                list.innerHTML = result.data.map(col => {
                    const isNumeric = col.is_numeric || col.type === 'numeric' || ['int64', 'float64', 'int32', 'float32'].includes(col.type);
                    const isDate = DATE_KEYWORDS.some(kw => col.name.toLowerCase().includes(kw)) || col.type === 'datetime';

                    let iconCls, bgCls, typeLabel;
                    if (isNumeric)     { iconCls = 'fa-hashtag';     bgCls = 'bg-primary';   typeLabel = 'Numérico'; }
                    else if (isDate)   { iconCls = 'fa-calendar-alt'; bgCls = 'bg-success';  typeLabel = 'Fecha/Tiempo'; }
                    else               { iconCls = 'fa-font';         bgCls = 'bg-secondary'; typeLabel = 'Texto/Categórico'; }

                    return `
                    <span class="badge ${bgCls} border-0 text-white rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-sm"
                          style="font-size:0.85rem;font-weight:500;"
                          title="Tipo: ${typeLabel}">
                        <i class="fas ${iconCls}" style="font-size:0.75rem;opacity:0.85"></i>
                        ${col.name} 
                        <span class="badge bg-white bg-opacity-25" style="border-radius:4px; font-size:0.6rem; padding: 0.2rem 0.4rem;">${col.type}</span>
                    </span>`;
                }).join('');

                const colWrapper = document.getElementById('col-types-wrapper');
                if (colWrapper) colWrapper.classList.remove('d-none');
            }
        } catch (err) {
            console.error('[Carga Datos] Error cargando columnas:', err);
        }
    }
});

// Funciones BD Simulation 
window.testearConexionBD = function() {
    if(!document.getElementById('dbHost').checkValidity()) return document.getElementById('dbConnectForm').reportValidity();
    const btn = document.getElementById('btnTestConexion'); const text = btn.innerHTML;
    const host = document.getElementById('dbHost').value.toLowerCase();
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>'; btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = text; btn.disabled = false;
        if(host.includes('error')) Swal.fire('Error', 'Host inaccesible', 'error');
        else Swal.fire('Éxito', 'Conexión exitosa a ' + host, 'success');
    }, 1500);
}
window.conectarBD = function() {
    if(!document.getElementById('dbHost').checkValidity()) return document.getElementById('dbConnectForm').reportValidity();
    const btn = document.getElementById('btnConectarDB'); const text = btn.innerHTML;
    const host = document.getElementById('dbHost').value.toLowerCase();
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>'; btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = text; btn.disabled = false;
        if(host.includes('error')) Swal.fire('Fallo de Importación', 'Conexión terminada brutalmente por el firewall', 'error');
        else new bootstrap.Modal(document.getElementById('modalExito')).show();
    }, 2000);
}
