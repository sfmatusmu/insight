# Sistema de Diseño Insight360

Este documento define la identidad visual y las reglas de diseño para todas las interfaces de Insight360. Debe seguirse estrictamente en cada nueva funcionalidad.

## 🎨 Paleta de Colores (Brand Colors)

| Tipo | Color (Hex) | Variable CSS | Uso |
| :-- | :-- | :-- | :-- |
| **Primario** | `#0A1128` | `--primary-color` | Fondos de secciones oscuras, rellenos principales. |
| **Secundario** | `#1A2542` | `--secondary-color` | Tarjetas (cards), elementos secundarios. |
| **Acento** | `#00E5FF` | `--accent-color` | Botones, iconos destacados, enlaces activos. |
| **Acento Dark** | `#00B3CC` | `--accent-dark` | Hover en botones de acento. |
| **Fondo Base** | `#050814` | `--dark-bg` | Color de fondo general del sitio (Modo Oscuro). |
| **Texto** | `#F8F9FA` | `--text-color` | Texto principal, títulos claros. |

### Gradientes Premium
- **Principal**: `linear-gradient(135deg, #1A2542, #0A1128)`
- **Acento**: `linear-gradient(135deg, #00E5FF, #0066FF)`
- **AI/Tecnología**: `linear-gradient(135deg, #FF007A, #6600FF)` (Magenta a Púrpura)

---

## Typography (Tipografía)

- **Fuente Principal**: `'Inter', sans-serif`
- **Pesos Disponibles**: 300, 400, 600, 700, 800.
- **Reglas de Uso**:
  - Títulos principales (Hero): `display-3`, `fw-bolder`.
  - Encabezados de sección: `fw-bold`, `text-uppercase`.
  - Cuerpo de texto: `text-white-50` para párrafos secundarios (muted clarity).

---

## 💎 Componentes y Estética (UI/UX)

1. **Modo Oscuro Predeterminado**: La interfaz siempre debe sentirse premium y tecnológica.
2. **Glassmorphism**: 
   - Clase `.glassmorphism`: `background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px);`.
   - Úsalo en formularios, modales y tarjetas destacadas.
3. **Botones**:
   - Clase `.btn-accent`: Bordes redondeados (`rounded-pill`), sombra con brillo cian.
   - Sombra normal: `box-shadow: 0 4px 15px rgba(0, 229, 255, 0.3);`.
4. **Tarjetas (Cards)**:
   - Clase `.service-card`: Borde leve (`rgba(255,255,255,0.05)`), border-radius de `1.5rem`.
   - Efecto Hover: Elevación (`translateY(-10px)`) y aura de acento.
5. **Micro-animaciones**:
   - Clase `.fade-in-up`: Para elementos que aparecen al hacer scroll.
   - Transiciones suaves (`0.3s ease-in-out`) en todos los estados hover.

---

## 📐 Estructura HTML (Bootstrap 5.3)

- **Layout**: Uso intensivo de `container`, `row`, `col`.
- **Iconografía**: [Bootstrap Icons](https://icons.getbootstrap.com/).
- **Navegación**: Clase `.navbar-shrink` para cambios de opacidad y desenfoque (blur) al hacer scroll.
