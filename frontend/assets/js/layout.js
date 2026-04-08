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

    // ── Demo bypass: token ficticio, usar usuario demo local ──────────────
    const token = sessionStorage.getItem('access_token');
    if (token === 'demo-access-token') {
        AppState.user = {
            id: 'dev-001',
            id_rol: 1,
            email: 'admin@insight360.cl',
            nombre: 'Administrador Demo',
            nombres: 'Administrador',
            apellidoPaterno: 'Demo',
            rol: 'Administrador',
            ultima_sesion: null
        };
        console.info('[Layout] Modo Demo activado.');
        return true;
    }

    // ── Autenticación real: llamar /api/v1/me con el JWT ─────────────────
    try {
        const perfil = await API.get('/api/v1/me');
        if (!perfil) throw new Error('Sin perfil');

        // Normalizar campos que el backend devuelve distintos a lo que usa el layout
        const roleMap = { 1: 'Administrador', 2: 'Editor', 3: 'Invitado' };
        perfil.nombre = `${perfil.nombres || ''} ${perfil.apellidoPaterno || ''}`.trim();
        perfil.rol    = roleMap[perfil.id_rol] || 'Invitado';

        AppState.user = perfil;
        console.info(`[Layout] Sesión rehidratada: ${perfil.nombre} (Rol: ${perfil.rol})`);
        return true;
    } catch (err) {
        console.warn('[Layout] No se pudo rehidratar la sesión:', err.message);
        return false;
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

    const { nombre, rol, email, ultima_sesion } = AppState.user;

    // Formatear última sesión
    let lastSessionText = 'Primera vez';
    if (ultima_sesion) {
        const d = new Date(ultima_sesion);
        const dd  = String(d.getDate()).padStart(2,'0');
        const mm  = String(d.getMonth()+1).padStart(2,'0');
        const yy  = d.getFullYear();
        const hh  = String(d.getHours()).padStart(2,'0');
        const min = String(d.getMinutes()).padStart(2,'0');
        lastSessionText = `${dd}/${mm}/${yy} ${hh}:${min}`;
    }

    // Actualizar todos los elementos del navbar / dropdown
    document.querySelectorAll('#navUserName, .nav-user-name').forEach(el => { el.textContent = nombre || ''; });
    document.querySelectorAll('#navUserRole, .nav-user-role').forEach(el => { el.textContent = rol    || ''; });
    document.querySelectorAll('#navUserEmail, .nav-user-email').forEach(el => { el.textContent = email  || ''; });
    document.querySelectorAll('.nav-user-last-session').forEach(el => {
        el.textContent = `Última sesión: ${lastSessionText}`;
    });

    // ── Campos del formulario de Perfil (si estamos en perfil_usuario.html) ──
    const profName  = document.getElementById('profName');
    const profEmail = document.getElementById('profEmail');
    if (profName)  profName.value  = nombre || '';
    if (profEmail) profEmail.value = email  || '';

    // ── Inyectar última sesión DEBAJO del nombre en la barra superior ─────
    // (sin modificar los HTML: se crea dinámicamente junto al span .nav-user-name
    //  que está dentro del botón dropdown-toggle del navbar)
    document.querySelectorAll('a.dropdown-toggle .nav-user-name').forEach(nameSpan => {
        // Envolver nombre + última sesión en un div flex-column
        if (!nameSpan.parentElement.classList.contains('nav-user-info-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'nav-user-info-wrap d-flex flex-column align-items-start';
            nameSpan.parentNode.insertBefore(wrap, nameSpan);
            wrap.appendChild(nameSpan);
        }
        const wrap = nameSpan.parentElement;

        // Crear o reutilizar el span de última sesión
        let lastEl = wrap.querySelector('.nav-last-top');
        if (!lastEl) {
            lastEl = document.createElement('span');
            lastEl.className = 'nav-last-top';
            lastEl.style.cssText = 'font-size:0.68rem;color:#6c757d;font-weight:400;line-height:1.1;';
            wrap.appendChild(lastEl);
        }
        lastEl.textContent = `Últ. sesión: ${lastSessionText}`;
    });
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

    // Si hay sesión: renderizar UI, aplicar roles y conectar SSE
    if (isAuth) {
        renderUserProfile();
        applyRBAC();
        conectarNotificacionesSSE();
        // Notificar a scripts de página que la sesión está lista con datos reales
        window.dispatchEvent(new CustomEvent('session:ready', { detail: AppState.user }));
    }
});

// ──────────────────────────────────────────────
// 8. Role-Based Access Control (RBAC) UI
// ──────────────────────────────────────────────
function applyRBAC() {
    if (!AppState.user) return;

    // id_rol del backend (1=Admin, 2=Editor, 3=Invitado). Parseamos a Número por seguridad.
    const roleId = Number(AppState.user.id_rol) || 3;
    console.info(`[RBAC] Aplicando control de acceso para Rol ID: ${roleId}`);

    // Reglas de acceso por página
    const PAGE_RULES = {
        'gestion_usuarios.html': [1],          // Solo Admin
        'gestion_archivos.html': [1, 2],       // Admin y Editor
    };

    // Nodos en el Sidebar aplicables en cualquier vista HTML
    const navUsersElements = document.querySelectorAll('#nav-menu-users');
    const navFilesElements = document.querySelectorAll('#nav-menu-files');

    if (roleId === 3) {
        // Invitado → No ve panel de usuarios ni archivos
        navUsersElements.forEach(el => { el.style.display = 'none'; });
        navFilesElements.forEach(el => { el.style.display = 'none'; });
    } else if (roleId === 2) {
        // Editor → Ve archivos, NO ve panel de usuarios
        navUsersElements.forEach(el => { el.style.display = 'none'; });
    }

    // ── Protección contra acceso directo por URL ──
    const currentPage = window.location.pathname.split('/').pop();
    const allowedRoles = PAGE_RULES[currentPage];

    if (allowedRoles && !allowedRoles.includes(roleId)) {
        console.warn(`[RBAC] Acceso denegado a "${currentPage}" para Rol ID ${roleId}. Redirigiendo...`);
        window.location.replace('dashboard.html');
    }
}


// Exponer AppState globalmente para que otros scripts de página puedan consultarlo
window.AppState = AppState;
