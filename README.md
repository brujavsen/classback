# ClassBack 📚

**ClassBack** es una plataforma educativa colaborativa en formato de **Progressive Web App (PWA)**, pensada para docentes y alumnos que quieren compartir apuntes, imágenes y material de estudio de forma organizada, rápida y segura.

---

## ¿Qué es ClassBack?

ClassBack reimagina el espacio educativo como un muro colaborativo al estilo de una red social. Los administradores (docentes) pueden crear **clases**, organizar el contenido en **espacios temáticos** y subir material (imágenes, PDFs). Los alumnos pueden unirse a las clases, explorar el material y participar con **comentarios en hilo** y **reacciones**.

---

## Funcionalidades principales

### Roles del sistema
| Función | Administrador (Docente) | Alumno |
|---|---|---|
| Crear clases | ✅ | ❌ |
| Publicar imágenes y PDFs | ✅ | ✅ |
| Eliminar publicaciones ajenas | ✅ | ❌ |
| Eliminar propias publicaciones | ✅ | ✅ |
| Comentar y responder en hilo | ✅ | ✅ |
| Reaccionar con emojis | ✅ | ✅ |
| Unirse a clases | ✅ | ✅ |

### Feed de Contenido
- 📸 Publicación de **imágenes** (click para ver en pantalla completa)
- 📄 Publicación de **PDFs** con miniatura visual (se abren en nueva pestaña, sin descarga)
- 🔍 **Búsqueda** de publicaciones por descripción o autor
- 💬 **Comentarios en tiempo real** con sistema de hilos anidados
- ❤️ **5 reacciones** por publicación y por comentario (❤️ 👍 🔥 👀 😮)
- 🔔 **Notificaciones** en tiempo real (nueva publicación, nuevo comentario, nueva respuesta)

### Autenticación
- Email y contraseña con validación estricta de correo real
- Google OAuth (inicio de sesión con Google)
- Recuperación de contraseña por email
- Perfil editable (nombre de usuario, foto, contraseña)

### Espacios
- Cada clase puede tener múltiples espacios temáticos (ej: "Teoría", "Práctica", "Consultas")
- Los alumnos eligen a cuáles espacios unirse
- Tiempo real: todas las actualizaciones se reflejan instantáneamente sin recargar

### PWA (Progressive Web App)
- Instalable en Android, iOS y escritorio como aplicación nativa
- Icono de aplicación propio de ClassBack
- Experiencia de usuario fluida sin tiempos de carga innecesarios

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 |
| Estilado | CSS Vanilla (Dark Crimson Theme) |
| Backend/DB | Supabase (PostgreSQL + Realtime) |
| Almacenamiento | Supabase Storage |
| Autenticación | Supabase Auth + Google OAuth |
| PWA | vite-plugin-pwa |
| Deploy | Netlify (CD automático desde GitHub) |

---

## Estructura del proyecto

```
classback/
├── public/              # Assets públicos (logo, favicons)
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── context/         # AuthContext, ModalContext
│   ├── lib/             # Cliente de Supabase
│   └── pages/           # Páginas de la aplicación
│       ├── Login.jsx
│       ├── Register.jsx
│       ├── Dashboard.jsx
│       ├── ClassView.jsx
│       ├── SpaceChat.jsx  ← Feed principal
│       └── Profile.jsx
├── .env.example         # Variables de entorno requeridas
├── vite.config.js
└── package.json
```

---

## Configuración local

### 1. Clona el repositorio

```bash
git clone https://github.com/brujavsen/classback.git
cd classback
```

### 2. Instala dependencias

```bash
npm install --legacy-peer-deps
```

### 3. Configura las variables de entorno

```bash
cp .env.example .env.development
```

Edita `.env.development` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Inicia el servidor de desarrollo

```bash
npm run dev
```

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase |

> ⚠️ **Nunca subas tu archivo `.env` al repositorio.** Está bloqueado en `.gitignore`.

---

## Deploy en Netlify

1. Conecta tu repositorio de GitHub en [netlify.com](https://www.netlify.com)
2. Configura en Netlify → **Environment Variables** las mismas variables del `.env`
3. El despliegue se realiza automáticamente con cada `push` a la rama `main`

---

## Licencia

Este proyecto está bajo uso privado de desarrollo. Para consultas de uso o colaboración, contactar al equipo de ClassBack.
