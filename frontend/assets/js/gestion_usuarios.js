// gestion_usuarios.js
let usuarioModalInstance = null;
function getModal() {
    if (!usuarioModalInstance) {
        const modalEl = document.getElementById('modalUsuario');
        if (modalEl) usuarioModalInstance = new bootstrap.Modal(modalEl);
    }
    return usuarioModalInstance;
}

// Funciones globales para abrir y editar
window.abrirModalCrear = function() {
    document.getElementById('actionType').value = 'create';
    document.getElementById('userId').value = '';
    document.getElementById('modalUsuarioTitulo').textContent = 'Agregar Usuario';
    document.getElementById('btnGuardarUser').textContent = 'Agregar';
    
    // Limpiar formulario
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userArea').value = '';
    document.getElementById('userCargo').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').setAttribute('placeholder', '');
    document.getElementById('userRole').value = 'admin';
    
    const modal = getModal();
    if (modal) modal.show();
};

window.abrirModalEditar = function(id, nombre, email, rol, area, cargo) {
    document.getElementById('actionType').value = 'edit';
    document.getElementById('userId').value = id;
    document.getElementById('modalUsuarioTitulo').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarUser').textContent = 'Actualizar';
    
    // Cargar datos actuales
    document.getElementById('userName').value = nombre;
    document.getElementById('userEmail').value = email;
    document.getElementById('userArea').value = area || '';
    document.getElementById('userCargo').value = cargo || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').setAttribute('placeholder', 'Solo si desea cambiarla');
    document.getElementById('userRole').value = rol;
    
    const modal = getModal();
    if (modal) modal.show();
};

window.confirmarEliminar = function(id, nombre) {
    Swal.fire({
        title: '¿Eliminar a ' + nombre + '?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c', // custom-btn-red
        cancelButtonColor: '#1b7cf3',  // primary-custom
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Eliminar de vista nativo
            const row = document.getElementById('user-' + id);
            if (row) {
                row.style.transition = "opacity 0.4s";
                row.style.opacity = "0";
                setTimeout(() => row.remove(), 400);
            }
            
            Swal.fire({
                title: '¡Eliminado!',
                text: 'El usuario ha sido removido con éxito.',
                icon: 'success',
                confirmButtonColor: '#1b7cf3'
            });
        }
    });
};

document.addEventListener('DOMContentLoaded', function() {
    const btnGuardarUser = document.getElementById('btnGuardarUser');
    
    if (btnGuardarUser) {
        btnGuardarUser.addEventListener('click', function() {
            const action = document.getElementById('actionType').value;
            const nombre = document.getElementById('userName').value;
            
            if (nombre.trim() === '') {
                Swal.fire('Error', 'El nombre es obligatorio', 'error');
                return;
            }

            if (action === 'create') {
                const modal = getModal();
                if (modal) modal.hide();
                Swal.fire({
                    title: '¡Usuario Creado!',
                    text: `El usuario ${nombre} ha sido agregado con éxito.`,
                    icon: 'success',
                    confirmButtonColor: '#1b7cf3'
                });
            } else if (action === 'edit') {
                Swal.fire({
                    title: '¿Guardar los cambios?',
                    text: `¿Estás seguro de actualizar el perfil de ${nombre}?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#1b7cf3',
                    cancelButtonColor: '#e74c3c',
                    confirmButtonText: 'Sí, actualizar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        const modal = getModal();
                        if (modal) modal.hide();
                        Swal.fire({
                            title: '¡Actualizado!',
                            text: 'Los detalles han sido guardados correctamente.',
                            icon: 'success',
                            confirmButtonColor: '#1b7cf3'
                        });
                    }
                });
            }
        });
    }
});
