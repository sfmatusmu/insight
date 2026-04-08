/**
 * Autenticación Frontend Insight360
 * Implementa el patrón Módulo para encapsular el estado y la lógica.
 * Sanitización básica y validación de formularios estricta.
 */

const AuthModule = (function () {
    // --- ESTADO Y CONFIGURACIÓN ---
    const config = {
        storageKey: 'insight360_saved_email',
        minPasswordLength: 8
    };

    // --- FUNCIONES DE SEGURIDAD (Simulación Frontend) ---

    /**
     * Sanitización básica para prevenir XSS limitando inyección de etiquetas HTML
     * si el input se reflejara en el DOM.
     * @param {string} str - Cadena de entrada sospechosa
     * @returns {string} - Cadena de salida sanitizada
     */
    const escapeHTML = (str) => {
        return String(str).replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    };

    /**
     * Prevención básica de formato: Validando formato estricto de correo electrónico.
     * @param {string} email - Email a validar
     * @returns {boolean}
     */
    const isValidEmail = (email) => {
        const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return re.test(String(email).toLowerCase());
    };

    // --- MANEJO DE UI ---

    const showMessage = (elementId, message, type = 'success') => {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.className = `mt-3 p-3 rounded-3 text-center small fade-in-up visible alert alert-${type} border-${type}`;

        // Estilos específicos para modo oscuro y glassmorphism
        if (type === 'success') {
            el.classList.add('bg-transparent', 'text-success');
        } else {
            el.classList.add('bg-danger', 'bg-opacity-25', 'text-white');
        }

        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
        el.innerHTML = `<i class="bi ${icon} me-2"></i> ${escapeHTML(message)}`;
        el.classList.remove('d-none');
    };

    const clearMessage = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.classList.add('d-none');
        el.innerHTML = '';
    };

    /**
     * Setear el botón en estado de carga (loading) para evitar doble envío
     */
    const setButtonLoadingState = (btn, isLoading) => {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...';
            btn.disabled = true;
            btn.classList.add('opacity-75');
        } else {
            btn.innerHTML = btn.dataset.originalText;
            btn.disabled = false;
            btn.classList.remove('opacity-75');
        }
    };

    /**
     * Evalúa la robustez de la contraseña
     * @param {string} password 
     * @returns {number} Puntuación 0-6
     */
    const evaluatePasswordStrength = (password) => {
        let score = 0;
        if (!password) return score;

        // Longitud
        if (password.length > 8) score += 1;
        if (password.length > 12) score += 1;

        // Complejidad
        if (/[A-Z]/.test(password)) score += 1; // Mayúscula
        if (/[a-z]/.test(password)) score += 1; // Minúscula
        if (/[0-9]/.test(password)) score += 1; // Número
        if (/[^A-Za-z0-9]/.test(password)) score += 1; // Especial

        return score;
    };

    const handlePasswordInput = (e) => {
        const password = e.target.value;
        const container = document.getElementById('pwdStrengthContainer');
        const bar = document.getElementById('pwdStrengthBar');
        const text = document.getElementById('pwdStrengthText');

        if (!container || !bar || !text) return;

        if (password.length === 0) {
            container.classList.add('d-none');
            return;
        }

        container.classList.remove('d-none');
        const score = evaluatePasswordStrength(password);

        // Limpiar clases previas
        bar.className = 'progress-bar';
        text.className = 'fw-bold';

        if (score <= 2) {
            bar.style.width = '33%';
            bar.classList.add('strength-weak');
            text.classList.add('strength-weak');
            text.textContent = 'Débil';
        } else if (score <= 4) {
            bar.style.width = '66%';
            bar.classList.add('strength-medium');
            text.classList.add('strength-medium');
            text.textContent = 'Media';
        } else {
            bar.style.width = '100%';
            bar.classList.add('strength-strong');
            text.classList.add('strength-strong');
            text.textContent = 'Fuerte';
        }
    };

    const togglePasswordVisibility = () => {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('toggleIcon');

        if (!passwordInput || !toggleIcon) return;

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('bi-eye-fill');
            toggleIcon.classList.add('bi-eye-slash-fill');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('bi-eye-slash-fill');
            toggleIcon.classList.add('bi-eye-fill');
        }
    };

    // --- CONTROLADORES DE EVENTO ---

    const handleLogin = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        clearMessage('authMessage');

        // Activamos la validación nativa de Bootstrap/HTML5
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const rememberMe = document.getElementById('rememberMe');

        const email = escapeHTML(emailInput.value.trim()); // Sanitizamos
        const password = passInput.value; // No se debe modificar o sanitizar contraseñas antes de hacer hash

        form.classList.add('was-validated');
        setButtonLoadingState(submitBtn, true);

        // --- DEMO BYPASS (Mantenimiento de sesión sin backend) ---
        if (email === 'admin@insight360.cl' && password === 'deltree54') {
            console.info('[Auth] Demo Bypass detectado. Iniciando sesión local...');
            
            // Simular tokens demo para que el Guard del Dashboard nos deje pasar
            API.saveTokens('demo-access-token', 'demo-refresh-token');
            
            showMessage('authMessage', '¡Acceso de Demostración concedido! Redirigiendo...', 'success');
            
            setTimeout(() => {
                window.location.href = '../app/dashboard.html';
            }, 1000);
            return;
        }

        // --- AUTENTICACIÓN REAL CONTRA EL BACKEND ---
        try {
            // FastAPI OAuth2PasswordRequestForm espera 'username' (email) y 'password'
            const data = await API.postForm('/api/v1/login/access-token', {
                username: email,
                password: password
            });

            // Guardar tokens en sessionStorage para que layout.js los use
            API.saveTokens(data.access_token, data.refresh_token);

            // Guardar email en localStorage si se solicita
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem(config.storageKey, email);
            } else {
                localStorage.removeItem(config.storageKey);
            }

            showMessage('authMessage', '¡Autenticación exitosa! Acceso concedido, redirigiendo al panel...', 'success');

            // Redirigir al dashboard tras un breve delay para ver el mensaje positivo
            setTimeout(() => {
                window.location.href = '../app/dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('[Auth] Error en login:', error);
            setButtonLoadingState(submitBtn, false);
            
            // Mostrar mensaje de error del backend (ej: "Credenciales incorrectas")
            showMessage('authMessage', error.message || 'Error de conexión con el servidor de seguridad.', 'danger');
        }
    };

    const handleRecovery = (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        clearMessage('recoveryMessage');

        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        const email = escapeHTML(document.getElementById('recoveryEmail').value.trim());

        if (!isValidEmail(email)) {
            showMessage('recoveryMessage', 'El formato del correo electrónico proporcionado es inválido.', 'danger');
            return;
        }

        form.classList.add('was-validated');
        setButtonLoadingState(submitBtn, true);

        // Simular envío de petición de recuperación
        setTimeout(() => {
            // Enfoque de seguridad: Nunca confirmar si el email existe o no (Prevención de enumeración de usuarios)
            showMessage('recoveryMessage', 'Si la dirección existe en nuestros registros seguros, enviaremos un enlace temporal de reestablecimiento.', 'success');
            setButtonLoadingState(submitBtn, false);
            form.reset();
            form.classList.remove('was-validated');
        }, 1800);
    };

    // --- INICIALIZACIÓN ---
    const init = () => {
        // Inicializar password listener a travez de todas las vistas
        const pwdField = document.getElementById('password');
        if (pwdField && document.getElementById('pwdStrengthContainer')) {
            pwdField.addEventListener('input', handlePasswordInput);
        }
        
        const toggleBtn = document.getElementById('togglePassword');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', togglePasswordVisibility);
        }

        // Inicializar formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);

            // Cargar "Recordar email" desde LocalStorage de forma segura
            const savedEmail = localStorage.getItem(config.storageKey);
            const emailInput = document.getElementById('email');
            const rememberMe = document.getElementById('rememberMe');

            if (savedEmail && emailInput && rememberMe) {
                emailInput.value = escapeHTML(savedEmail); // Sanitizar al leer
                rememberMe.checked = true;
            }

            // Setup UX interacciones de contraseña
            const toggleBtn = document.getElementById('togglePassword');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', togglePasswordVisibility);
            }

            const passwordField = document.getElementById('password');
            if (passwordField && document.getElementById('pwdStrengthContainer')) {
                passwordField.addEventListener('input', handlePasswordInput);
            }
        }

        // Inicializar formulario de recuperación de contraseña
        const recoveryForm = document.getElementById('recoveryForm');
        if (recoveryForm) {
            recoveryForm.addEventListener('submit', handleRecovery);
        }

        // Setear años dinámicos en footers
        const yearElems = document.querySelectorAll('#year');
        yearElems.forEach(el => el.textContent = new Date().getFullYear());
    };

    // Exponer públicamente solo la inicialización (Encapsulamiento del módulo)
    return {
        init
    };
})();

// Autoejecución cuando el DOM es totalmente seguro y está montado
document.addEventListener('DOMContentLoaded', AuthModule.init);
