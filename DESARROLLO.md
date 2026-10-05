# 🛠️ Guía de desarrollo y mantenimiento de Zen

Este archivo es para **ti, como mantenedor**. Los usuarios solo necesitan el
[`README.md`](README.md).

---

## 📂 Estructura

```
Zen/
├── index.html              → Estructura de la app
├── styles.css              → (en assets/css/) Diseño, temas y animaciones
├── app.js                  → (en assets/js/) Tareas, finanzas, notas y tema
├── manifest.webmanifest    → La hace instalable (PWA)
├── sw.js                   → Caché offline (service worker)
├── icons/                  → Iconos PNG + favicon SVG
├── screenshots/            → Capturas que usa el README
├── serve.ps1               → Servidor local para probar
├── make-icons.ps1          → Regenera los iconos
├── LICENSE                 → MIT
├── README.md               → Presentación para usuarios
└── DESARROLLO.md           → Este archivo
```

## ▶ Ejecutar en local

No necesita compilación ni dependencias:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# → http://localhost:8757
```

Alternativas: doble clic en `index.html`, o *Live Server* de VS Code.

## 📝 Flujo de trabajo recomendado

1. Edita los archivos (`index.html`, `assets/css/styles.css`, `assets/js/app.js`).
2. Recarga el navegador (`Ctrl+F5` para ignorar la caché).
3. Prueba las tres pestañas y los dos temas.
4. Sube los cambios a GitHub (abajo).

> 💡 Instala [Git](https://git-scm.com/download/win) o
> [GitHub Desktop](https://desktop.github.com/) para actualizar el repositorio
> desde tu PC. Sin Git, puedes volver a arrastrar los archivos a github.com
> (*Add file → Upload files*) y sobrescribir los modificados.

## 🚀 Publicar por primera vez

### Opción A — Desde la web de GitHub (sin instalar nada)

1. Crea la cuenta en [github.com](https://github.com) → **+** → *New repository* → nombre `zen` → **Create**.
2. *Add file → Upload files* → arrastra la carpeta `Zen` → **Commit changes**.
3. **Settings → Pages** → rama `main`, carpeta `/ (root)` → **Save**.
4. En unos segundos la app estará en `https://TU-USUARIO.github.io/zen/`.

### Opción B — Con Git

```bash
cd "C:\Users\david\Documents\Default Project\Zen"
git init
git add .
git commit -m "Descripción del cambio"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/zen.git
git push -u origin main
```

> Después de publicar, reemplaza `TU-USUARIO` en el `README.md`
> (aparece en 2 enlaces) por tu usuario real.

## 📱 Caché del teléfono (importante)

Los teléfonos guardan la app con el *service worker* para usarla sin internet.
Cuando publiques **cambios visibles**, sube `VERSION` en `sw.js`
(p. ej. `'zen-v2'`) para que todos los equipos descarguen la nueva versión:

```js
const VERSION = 'zen-v2';   // sw.js, línea 4
```

## 🎨 Personalización frecuente

| Qué cambiar | Dónde |
|---|---|
| Moneda (`$` → `€`, `MX$`…) | `app.js` → función `money()` |
| Categorías de finanzas | `app.js` → `EXPENSE_CATS` e `INCOME_CATS` |
| Colores y degradados | `styles.css` → `:root` (claro) y `[data-theme="dark"]` |
| Nombres de pestañas | `index.html` → barra `.tab-bar` |
| Textos de bienvenida | `app.js` → nota sembrada al inicio |

## 🖼️ Regenerar los iconos

Si cambias el logo o los colores:

```powershell
powershell -ExecutionPolicy Bypass -File make-icons.ps1
```

## 🔄 Estructura de datos (localStorage)

Las claves usan el prefijo `zen:`:

| Clave | Contenido |
|---|---|
| `zen:tasks` | `[{ id, text, done, createdAt }]` |
| `zen:txs` | `[{ id, type, amount, emoji, cat, note, date, createdAt }]` |
| `zen:notes` | `[{ id, title, body, createdAt, updatedAt }]` |
| `zen:theme` | `'light'` o `'dark'` (sin JSON) |
| `zen:view` | Última pestaña abierta |
| `zen:seeded` | Controla la nota de bienvenida |

Cambiar el prefijo o la estructura exige migración o limpieza de datos del usuario.
