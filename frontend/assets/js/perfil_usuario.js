// perfil_usuario.js

document.addEventListener("DOMContentLoaded", function () {
    const btnGuardarPerfil = document.getElementById('btnGuardarPerfil');
    if (btnGuardarPerfil) {
        btnGuardarPerfil.addEventListener('click', function () {
            const pass1 = document.getElementById('profPassword').value;
            const pass2 = document.getElementById('profPasswordConfirm').value;

            if (pass1 !== pass2) {
                Swal.fire({
                    title: 'Error de validación',
                    text: 'Las contraseñas no coinciden. Intente nuevamente.',
                    icon: 'error',
                    confirmButtonColor: '#1b7cf3'
                });
                return;
            }

            Swal.fire({
                title: 'Actualizando Perfil',
                text: 'Guardando los cambios de seguridad y configuración...',
                icon: 'info',
                showConfirmButton: false,
                timer: 1000,
                timerProgressBar: true
            }).then(() => {
                Swal.fire({
                    title: '¡Perfil Actualizado!',
                    text: 'Tu información ha sido guardada correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#1b7cf3'
                }).then(() => {
                    // Clear password fields for security
                    document.getElementById('profPassword').value = '';
                    document.getElementById('profPasswordConfirm').value = '';
                });
            });
        });
    }
});
