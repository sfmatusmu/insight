/* notificaciones.js */

document.addEventListener('DOMContentLoaded', function () {
    // Si necesitas inicializar algun tooltip extra por ej.
});

function verificarEstadoTabla() {
    const tbody = document.getElementById('lista-notificaciones');
    const filas = tbody.querySelectorAll('tr.main-record-row');
    const msjVacio = document.getElementById('vista-vacia');
    const listadoContainer = document.querySelector('.table-responsive');

    if (filas.length === 0) {
        listadoContainer.classList.add('d-none');
        msjVacio.classList.remove('d-none');
        // Quitar la burbuja roja de notificaciones pendientes del menu superior
        document.querySelector('.top-navbar .translate-middle').classList.add('d-none');
        document.querySelector('.dropdown-menu .badge').textContent = '0 nuevas';
    }
}

function eliminarNotificacion(id, event) {
    event.preventDefault();

    Swal.fire({
        title: '¿Eliminar notificación?',
        text: "La alerta desaparecerá permanentemente de tu historial",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#1b7cf3',
        cancelButtonColor: '#e53e3e',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        // Estilos custom para mantener branding premium
        customClass: {
            confirmButton: 'btn btn-primary fw-bold border-0 shadow-sm px-4',
            cancelButton: 'btn btn-danger fw-bold border-0 shadow-sm px-4'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Eliminada',
                text: 'La notificación ha sido removida del panel.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    title: 'fw-bold text-dark-blue',
                    popup: 'border-0 rounded-4 shadow-lg'
                }
            });

            const fila = document.getElementById('notif-' + id);
            if(fila) {
                // Pequeña animacion de salida
                fila.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                fila.style.opacity = '0';
                fila.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    fila.remove();
                    verificarEstadoTabla();
                }, 300);
            }
        }
    });
}

function limpiarTodasNotificaciones() {
    const tbody = document.getElementById('lista-notificaciones');
    const filas = tbody.querySelectorAll('tr.main-record-row');
    
    if (filas.length === 0) return;

    Swal.fire({
        title: '¿Limpiar todo el historial?',
        text: "Se eliminarán todas las notificaciones recibidas.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e53e3e',
        cancelButtonColor: '#718096',
        confirmButtonText: 'Sí, vaciar panel',
        cancelButtonText: 'Cancelar',
        customClass: {
            confirmButton: 'btn btn-danger fw-bold border-0 shadow-sm px-4',
            cancelButton: 'btn btn-secondary text-white fw-bold border-0 shadow-sm px-4 ms-2'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            filas.forEach(f => {
                f.style.transition = 'opacity 0.3s ease';
                f.style.opacity = '0';
            });
            setTimeout(() => {
                tbody.innerHTML = '';
                verificarEstadoTabla();
                
                Swal.fire({
                    title: 'Panel Limpio',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: {
                        popup: 'border-0 rounded-4 shadow-lg'
                    }
                });
            }, 300);
        }
    });
}
