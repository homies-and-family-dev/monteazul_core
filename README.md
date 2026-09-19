# Monte Azul Suite — Core Corporativo (`monteazul_core`)

Plataforma corporativa transversal para la gestión, coordinación, trazabilidad y control de solicitudes, objetivos e interacciones operativas de Monte Azul.

---

## 1. Arquitectura Tecnológica

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org) con soporte de compilación Turbopack y React 19.
- **Base de Datos:** PostgreSQL con [Prisma ORM 7](https://www.prisma.io).
- **Estilos e Interfaz:** [Tailwind CSS v4](https://tailwindcss.com) bajo lineamientos de diseño corporativo azul institucional.
- **Autenticación:** [Auth.js / NextAuth v5](https://authjs.dev) con segregación estricta por roles y áreas.
- **Navegación:** Panel lateral colapsable (Sidebar) adaptable a escritorio y dispositivos móviles.

---

## 2. Estructura de Módulos

- **Core Corporativo de Solicitudes (`/requests`):**
  - Bandeja unificada con filtros de estado, prioridad y trazabilidad.
  - Radicación contextual transversal (`/requests/new`).
  - Detalle de expediente con gestión de estados, comentarios auditables, evidencias y subtareas operativas (`/requests/[id]`).
- **Estrategia y Gerencia (`/management` y `/goals`):**
  - Tablero ejecutivo de cuellos de botella, balance de áreas y saturación operativa.
  - Gestión de Objetivos de Área y Gerenciales con cálculo de avances e historial cronológico de auditoría.
- **Áreas Funcionales:**
  - Módulo de Marketing (`/marketing`): Tablero de requerimientos, calendario de contenidos (`/marketing/calendar`) e inventario y préstamos de equipos (`/marketing/equipment`).
- **Configuración y Catálogos (`/masters`):**
  - Administración de valores de catálogos maestros mediante submenús directos en el panel lateral de navegación.

---

## 3. Requisitos Previos e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO> monteazul_core
   cd monteazul_core
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copie el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure su cadena de conexión a PostgreSQL (`DATABASE_URL`) y clave de sesión (`AUTH_SECRET`).

4. **Sincronizar base de datos con Prisma:**
   ```bash
   npx prisma db push
   ```

5. **(Opcional) Cargar datos de prueba / demo:**
   ```bash
   npx tsx prisma/seed.ts
   ```

6. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Acceda a `http://localhost:3000` en su navegador.

---

## 4. Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local con Turbopack.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia el servidor en modo de producción tras la compilación.
- `npx prisma studio`: Abre la interfaz gráfica web de Prisma para inspeccionar la base de datos.
