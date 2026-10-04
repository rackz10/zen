# 🌿 Zen

**Zen** es una aplicación web (PWA) para organizar tu día en un solo lugar:

- ✅ **Tareas** — crea tu lista diaria y márcalas como completadas, con barra de progreso.
- 💰 **Finanzas** — registra tus ingresos y gastos, y descubre **con cuánto dinero cuentas cada quincena** (y cuánto puedes gastar al día).
- 📝 **Notas** — escribe tus pensamientos, ideas o recordatorios que quieras tener a mano.

Con estilo **iOS "cristal líquido"**, interfaz en **blanco (modo claro)** y **modo oscuro**. Tus datos se guardan **en tu dispositivo**, sin servidores ni cuentas.

---

## 📱 Cómo instalarla en tu iPhone

1. Abre la web de tu repositorio en **Safari** (una vez publicada con GitHub Pages).
2. Toca el botón **Compartir** (el cuadrado con la flecha ▲).
3. Elige **«Agregar a pantalla de inicio»**.
4. Ponle el nombre que quieras (Zen) y toca **Añadir**.

Ya aparecerá como una app independiente, a pantalla completa y con tus propios iconos.
Funciona **sin internet** gracias al *service worker*: todo lo que guardes se queda en el móvil.

---

## 🖥️ Cómo probarla en tu PC

No necesita compilación ni dependencias. Cualquiera de estas opciones:

- **Doble clic** en `index.html` (se abre en el navegador), o
- Con [Visual Studio Code](https://code.visualstudio.com/) + extensión *Live Server*, o
- `npx serve .` en la carpeta del proyecto (si tienes Node.js).

> Durante el desarrollo con `file://` no se registra el *service worker* (es normal). En GitHub Pages (HTTPS) sí funcionará.

---

## 🚀 Cómo subirlo a GitHub (tu primer repositorio)

### Opción A — Desde la web de GitHub (la más rápida, sin instalar nada)

1. Crea una cuenta en [github.com](https://github.com) (si aún no la tienes).
2. Pulsa el botón verde **«+»** arriba a la derecha → **New repository**.
3. Nombre: `zen` (o el que prefieras) → deja **Public** → **Create repository**.
4. En la página del repositorio, pulsa **uploading an existing file** (o *Add file → Upload files*).
5. **Arrastra toda la carpeta `Zen`** con todo su contenido → **Commit changes**.

### Opción B — Con Git desde la terminal

```bash
cd "C:\Users\david\Documents\Default Project\Zen"
git init
git add .
git commit -m "Primera versión de Zen"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/zen.git
git push -u origin main
```

> 💡 En tu PC **no tienes Git instalado** todavía. Puedes instalarlo desde [git-scm.com](https://git-scm.com/download/win) o usar la aplicación gráfica [GitHub Desktop](https://desktop.github.com/), que es muy amigable para empezar.

### Activar GitHub Pages (web pública gratis)

1. En tu repositorio → pestaña **Settings** → **Pages**.
2. En *Source*: rama **main** y carpeta **/ (root)** → **Save**.
3. En unos segundos tu app estará en:
   `https://TU-USUARIO.github.io/zen/`

Cada vez que hagas un *push*, GitHub Pages se actualiza solo. ✨

---

## 🗂️ Estructura del proyecto

```
Zen/
├── index.html              → Estructura de la app
├── manifest.webmanifest    → La hace instalable (PWA)
├── sw.js                   → Funcionamiento sin internet
├── assets/
│   ├── css/styles.css      → Diseño "cristal líquido" + modo oscuro
│   └── js/app.js           → Tareas, finanzas, notas y temas
├── icons/                  → Iconos (192, 512, Apple touch y favicon)
├── make-icons.ps1          → Regenera los iconos si cambias el diseño
└── README.md
```

---

## ✏️ Cómo personalizarla

- **Moneda**: en `assets/js/app.js` busca la función `money()` y cambia `'$'` por `'€'`, `'MX$'`, etc.
- **Categorías de finanzas**: en `app.js` están los arreglos `EXPENSE_CATS` e `INCOME_CATS` (emoji + nombre).
- **Colores**: los gradientes y acentos están en `assets/css/styles.css` dentro de `:root` (modo claro) y `[data-theme="dark"]` (modo oscuro).
- **Actualizar la app para los usuarios**: sube el valor de `VERSION` en `sw.js` (por ejemplo `zen-v2`) para que los móviles descarguen la nueva versión.

## 🔒 Datos y privacidad

Todo se guarda en el `localStorage` del navegador, **solo en tu dispositivo**. No hay base de datos ni envío de información a terceros.
Si borres los datos del sitio en Safari, se borrarán también las tareas, finanzas y notas: puedes copiarlas antes desde la app.

---

Hecho con HTML, CSS y JavaScript puros — sin frameworks. 💜
