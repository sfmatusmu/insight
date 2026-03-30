# Insight360 - Documentación Técnica Integral (Edición Demo Serverless)

Bienvenido a la documentación oficial de **Insight360**, una plataforma de demostración de Business Intelligence (BI) y análisis de datos enfocada en el sector B2B.

Esta versión del proyecto adopta una arquitectura **100% Frontend (Serverless)**. Todo el código pertenece a la capa de presentación (HTML, CSS, JS) y funciona de manera totalmente autónoma en el navegador del cliente sin requerir configuración de bases de datos, APIs de terceros o servidores locales en Python.

---

## 1. Visión General del Proyecto

**Insight360** se compone de dos grandes universos dentro del mismo cliente web:
1. **La Cara Pública (Landing Page & Auth)**: Diseñada para atraer clientes, exponer la propuesta de valor y capturar leads mediante un diseño moderno y altamente estético basado en *Glassmorphism* y Modo Oscuro.
2. **La Cara Privada (DataPyme BI App)**: El portal administrativo y operativo al que acceden los usuarios. Un ecosistema robusto y estandarizado para la ingesta de datos, visualización de KPIs mediante gráficos interactivos y administración de recursos humanos/tecnológicos, ejecutando cálculos matemáticos directamente en el navegador.

---

## 2. Stack Tecnológico

Al carecer de servidor Backend, el 100% de la carga de trabajo, simulación y cálculos estadísticos se ejecuta sobre Javascript Nativo.

| Tecnología | Versión | Rol |
|---|---|---|
| HTML5 & CSS3 | — | Estructura y diseño responsivo con Custom Properties |
| Bootstrap | 5.3.3 | Layout, componentes y utilidades responsive |
| Vanilla JavaScript | ES6+ | Lógica modular, Parser de CSV (`FileReader`) simulador de Auth |
| Chart.js | Latest CDN | Gráficos interactivos (líneas, barras, donas) |
| SweetAlert2 | v11 | Modales y confirmaciones transaccionales premium |
| FontAwesome | 6.4 | Iconografía vectorial unificada |
| Bootstrap Icons | 1.11 | Iconos adicionales del sistema y auth |
| Google Fonts – Inter | — | Tipografía corporativa en todo el proyecto |

---

## 3. Arquitectura y Mapeo de Directorios

El código fuente sigue metodologías de Código Limpio (*Clean Code*) separando estrictamente la estructura (HTML), la presentación (CSS) y el comportamiento (JS).

```text
📦 insight/                        # Raíz del repositorio
 ┣ 📂 frontend/                    # Capa de Presentación (100% Autónoma)
 ┃ ┣ 📂 app/                       # Motor de la Aplicación Privada BI
 ┃ ┃ ┣ 📜 dashboard.html           # Panel principal de bienvenida al software
 ┃ ┃ ┣ 📜 carga_datos.html         # Hub de Análisis local (CSV/Excel y Conexiones DB)
 ┃ ┃ ┣ 📜 analisis_bi.html         # Visualización de KPIs y Dashboard interactivo
 ┃ ┃ ┣ 📜 gestion_archivos.html    # Historial de cargas y simulador de auditoría
 ┃ ┃ ┣ 📜 gestion_usuarios.html    # Base de conocimiento (CRUD frontend limits)
 ┃ ┃ ┣ 📜 perfil_usuario.html      # Demo - Edición de datos y Password
 ┃ ┃ ┗ 📜 notificaciones.html      # Bandeja centralizada y gestor de alertas
 ┃ ┃
 ┃ ┣ 📂 auth/                      # Simulador de Interfaz de Captura
 ┃ ┃ ┣ 📜 login.html               # Puerta de acceso (Credenciales Dummy)
 ┃ ┃ ┣ 📜 registro.html            # Formulario multi-paso B2B
 ┃ ┃ ┗ 📜 recuperar.html           # Flujo de recuperación (Demo UI)
 ┃ ┃
 ┃ ┣ 📂 assets/                    # Central de Recursos Estáticos
 ┃ ┃ ┣ 📂 css/                     # Hojas de estilo modulares por página
 ┃ ┃ ┃ ┣ 📜 styles.css             # Core (Variables, Landing Dark Mode)
 ┃ ┃ ┃ ┣ 📜 layout.css             # Estilos core unificados del Navbar y Sidebar BS5
 ┃ ┃ ┃ ┣ 📜 auth.css               # Tema utilitario Glassmorphism para credenciales
 ┃ ┃ ┃ ┣ 📜 [modulo].css           # Estilos específicos para cada módulo app
 ┃ ┃ ┃ ┗ 📜 notificaciones.css     # Reglas estéticas para la bandeja del hub de alertas
 ┃ ┃ ┗ 📂 js/                      # Controladores Lógicos y Motor Offline
 ┃ ┃   ┣ 📜 api.js                 # ⭐ Motor Local: Parseo CSV y Base de Datos Mock
 ┃ ┃   ┣ 📜 layout.js              # Interfaz compartida y bypass de Sesiones
 ┃ ┃   ┣ 📜 script.js              # Controlador UX del Landing Page
 ┃ ┃   ┣ 📜 auth.js                # Funciones dummy de login exitoso
 ┃ ┃   ┣ 📜 [modulo].js            # Scripts específicos de cada vista (Charts)
 ┃ ┃   ┗ 📜 notificaciones.js      # Lógica de notificaciones efímeras
 ┃ ┃
 ┃ ┣ 📜 .htaccess                  # Seguridad perimetral Apache
 ┃ ┣ 📜 index.html                 # Landing Page Comercial
 ┃ ┣ 📜 privacidad.html            # Política de Privacidad
 ┃ ┗ 📜 terminos.html              # Términos de Uso
 ┃
 ┗ 📜 DOCUMENTACION.md             # Este archivo
```

