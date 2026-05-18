# 🚀 GUÍA DE DESPLIEGUE EN PRODUCCIÓN — NELVYON PLATFORM

## 📐 DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIOS / CLIENTES                         │
│                    (Navegador Web / Móvil)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS (puerto 443)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DOMINIO + CLOUDFLARE                            │
│              nelvyon.com / app.nelvyon.com                          │
│         (DNS, CDN, Certificado SSL/HTTPS automático)                │
└──────────┬─────────────────────────────────┬────────────────────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────┐          ┌───────────────────────────┐
│   FRONTEND (React)  │          │   BACKEND (FastAPI/Python) │
│                     │          │                           │
│  • Vite + React 18  │  fetch   │  • FastAPI + Uvicorn      │
│  • shadcn/ui        │ -------> │  • SQLAlchemy + asyncpg   │
│  • Tailwind CSS     │  /api/*  │  • JWT Auth               │
│  • 54+ páginas SPA  │          │  • 29 servicios/routers   │
│  • Code-splitting   │          │  • AI Hub (OpenAI)        │
│                     │          │  • Stripe Payments        │
│  Archivos estáticos │          │  • File Storage           │
│  (dist/ → CDN)      │          │                           │
└─────────────────────┘          └─────────────┬─────────────┘
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │   BASE DE DATOS            │
                                 │   PostgreSQL 15+           │
                                 │                           │
                                 │  • 18 tablas de datos     │
                                 │  • Migraciones Alembic    │
                                 │  • Conexión asyncpg       │
                                 └───────────────────────────┘

SERVICIOS EXTERNOS:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  OpenAI API  │  │  Stripe API  │  │  Storage S3  │
│  (AI Hub)    │  │  (Pagos)     │  │  (Archivos)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🏆 RECOMENDACIÓN DE PLATAFORMA

### Comparativa Detallada

| Criterio | **Vercel + Railway** ⭐ | **Render** | **AWS (ECS/Lambda)** | **Hostinger** |
|---|---|---|---|---|
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Estabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Coste mensual** | ~$25-40/mes | ~$20-35/mes | ~$50-150/mes | ~$12-25/mes |
| **CI/CD automático** | ✅ Sí | ✅ Sí | ⚙️ Configurar | ❌ Manual |
| **SSL/HTTPS** | ✅ Automático | ✅ Automático | ⚙️ Configurar | ✅ Automático |
| **PostgreSQL incluido** | ✅ Railway | ✅ Sí | ⚙️ RDS aparte | ❌ No nativo |
| **Ideal para SaaS** | ✅ Perfecto | ✅ Bueno | ✅ Enterprise | ❌ No ideal |

### ❌ Por qué NO Hostinger

Hostinger es excelente para **WordPress y sitios estáticos**, pero **NO es adecuado** para Nelvyon porque:

1. **No soporta FastAPI/Python** nativamente — necesitarías VPS y configurar todo manualmente
2. **No tiene PostgreSQL** gestionado — tendrías que instalarlo tú mismo
3. **No tiene CI/CD** — cada despliegue sería manual por SSH
4. **No escala automáticamente** — si tienes un pico de tráfico, se cae
5. **No tiene WebSockets nativos** — necesarios para chat en tiempo real

### ✅ RECOMENDACIÓN: **Vercel (Frontend) + Railway (Backend + BD)**

**¿Por qué esta combinación?**
- **Vercel**: El mejor hosting del mundo para React/Vite. CDN global, HTTPS automático, deploys con git push
- **Railway**: Backend Python + PostgreSQL en un solo lugar. Escala automáticamente, sin configurar servidores

---

## 📋 PLANES MÍNIMOS RECOMENDADOS

### Opción A: Vercel + Railway (RECOMENDADA)

| Servicio | Plan | Coste | Incluye |
|---|---|---|---|
| **Vercel** | Pro | $20/mes | Frontend ilimitado, CDN global, analytics, 1TB bandwidth |
| **Railway** | Starter | $5/mes + uso | Backend FastAPI, 8GB RAM, vCPU escalable |
| **Railway PostgreSQL** | Incluido | ~$5-10/mes | 1GB storage, backups automáticos |
| **TOTAL** | | **~$30-35/mes** | |

### Opción B: Render (Todo en uno)

| Servicio | Plan | Coste | Incluye |
|---|---|---|---|
| **Render Web Service** | Starter | $7/mes | Backend FastAPI, 512MB RAM |
| **Render Static Site** | Free/Starter | $0-7/mes | Frontend React |
| **Render PostgreSQL** | Starter | $7/mes | 1GB storage, backups |
| **TOTAL** | | **~$14-21/mes** | |

### Opción C: AWS (Enterprise)

| Servicio | Plan | Coste | Incluye |
|---|---|---|---|
| **CloudFront + S3** | Pay-as-you-go | ~$5/mes | Frontend CDN |
| **ECS Fargate / Lambda** | Pay-as-you-go | ~$20-50/mes | Backend |
| **RDS PostgreSQL** | db.t3.micro | ~$15-30/mes | Base de datos |
| **TOTAL** | | **~$40-85/mes** | |

---

## 🛠️ GUÍA PASO A PASO — Opción A (Vercel + Railway)

### PASO 1: Preparar el Código

#### 1.1 Crear repositorio en GitHub

```bash
# En tu ordenador, instala Git si no lo tienes:
# Windows: https://git-scm.com/download/win
# Mac: brew install git

# Descarga el código desde Atoms (botón "Export" arriba a la derecha)
# Descomprime el ZIP en una carpeta, por ejemplo: ~/nelvyon

cd ~/nelvyon

# Inicializa Git
git init
git add .
git commit -m "Nelvyon Platform v1.0 - Initial release"

# Ve a https://github.com y crea un nuevo repositorio llamado "nelvyon"
# Luego conecta tu código:
git remote add origin https://github.com/TU_USUARIO/nelvyon.git
git branch -M main
git push -u origin main
```

#### 1.2 Estructura del repositorio

```
nelvyon/
├── frontend/          ← Lo que sube a Vercel
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── backend/           ← Lo que sube a Railway
│   ├── main.py
│   ├── requirements.txt
│   ├── core/
│   ├── services/
│   ├── routers/
│   └── ...
└── README.md
```

---

### PASO 2: Desplegar el BACKEND en Railway

#### 2.1 Crear cuenta en Railway

1. Ve a **https://railway.app**
2. Haz clic en **"Start a New Project"**
3. Inicia sesión con tu cuenta de **GitHub**

#### 2.2 Crear la Base de Datos PostgreSQL

1. En el dashboard de Railway, haz clic en **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway creará automáticamente una base de datos
3. Haz clic en la base de datos → pestaña **"Variables"**
4. Copia el valor de **`DATABASE_URL`** (lo necesitarás después)
   - Será algo como: `postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway`

#### 2.3 Desplegar el Backend

1. En Railway, haz clic en **"+ New"** → **"GitHub Repo"**
2. Selecciona tu repositorio **nelvyon**
3. Railway detectará el proyecto. Configura:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### 2.4 Configurar Variables de Entorno del Backend

En Railway → tu servicio backend → pestaña **"Variables"**, añade:

```env
# Base de datos (copia la URL de PostgreSQL que creaste)
DATABASE_URL=postgresql+asyncpg://postgres:XXXX@containers-us-west-XXX.railway.app:5432/railway

# Seguridad - Genera una clave secreta aleatoria
# Puedes generar una en: https://randomkeygen.com (copia una de 256-bit)
SECRET_KEY=tu_clave_secreta_super_larga_y_aleatoria_aqui

# Modo producción
DEBUG=false
IS_LAMBDA=false

# CORS - Permitir tu dominio frontend
CORS_ORIGINS=https://nelvyon.com,https://app.nelvyon.com,https://nelvyon.vercel.app

# OpenAI (para el AI Hub - chatbots, generación de contenido)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
# Obtén tu key en: https://platform.openai.com/api-keys

# Stripe (para pagos y facturación)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
# Obtén tus keys en: https://dashboard.stripe.com/apikeys

# Puerto (Railway lo asigna automáticamente)
PORT=8000
```

#### 2.5 Verificar el Backend

Una vez desplegado, Railway te dará una URL como:
`https://nelvyon-backend-production.up.railway.app`

Prueba en tu navegador:
- `https://nelvyon-backend-production.up.railway.app/health` → Debe responder `{"status": "ok"}`
- `https://nelvyon-backend-production.up.railway.app/docs` → Documentación Swagger de la API

---

### PASO 3: Desplegar el FRONTEND en Vercel

#### 3.1 Crear cuenta en Vercel

1. Ve a **https://vercel.com**
2. Haz clic en **"Sign Up"** → Inicia sesión con **GitHub**

#### 3.2 Importar el Proyecto

1. Haz clic en **"Add New..."** → **"Project"**
2. Selecciona tu repositorio **nelvyon** de GitHub
3. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

#### 3.3 Configurar Variables de Entorno del Frontend

En Vercel → Settings → Environment Variables, añade:

```env
# URL del backend en Railway
VITE_API_BASE_URL=https://nelvyon-backend-production.up.railway.app

# Título de la aplicación
VITE_APP_TITLE=Nelvyon
VITE_APP_DESCRIPTION=Plataforma SaaS Elite #1 Mundial

# Stripe (clave pública, NO la secreta)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
```

#### 3.4 Desplegar

1. Haz clic en **"Deploy"**
2. Vercel construirá y desplegará automáticamente
3. Te dará una URL como: `https://nelvyon.vercel.app`

---

### PASO 4: Conectar Frontend con Backend

#### 4.1 Configurar la conexión API

En tu código frontend, el archivo `src/lib/api.ts` debe apuntar a la variable de entorno:

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = {
  fetch: async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return response;
  },
};
```

#### 4.2 Configurar CORS en el Backend

El backend ya tiene CORS configurado en `main.py`. Asegúrate de que la variable `CORS_ORIGINS` incluya tu dominio de Vercel:

```env
CORS_ORIGINS=https://nelvyon.com,https://app.nelvyon.com,https://nelvyon.vercel.app
```

---

### PASO 5: Configurar Dominio Personalizado + HTTPS

#### 5.1 Comprar dominio (si no lo tienes)

Recomendaciones:
- **Namecheap**: https://namecheap.com (~$10/año para .com)
- **Cloudflare Registrar**: https://dash.cloudflare.com (~$9/año, el más barato)
- **Google Domains**: https://domains.google

#### 5.2 Configurar DNS con Cloudflare (RECOMENDADO)

1. Crea cuenta en **https://cloudflare.com** (plan gratuito)
2. Añade tu dominio `nelvyon.com`
3. Cloudflare te dará 2 nameservers. Ve a tu registrador de dominio y cámbialos
4. En Cloudflare DNS, añade estos registros:

```
Tipo    Nombre              Valor                                    Proxy
─────   ──────              ─────                                    ─────
CNAME   @                   cname.vercel-dns.com                     ✅ On
CNAME   www                 cname.vercel-dns.com                     ✅ On
CNAME   api                 nelvyon-backend-production.up.railway.app ✅ On
```

#### 5.3 Añadir dominio en Vercel

1. Ve a Vercel → tu proyecto → Settings → Domains
2. Añade `nelvyon.com` y `www.nelvyon.com`
3. Vercel configurará HTTPS automáticamente (certificado Let's Encrypt)

#### 5.4 Añadir dominio en Railway

1. Ve a Railway → tu servicio backend → Settings → Domains
2. Añade `api.nelvyon.com`
3. Railway configurará HTTPS automáticamente

#### 5.5 Actualizar variables de entorno

**En Vercel** (frontend):
```env
VITE_API_BASE_URL=https://api.nelvyon.com
```

**En Railway** (backend):
```env
CORS_ORIGINS=https://nelvyon.com,https://www.nelvyon.com
```

---

### PASO 6: Despliegue Nuevo SIN Romper Producción

#### 6.1 Flujo de trabajo seguro (CI/CD automático)

```
┌──────────────┐     git push      ┌──────────────┐    automático    ┌──────────────┐
│  Tu código   │ ───────────────> │   GitHub     │ ──────────────> │  Vercel /    │
│  local       │                   │   (main)     │                  │  Railway     │
└──────────────┘                   └──────────────┘                  └──────────────┘
                                                                      Deploy nuevo
                                                                      sin downtime
```

#### 6.2 Pasos para un despliegue seguro

```bash
# 1. Crea una rama para tus cambios (NUNCA trabajes directamente en main)
git checkout -b feature/nueva-funcionalidad

# 2. Haz tus cambios y prueba localmente
pnpm run build   # Verifica que compila sin errores
pnpm run lint    # Verifica que no hay errores de código

# 3. Sube los cambios
git add .
git commit -m "Añadir nueva funcionalidad X"
git push origin feature/nueva-funcionalidad

# 4. En GitHub, crea un Pull Request de feature/nueva-funcionalidad → main
#    Vercel creará automáticamente una "Preview URL" para que pruebes

# 5. Si todo funciona bien en la preview, haz Merge a main
#    Vercel y Railway desplegarán automáticamente la nueva versión

# 6. Si algo sale mal, en Vercel puedes hacer "Rollback" con un clic
#    En Railway también puedes revertir al deploy anterior
```

#### 6.3 Rollback de emergencia

**En Vercel:**
1. Ve a Deployments
2. Busca el deploy anterior que funcionaba
3. Haz clic en los 3 puntos → **"Promote to Production"**
4. En 5 segundos estás de vuelta a la versión anterior

**En Railway:**
1. Ve a Deployments
2. Haz clic en el deploy anterior
3. **"Redeploy"**

---

### PASO 7: Migrar Base de Datos

#### 7.1 Ejecutar migraciones en producción

```bash
# Conéctate a Railway CLI (instálalo primero)
npm install -g @railway/cli
railway login

# Ejecuta las migraciones de Alembic
railway run alembic upgrade head
```

#### 7.2 Alternativa: Las migraciones se ejecutan automáticamente

El backend de Nelvyon ya tiene `initialize_database()` en el startup que crea las tablas automáticamente al arrancar. Solo necesitas Alembic para cambios futuros en el esquema.

---

## ✅ CHECKLIST POST-DESPLIEGUE

### Tests Básicos de Funcionamiento

```
FRONTEND (https://nelvyon.com)
─────────────────────────────────────────────────
□ 1. La página de login carga correctamente
□ 2. El logo "N" de Nelvyon aparece en el login
□ 3. Se puede iniciar sesión (modo demo o credenciales reales)
□ 4. El Dashboard OS carga con las 6 KPIs
□ 5. La navegación entre secciones es instantánea
□ 6. El panel de Agentes muestra todos los agentes
□ 7. Se puede acceder al chat de agentes
□ 8. Todas las páginas OS cargan sin errores en consola

SAAS (https://nelvyon.com/saas/*)
─────────────────────────────────────────────────
□ 9.  El dashboard SaaS carga correctamente
□ 10. CRM muestra contactos y se pueden crear nuevos
□ 11. Pipelines muestra los deals
□ 12. Calendario funciona y muestra citas
□ 13. Conversaciones / Chat funciona
□ 14. Campañas de email se pueden crear
□ 15. Funnels builder carga correctamente
□ 16. Social Media muestra el generador de contenido
□ 17. Video Ads Studio carga
□ 18. Contratos se pueden generar
□ 19. PDF Generator funciona
□ 20. Reportes y Analytics cargan con gráficos
□ 21. Pagos/Stripe conecta correctamente
□ 22. Integraciones muestra las conexiones disponibles
□ 23. Partners muestra los planes
□ 24. Settings permite cambiar configuración

BACKEND (https://api.nelvyon.com)
─────────────────────────────────────────────────
□ 25. /health responde {"status": "ok"}
□ 26. /docs muestra la documentación Swagger
□ 27. POST /auth/login funciona con credenciales
□ 28. GET /contacts devuelve datos (con token)
□ 29. La base de datos tiene todas las tablas creadas
□ 30. Los logs no muestran errores críticos

SEGURIDAD
─────────────────────────────────────────────────
□ 31. HTTPS funciona en todos los dominios (candado verde)
□ 32. Las API keys NO están expuestas en el frontend
□ 33. CORS solo permite los dominios autorizados
□ 34. Los tokens JWT expiran correctamente
□ 35. Las contraseñas están hasheadas en la BD

RENDIMIENTO
─────────────────────────────────────────────────
□ 36. Tiempo de carga inicial < 3 segundos
□ 37. Navegación entre páginas < 500ms
□ 38. No hay errores en la consola del navegador
□ 39. Las imágenes cargan correctamente
□ 40. La aplicación funciona en móvil
```

---

## 💰 RESUMEN DE COSTES MENSUALES

### Configuración Recomendada (Vercel + Railway)

| Servicio | Coste |
|---|---|
| Vercel Pro (Frontend) | $20/mes |
| Railway (Backend + PostgreSQL) | $10-15/mes |
| Cloudflare (DNS + CDN) | $0 (plan gratuito) |
| Dominio (.com) | ~$1/mes ($12/año) |
| OpenAI API (AI Hub) | ~$5-20/mes (según uso) |
| Stripe | 2.9% + $0.30 por transacción |
| **TOTAL FIJO** | **~$31-36/mes** |

### Cuando escales (100+ usuarios)

| Servicio | Coste |
|---|---|
| Vercel Pro | $20/mes |
| Railway (más recursos) | $25-50/mes |
| Cloudflare Pro | $20/mes |
| PostgreSQL dedicado | $25-50/mes |
| **TOTAL** | **~$90-140/mes** |

---

## 🔐 VARIABLES DE ENTORNO — LISTA COMPLETA

### Frontend (.env en Vercel)

```env
VITE_API_BASE_URL=https://api.nelvyon.com
VITE_APP_TITLE=Nelvyon
VITE_APP_DESCRIPTION=Plataforma SaaS Elite
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Backend (Variables en Railway)

```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Seguridad
SECRET_KEY=clave_aleatoria_256_bits
DEBUG=false
IS_LAMBDA=false

# CORS
CORS_ORIGINS=https://nelvyon.com,https://www.nelvyon.com

# APIs externas
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Servidor
PORT=8000
HOST=0.0.0.0
```

---

## 📞 SOPORTE Y RECURSOS

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Cloudflare Docs**: https://developers.cloudflare.com
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Stripe Docs**: https://stripe.com/docs

---

*Documento generado el 5 de Abril de 2026 para Nelvyon Platform v1.0*
*Arquitectura: React 18 + Vite + shadcn/ui (Frontend) | FastAPI + SQLAlchemy + PostgreSQL (Backend)*