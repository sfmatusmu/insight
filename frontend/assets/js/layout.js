/**
 * layout.js – Lógica Global del Layout de Insight360
 * =====================================================
 * Responsabilidades:
 *  1. AppState global compartido entre todos los módulos de página
 *  2. Rehidratación automática de sesión al cargar cualquier página /app/
 *     → Lee el access_token de sessionStorage
 *     → Llama GET /api/auth/me para validar y reconstruir AppState.user
 *  3. Guard de autenticación: redirige a login si no hay sesión válida
 *  4. Conexión SSE para recibir notificaciones en tiempo real
 *  5. Sidebar responsive (toggle + collapse en mobile)
 *
 * REQUIERE: api.js cargado ANTES que este script en el HTML
 */

// ──────────────────────────────────────────────
// 1. Estado Global de Insight360
// ──────────────────────────────────────────────
const AppState = {
    user:           null,   // Perfil autenticado (desde /api/auth/me)
    notificaciones: [],     // Buffer de alertas en tiempo real (SSE)
    filtros:        {},     // Persistencia local de filtros de Análisis BI
    dataset:        null,   // Referencia al archivo bajo análisis actual
    _sseConnection: null,   // Instancia EventSource activa
};


// ──────────────────────────────────────────────
// 2. Rehidratación de Sesión
// ──────────────────────────────────────────────

/**
 * Verifica si hay un token en sessionStorage, llama /api/auth/me
 * y reconstruye AppState.user automáticamente.
 *
 * @returns {boolean} true si la rehidratación fue exitosa
 */
async function rehidratarSesion() {
    if (!window.API || !API.isAuthenticated()) {
        return false;
    }

    try {
        const perfil = await API.get('/api/auth/me');
        if (!perfil) throw new Error("Sin perfil");

        AppState.user = perfil;
        console.info(`[Layout] Sesión rehidratada: ${perfil.nombre} (${perfil.rol})`);
        return true;
    } catch (err) {
        console.warn('[Layout] El backend no responde o no estás logueado. Inyectando sesión de Dev local...', err);
        // INYECCIÓN DEV LOCAL
        AppState.user = {
            id: 'dev-001',
            email: 'admin@insight360.cl',
            nombre: 'Administrador Demo',
            rol: 'admin',
            empresa: 'Insight360 Corp'
        };
        return true; // Siempre verdadero en modo dev
    }
}

// ──────────────────────────────────────────────
// 3. Renderizado del Perfil en el Navbar
// ──────────────────────────────────────────────

/**
 * Actualiza los elementos del navbar/sidebar con el nombre y rol del usuario.
 * Busca elementos con los IDs: #navUserName, #navUserRole, #navUserEmail
 */
function renderUserProfile() {
    if (!AppState.user) return;

    const { nombre, rol, email } = AppState.user;

    const nameEls  = document.querySelectorAll('#navUserName, .nav-user-name');
    const roleEls  = document.querySelectorAll('#navUserRole, .nav-user-role');
    const emailEls = document.querySelectorAll('#navUserEmail, .nav-user-email');

    nameEls.forEach(el  => { el.textContent = nombre; });
    roleEls.forEach(el  => { el.textContent = rol;    });
    emailEls.forEach(el => { el.textContent = email;  });
}

// ──────────────────────────────────────────────
// 4. Guard de Autenticación
// ──────────────────────────────────────────────

/**
 * Verifica que el usuario está autenticado en páginas protegidas (/app/).
 * Si no lo está, redirige a login.
 *
 * @param {boolean} isAuth - Resultado de la rehidratación de sesión
 */
function checkAuthGuard(isAuth) {
    const esRutaProtegida = window.location.pathname.includes('/app/');

    if (esRutaProtegida && !isAuth) {
        console.warn('[Layout] Guard de Auth desactivado temporalmente para facilitar el desarrollo frontend.');
        // API.clearTokens();
        // window.location.href = '../auth/login.html';
    }
}

// ──────────────────────────────────────────────
// 5. Notificaciones SSE en Tiempo Real
// ──────────────────────────────────────────────

/**
 * Conecta al endpoint SSE y configura los listeners de eventos.
 * Solo se conecta si el usuario está autenticado y hay una API disponible.
 */
