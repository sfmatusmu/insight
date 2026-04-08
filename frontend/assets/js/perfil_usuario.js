// perfil_usuario.js
// Lógica del perfil de usuario:
//  - Carga datos reales desde AppState.user (rehidratado por layout.js)
//  - Permite cambiar contraseña via PATCH /api/v1/users/{id}

/**
 * Popula el formulario con los datos del usuario autenticado.
 */
function poblarPerfil(user) {
    if (!user) return;

    const nombre = user.nombre || `${user.nombres || ''} ${user.apellidoPaterno || ''}`.trim();
    const rol    = user.rol || '—';
    const email  = user.email || '';

    // Encabezado de la card
    const cardName = document.getElementById('profCardName');
    const cardRole = document.getElementById('profCardRole');
    if (cardName) cardName.textContent = nombre;
    if (cardRole) cardRole.textContent = rol;

    // Campos del formulario
    const profName  = document.getElementById('profName');
    const profEmail = document.getElementById('profEmail');
    if (profName)  profName.value  = nombre;
    if (profEmail) profEmail.value = email;
}

// ── Inicialización: polling robusto hasta que AppState.user esté disponible ──
document.addEventListener('DOMContentLoaded', function() {

    // Polling: layout.js es async, el usuario puede tardar unos ms en llegar
    let intentos = 0;
    const maxIntentos = 60; // 3 segundos máximo (60 × 50ms)

    function intentarPoblar() {
        const user = window.AppState?.user;
        if (user && (user.email || user.nombre)) {
            poblarPerfil(user);
            return;
        }
        intentos++;
        if (intentos < maxIntentos) {
            setTimeout(intentarPoblar, 50);
        }
    }
    intentarPoblar();

    // También escuchar el evento por si acaso llega después
    window.addEventListener('session:ready', function(e) {
        poblarPerfil(e.detail || window.AppState?.user);
    });

    // ── Botón Guardar Cambios ─────────────────────────────────────────────
    const btnGuardar = document.getElementById('btnGuardarPerfil');
    if (!btnGuardar) return;

    btnGuardar.addEventListener('click', async function() {

        const user = window.AppState?.user;
        if (!user) {
            Swal.fire('Error', 'No hay sesión activa. Recarga la página e intenta de nuevo.', 'error');
            return;
        }

        const pass1 = document.getElementById('profPassword').value;
        const pass2 = document.getElementById('profPasswordConfirm').value;

        if (!pass1) {
            Swal.fire({
                title: 'Sin cambios',
                text: 'Ingresa una nueva contraseña para actualizar tu perfil de seguridad.',
                icon: 'info',
                confirmButtonColor: '#1b7cf3'
            });
            return;
        }

        if (pass1 !== pass2) {
            Swal.fire({
                title: 'Error de validación',
                text: 'Las contraseñas no coinciden. Por favor verifica e intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#1b7cf3'
            });
            return;
        }

        const resultado = await Swal.fire({
            title: '¿Cambiar contraseña?',
            html: 'Tu nueva contraseña se guardará en la base de datos.<br><small class="text-muted">Deberás usarla en tu próximo inicio de sesión.</small>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1b7cf3',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-lock me-1"></i> Sí, actualizar',
            cancelButtonText: 'Cancelar'
        });

        if (!resultado.isConfirmed) return;

        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        btnGuardar.disabled = true;

        try {
            const userId = user.id_usuario || user.id;

            if (!userId || userId === 'dev-001') {
                throw new Error('En modo Demo no se pueden guardar cambios en la base de datos. Inicia sesión con credenciales reales.');
            }

            await API.patch(`/api/v1/users/${userId}`, { password: pass1 });

            await Swal.fire({
                title: '¡Contraseña actualizada!',
                html: 'Tu nueva contraseña ha sido guardada correctamente.<br><small class="text-muted">Puedes iniciar sesión con ella la próxima vez.</small>',
                icon: 'success',
                confirmButtonColor: '#1b7cf3',
                confirmButtonText: 'Entendido'
            });

            document.getElementById('profPassword').value = '';
            document.getElementById('profPasswordConfirm').value = '';

        } catch (err) {
            console.error('[Perfil] Error al actualizar contraseña:', err);
            Swal.fire({
                title: 'Error al guardar',
                text: err.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#1b7cf3'
            });
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    });
});
