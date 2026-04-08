// gestion_usuarios.js
let usuarioModalInstance = null;
function getModal() {
    if (!usuarioModalInstance) {
        const modalEl = document.getElementById('modalUsuario');
        if (modalEl) usuarioModalInstance = new bootstrap.Modal(modalEl);
    }
    return usuarioModalInstance;
}

window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Funciones globales para abrir y editar
window.abrirModalCrear = function() {
    document.getElementById('actionType').value = 'create';
    document.getElementById('userId').value = '';
    document.getElementById('modalUsuarioTitulo').textContent = 'Agregar Usuario';
    document.getElementById('btnGuardarUser').textContent = 'Agregar';
    
    // Limpiar formulario con los nuevos campos de Base de Datos
    document.getElementById('userName').value = '';
    document.getElementById('userApPaterno').value = '';
    document.getElementById('userApMaterno').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordConfirm').value = '';
    document.getElementById('userPassword').setAttribute('placeholder', 'Obligatorio');
    document.getElementById('userRole').value = 'admin';
    
    const modal = getModal();
    if (modal) modal.show();
};

window.abrirModalEditar = function(id, nombre, email, rol, apPat, apMat, username) {
    document.getElementById('actionType').value = 'edit';
    document.getElementById('userId').value = id;
    document.getElementById('modalUsuarioTitulo').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarUser').textContent = 'Actualizar';
    
    // Cargar datos actuales
    document.getElementById('userName').value = nombre || '';
    document.getElementById('userEmail').value = email || '';
    document.getElementById('userApPaterno').value = apPat || '';
    document.getElementById('userApMaterno').value = apMat || '';
    document.getElementById('userUsername').value = username || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordConfirm').value = '';
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
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await API.delete('/api/v1/users/' + id);
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
            } catch (error) {
                Swal.fire('Error del Servidor', error.message || 'No se pudo eliminar al usuario (quizás sea el root).', 'error');
            }
        }
    });
};

window.toggleEstadoUsuario = async function(id, nombre, checkbox) {
    // Deshabilitar durante la petición para evitar doble click
    checkbox.disabled = true;

    try {
        const updated = await API.patch('/api/v1/users/' + id + '/toggle');
        const esActivo = updated.activo === 1;

        // Sincronizar el checkbox con la respuesta real del servidor
        checkbox.checked = esActivo;

        // Actualizar el ícono de estado en la columna Estado
        const icono = document.getElementById('status-icon-' + id);
        if (icono) {
            icono.className = `fas ${esActivo ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}`;
        }

        // Toast de confirmación
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, timerProgressBar: true, icon: 'success',
            title: esActivo ? `✅ ${nombre} activado` : `🔴 ${nombre} desactivado`
        });
    } catch (err) {
        // Revertir visualmente si hubo error
        checkbox.checked = !checkbox.checked;
        Swal.fire('Error', err.message || 'No se pudo cambiar el estado.', 'error');
    } finally {
        checkbox.disabled = false;
    }
};