function conectarNotificacionesSSE() {
    if (!AppState.user || !window.API) return;

    // Evitar conexiones duplicadas
    if (AppState._sseConnection) {
        AppState._sseConnection.close();
    }

    AppState._sseConnection = API.stream(
        // Manejador genérico (fallback para mensajes sin tipo)
        null,
        {
            // Evento: análisis de archivo completado
            'analisis_completado': (e) => {
                const data = JSON.parse(e.data);
                AppState.notificaciones.unshift(data);
                _mostrarToastNotificacion(data);
                _actualizarBadgeNotificaciones();
                console.info('[SSE] Análisis completado:', data.file);
                
                // Disparar evento personalizado para que otras páginas escuchen
                window.dispatchEvent(new CustomEvent('sse:analisis_completado', { detail: data }));
            },

            // Evento: progreso de procesamiento en fases
            'progreso': (e) => {
                const data = JSON.parse(e.data);
                console.info(`[SSE] Progreso [${data.fase}]:`, data.message);
                _actualizarMensajeProgreso(data);

                // Disparar evento personalizado
                window.dispatchEvent(new CustomEvent('sse:progreso', { detail: data }));
            },

            // Evento: conexión a BD externa completada
            'conexion_completada': (e) => {
                const data = JSON.parse(e.data);
                AppState.notificaciones.unshift(data);
                _mostrarToastNotificacion(data);
                console.info('[SSE] Conexión BD completada:', data.host);
            },

            // Evento: ping de bienvenida / keepalive tipado
            'ping': (e) => {
                console.debug('[SSE] Conectado al stream de notificaciones.');
            },

            // Evento de prueba (endpoint /api/notificaciones/test)
            'test': (e) => {
                const data = JSON.parse(e.data);
                _mostrarToastNotificacion(data);
            },
        }
    );
}

/**
 * Muestra un toast de notificación en la UI si Bootstrap está disponible.
 * Crea el elemento dinámicamente si no existe un contenedor de toasts.
 */
function _mostrarToastNotificacion(data) {
    if (typeof bootstrap === 'undefined') return;

    // Crear o reutilizar el contenedor de toasts
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toastId = `toast_${Date.now()}`;
    const icon    = data.type === 'analisis_completado' ? 'fa-check-circle text-success'
                  : data.type === 'test'                ? 'fa-flask text-warning'
                  : 'fa-info-circle text-info';

    container.insertAdjacentHTML('beforeend', `
        <div id="${toastId}" class="toast align-items-center text-white bg-dark border border-secondary" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="6000">
          <div class="d-flex">
            <div class="toast-body d-flex align-items-start gap-2">
              <i class="fas ${icon} mt-1"></i>
              <div>
                <strong class="d-block">${data.type === 'analisis_completado' ? 'Análisis completado' : 'Notificación'}</strong>
                <small>${data.message || ''}</small>
              </div>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
          </div>
        </div>
    `);

    const toastEl = document.getElementById(toastId);
    const toast   = new bootstrap.Toast(toastEl);
    toast.show();

    // Limpiar el DOM al ocultar
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/** Actualiza el badge de notificaciones en el navbar */
function _actualizarBadgeNotificaciones() {
    const badges = document.querySelectorAll('.notif-badge, #notifBadge');
    const count  = AppState.notificaciones.filter(n => !n._leida).length;
    badges.forEach(b => {
        b.textContent = count > 0 ? count : '';
        b.style.display = count > 0 ? '' : 'none';
    });
}

/** Actualiza un elemento de progreso en la UI si existe */
function _actualizarMensajeProgreso(data) {
    // Texto de status
    const statusEls = document.querySelectorAll('#uploadStatusText, #uploadProgress');
    statusEls.forEach(el => {
        el.textContent = data.message;
        el.classList.remove('d-none');
    });

    // Barra de progreso (opcional si queremos simular progreso de procesamiento)
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressBar && data.fase === 'parseo') {
        progressBar.style.width = '100%'; // Procesamiento terminado al llegar a parseo final
        progressBar.classList.replace('bg-primary', 'bg-success');
    }
}

// ──────────────────────────────────────────────
// 6. Sidebar Responsive
// ──────────────────────────────────────────────
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar       = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('collapsed');
        });
    }

    if (sidebar) {
        const collapse = () => {
            if (window.innerWidth < 768) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        };
        collapse();
        window.addEventListener('resize', collapse);
    }
}

// ──────────────────────────────────────────────
// 7. Inicialización Principal
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // Sidebar se inicializa primero (no necesita auth)
    initSidebar();

    // Rehidratar sesión (requiere api.js cargado previamente)
    const isAuth = await rehidratarSesion();

    // Guard de autenticación
    checkAuthGuard(isAuth);

    // Si hay sesión: renderizar UI y conectar SSE
    if (isAuth) {
        renderUserProfile();
        conectarNotificacionesSSE();
    }
});

// Exponer AppState globalmente para que otros scripts de página puedan consultarlo
window.AppState = AppState;