> **Servidor Recomendado**: Para ejecutar esta demo basta con usar **Live Server** (Extensión de VS Code) apuntando al directorio raíz, garantizando que los módulos importables de JS y el protocolo HTTP falso (`localStorage`) operen limpiamente.

---

## 4. Motor Backend "Invisible" (Javascript Nativo)

La diferencia primordial de esta Demo frente a desarrollos tradicionales recae en el archivo `api.js`.
Originalmente planeado como un canal de peticiones (Fetch) hacia Python, ha sido re-evolucionado para conformar todo un **Backend Inmersivo local**:

### A. Simulación de Base de Datos
* Utiliza diccionarios estáticos de Javascript interceptando todas las peticiones `GET` para imitar tiempos de latencia (200ms) y proveer datos mock realistas que varían según el Dataset.
* Emplea `sessionStorage` para memorizar variables de navegación: Esto consigue que los datasets que decidas "subir" en una pestaña sobrevivan al cerrar la página y te sigan a la pestaña de "Análisis BI".

### B. Lector de Datos Reales (Parsers HTML5)
Cuando en "Carga de Datos" proporcionas un archivo `.csv` real:
* La función `_simulateFrontendUpload()` captura físicamente el File usando el objeto nativo `FileReader`.
* La IA local decodifica el raw text, separa los elementos dependiendo de tu delimitador (`,` ó `;`) y cuenta las colúmnas reales y filas efectivas.
* Extrae el subtipo de variables (detectando si el primer objeto es numérico usando `parseFloat`) y guarda todo el contenido mapeado para ser usado por el *Gráfico Vectorial Chart.js* instantáneamente, sin colapsar tu servidor.

### C. Alertas SSE en Local
Emula el complejo sistema *"Server-Sent Events"* del backend moderno, disipando internamente elementos `window.dispatchEvent` bajo el estándar asíncrono. Los pop-ups de éxito cargan orgánicamente la misma manera estructural en la que lo harían leyendo de una nube AWS.

---

## 5. Módulos y Visualización (Layer Base)

### 5.1. Dashboard Principal (`dashboard.html`)
Es la sala de control general al entrar al sistema. Muestra un "Total Procesado", "Cargas de la semana" y "Análisis activos". Incorpora tablas estáticas simuladas de resumen y conectividad cruzada.

### 5.2. Hub de Carga de Datos (`carga_datos.html`)
*   **Carga Local**: Zona Drag & Drop interactiva expansiva. Imita el procesamiento de red usando contadores lógicos visualizados y analítica `FileReader` directa al navegador.
*   **Conector de Base de Datos Dinámica (ERP/CRM)**: Formulario avanzado para imitar integraciones (MySQL, SAP, Salesforce). Emplea callbacks (setTimeout) simuladores de latencia a firewalls inexistentes para impresionar clientes mediante experiencia de usuario y SweetAlerts vibrantes.

### 5.3. Análisis BI Avanzado (`analisis_bi.html`)
*   **Segmentación Multi-Dataset Mock**: Presenta selectores precargados con archivos emulados o parseados bajo tu sesión, y ajusta las "variables X/Y" y funciones `SUM()` al dictamen de lo procesado en tiempo real.
*   **Gráficos Optimizados**: Chart.js nativos sobre Canvas interactivos.  

---

## 6. Siguientes Pasos (A Futuro)

Si la Demo demuestra "Pre Fit Base" en su etapa MVP Frontend, la arquitectura futura debería contemplar:
1. Re-conectar el archivo `api.js` hacia rutas Fetch verdaderas conectadas a **Python/FastAPI**.
2. Desplazamiento completo de la lógica de procesamiento (`FileReader` en UI) a procesadores **Pandas** y BackgroundTasks para sostener millones de registros (actualmente capa limite en JS = 2Mbs aprox).
3. Migración de Componentes Bootstrap Vanilla a un Renderizador State-Managed **VUE 3** o **React**.
4. Activación de base de datos relacional (Postgres 16) mediante SQLAlchemy para el guardado global perpetuo.

---
*Insight360 - The Offline B2B Analytic Dashboard Demo*