window.cargarUsuarios = async function() {
    try {
        const users = await API.get('/api/v1/users/');
        const tbody = document.getElementById('tablaUsuarios');
        if(!tbody) return;
        tbody.innerHTML = '';

        users.forEach(user => {
            const roleName = user.id_rol === 1 ? 'Administrador' : user.id_rol === 2 ? 'Editor' : 'Invitado';
            const roleKey = user.id_rol === 1 ? 'admin' : user.id_rol === 2 ? 'editor' : 'guest';

            // activo: 1=Activo, 2=Inactivo (legacy true también se trata como activo)
            const esActivo = user.activo === 1 || user.activo === true;

            const formatDate = (isoStr) => {
                if (!isoStr) return '<span class="text-muted">—</span>';
                const d = new Date(isoStr);
                const day   = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year  = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const mins  = String(d.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hours}:${mins}`;
            };

            // Switch: el admin principal (ID 1) no tiene switch
            const switchHtml = user.id_usuario === 1
                ? `<span class="text-muted" style="font-size:0.75rem;" title="El admin principal no se puede desactivar">—</span>`
                : `<label class="user-switch" title="${esActivo ? 'Activo – click para desactivar' : 'Inactivo – click para activar'}">
                       <input type="checkbox" id="switch-${user.id_usuario}" ${esActivo ? 'checked' : ''}
                              onchange="toggleEstadoUsuario(${user.id_usuario}, '${user.nombres}', this)">
                       <span class="slider"></span>
                   </label>`;

            const tr = document.createElement('tr');
            tr.className = 'main-record-row border-bottom align-middle';
            tr.id = 'user-' + user.id_usuario;
            tr.innerHTML = `
                <td class="text-center fw-bold align-middle text-dark-blue">${user.nombres || ''} ${user.apellidoPaterno || ''}</td>
                <td class="text-center align-middle text-dark-blue">${user.email}</td>
                <td class="text-center align-middle text-dark-blue">${roleName}</td>
                <td class="text-center text-dark-blue align-middle" style="font-size: 0.82rem;">${formatDate(user.fecha_creacion)}</td>
                <td class="text-center text-dark-blue align-middle" style="font-size: 0.82rem;">${formatDate(user.ultima_sesion)}</td>
                <td class="text-center align-middle">
                    <i id="status-icon-${user.id_usuario}" class="fas ${esActivo ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}" style="font-size: 1.25rem;"></i>
                </td>
                <td class="text-center align-middle">
                    <div class="d-flex justify-content-center align-items-center" style="gap: 14px;">
                        ${switchHtml}
                        <a href="#" class="text-primary icon-action" title="Editar" onclick="abrirModalEditar(${user.id_usuario}, '${user.nombres}', '${user.email}', '${roleKey}', '${user.apellidoPaterno || ''}', '${user.apellidoMaterno || ''}', '${user.username}')"><i class="fas fa-edit"></i></a>
                        <a href="#" class="text-danger icon-action" title="Eliminar" onclick="confirmarEliminar(${user.id_usuario}, '${user.nombres}')"><i class="far fa-trash-alt"></i></a>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error fetching users:', e);
    }
};


document.addEventListener('DOMContentLoaded', function() {
    // Cargar usuarios dinámicamente al inicio
    cargarUsuarios();

    const btnGuardarUser = document.getElementById('btnGuardarUser');
    
    if (btnGuardarUser) {
        btnGuardarUser.addEventListener('click', async function() {
            const action = document.getElementById('actionType').value;
            const nombres = document.getElementById('userName').value.trim();
            const apPaterno = document.getElementById('userApPaterno').value.trim();
            const apMaterno = document.getElementById('userApMaterno').value.trim();
            const username = document.getElementById('userUsername').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            const password = document.getElementById('userPassword').value;
            const passwordConfirm = document.getElementById('userPasswordConfirm').value;
            
            if (!nombres || !apPaterno || !email || !username) {
                Swal.fire('Error', 'Por favor complete todos los campos obligatorios del perfil (Nombre, Apellido, Usuario y Correo).', 'error');
                return;
            }

            if (password !== passwordConfirm) {
                Swal.fire('Error', 'Las contraseñas no coinciden. Por favor verifique.', 'warning');
                return;
            }

            const originalText = btnGuardarUser.textContent;
            btnGuardarUser.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            btnGuardarUser.disabled = true;

            if (action === 'create') {
                if(!password) {
                    Swal.fire('Error', 'La contraseña es obligatoria para registrar un nuevo usuario.', 'error');
                    btnGuardarUser.innerHTML = originalText;
                    btnGuardarUser.disabled = false;
                    return;
                }

                try {
                    // Petición POST Real al Backend Asegurada
                    const mapRoles = { 'admin': 1, 'editor': 2, 'guest': 3 };
                    await API.post('/api/v1/users/', {
                        nombres: nombres,
                        apellidoPaterno: apPaterno,
                        apellidoMaterno: apMaterno,
                        username: username,
                        email: email,
                        password: password,
                        id_rol: mapRoles[document.getElementById('userRole').value] || 3
                    });

                    const modal = getModal();
                    if (modal) modal.hide();
                    
                    Swal.fire({
                        title: '¡Usuario Creado!',
                        text: `La cuenta corporativa para ${nombres} ha sido procesada mediante la API con éxito.`,
                        icon: 'success',
                        confirmButtonColor: '#1b7cf3'
                    }).then(() => {
                        window.location.reload();
                    });

                } catch (error) {
                    console.error('[Auth] Error al inyectar usuario:', error);
                    Swal.fire('Error del Servidor', error.message || 'No se pudo insertar el integrante en la BD.', 'error');
                } finally {
                    btnGuardarUser.innerHTML = originalText;
                    btnGuardarUser.disabled = false;
                }
            } else if (action === 'edit') {
                const userId = document.getElementById('userId').value;
                const mapRoles = { 'admin': 1, 'editor': 2, 'guest': 3 };
                
                try {
                    const data = {
                        nombres: nombres,
                        apellidoPaterno: apPaterno,
                        apellidoMaterno: apMaterno,
                        username: username,
                        email: email,
                        id_rol: mapRoles[document.getElementById('userRole').value] || 3
                    };
                    if (password) {
                        data.password = password;
                    }

                    await API.patch('/api/v1/users/' + userId, data); 
                    
                    const modal = getModal();
                    if (modal) modal.hide();
                    Swal.fire('¡Actualizado!', 'Los detalles han sido guardados correctamente.', 'success').then(() => {
                        cargarUsuarios(); // recargar
                    });
                } catch(e) {
                    console.error('[Auth] Error al editar usuario:', e);
                    Swal.fire('Error', e.message || 'No se pudo actualizar.', 'error');
                } finally {
                    btnGuardarUser.innerHTML = originalText;
                    btnGuardarUser.disabled = false;
                }
            }
        });
    }
});
