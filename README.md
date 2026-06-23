# Cotizador para Contratistas

Aplicación web **compartida** para que un equipo arme cotizaciones entre varias
personas, en lugar de mandarse el cuadro por correo. Cada quien entra al mismo
link, sube su parte, y el sistema junta todo y calcula el precio final **en vivo**.

100% en español (Guatemala), pensada **mobile-first** y también para computadora.

---

## ¿Qué hace?

- **Tablero** con todas las cotizaciones: búsqueda, filtro por estado y por
  cliente, % de avance, precio final, y botón para **duplicar** (nueva versión).
- **Cotización por secciones**, cada una con cierre de "mi parte", notas y quién
  la tocó por última vez:
  1. **Materiales** — descripción, tipo, unidad, cantidad, precio unitario, subtotal por renglón.
  2. **Mano de obra y tiempos** — partidas + tiempo estimado de obra (días).
  3. **Otros costos** — concepto + monto (transporte, equipo, imprevistos…).
  4. **Consolidación (automática)** — subtotales, desperdicio, imprevistos, costo base.
  5. **Markup y precio final** — el **gerente** ajusta markup o margen objetivo, ve la ganancia, el precio sin IVA, el IVA y el precio final, y **aprueba (bloquea)**.
- **Importar Excel de precios**: subís el `.xlsx`, **Claude** detecta las columnas
  (aunque tengan otros nombres) y devolvés una vista previa para revisar antes de aplicar.
- **Precio estimado** cuando un material no tiene precio: prioriza el **historial**
  de la empresa; si no hay, usa **Claude**; suma un **margen de seguridad** y queda
  marcado como *estimado* (editable a mano).
- **Revisar** (reglas fijas + criterio de Claude): lista priorizada de cosas a
  revisar antes de aprobar. Informativo, no bloquea.
- **Historial** de quién cambió qué y cuándo.
- **Adjuntos**: planos y fotos (PDF e imágenes) con vista previa, descarga y borrado.
- **Vista cliente / PDF**: versión limpia sin costos internos, lista para imprimir o guardar como PDF.
- **Estado compartido** por polling (auto-refresco cada 6 s). Preparado para websockets a futuro.

---

## Tecnología

- **Next.js 14** (App Router) — frontend React + API routes en un solo proyecto.
- **Prisma + SQLite** — base de datos (fácil de migrar a Postgres).
- **Tailwind CSS** — estilos mobile-first.
- **Claude (Anthropic)** — solo en el servidor; la API key va en variable de entorno.
- **xlsx (SheetJS)** — lectura de los Excel.

El **servidor es la fuente de la verdad**: todos los que tienen el link ven los mismos datos.

---

## Requisitos

- Node.js 18.18+ (recomendado 20 o 22).
- Una API key de Anthropic (para Excel, estimados y "Revisar").

---

## Instalación local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#   editá .env y poné tu ANTHROPIC_API_KEY

# 3. Crear la base de datos (SQLite)
npm run db:push

# 4. (Opcional) datos de ejemplo
npm run db:seed

# 5. Arrancar en desarrollo
npm run dev
```

Abrí http://localhost:3000

Para verificar las fórmulas de cálculo:

```bash
npm run test:calc
```

---

## Variables de entorno

| Variable            | Obligatoria | Descripción                                                                 |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`      | Sí          | SQLite: `file:./dev.db`. Postgres: `postgresql://...`.                       |
| `ANTHROPIC_API_KEY` | Sí (para IA)| Key de Anthropic. **Solo se usa en el servidor**, nunca en el navegador.    |
| `ANTHROPIC_MODEL`   | No          | Modelo de Claude. Por defecto `claude-sonnet-4-6`. Confirmá el string vigente en https://docs.claude.com |
| `UPLOAD_DIR`        | No          | Carpeta de archivos subidos. Por defecto `./uploads`. En la nube, usá un disco persistente. |

> Sin `ANTHROPIC_API_KEY`, la app funciona igual para cotizar a mano; solo se
> desactivan las funciones con IA (importar Excel, estimar precio, y la parte de
> "Revisar" que usa criterio — las reglas fijas siguen funcionando).

---

## Despliegue

### Render (recomendado, incluido `render.yaml`)

1. Subí el repo a GitHub.
2. En Render: **New > Blueprint**, elegí el repo. Render lee `render.yaml`.
3. El blueprint crea un **disco persistente** en `/data` para la base SQLite y los archivos.
4. En el panel, configurá el secreto **`ANTHROPIC_API_KEY`**.
5. Deploy. (Build: `npm install && npm run build`; Start: `npm run start`.)

### Railway

1. **New Project > Deploy from GitHub repo**.
2. Agregá un **Volume** montado en `/data`.
3. Variables: `DATABASE_URL=file:/data/dev.db`, `UPLOAD_DIR=/data/uploads`,
   `ANTHROPIC_API_KEY=...`, `ANTHROPIC_MODEL=claude-sonnet-4-6`.
4. Build: `npm install && npm run build` · Start: `npm run start`.

### Nota sobre SQLite vs Postgres

SQLite necesita un **disco persistente** (por eso Render/Railway con volumen).
Para migrar a Postgres: cambiá `provider = "postgresql"` en
`prisma/schema.prisma`, poné la `DATABASE_URL` de Postgres, y reemplazá
`prisma db push` por migraciones (`prisma migrate deploy`) en producción.
El almacenamiento de archivos en disco también podría moverse a S3/R2 a futuro.

---

## Acceso (ahora vs. después)

**Ahora:** sin login. Al abrir una cotización, la persona escribe su nombre y
elige su rol; eso se recuerda en el navegador y atribuye sus cambios en el
historial. Cualquiera con el link puede ver y editar. La sección de markup está
marcada como del **Gerente** (la app valida el rol elegido).

**Diseñado para después (no construido):** autenticación real, permisos por rol
estrictos, administración de usuarios, notificaciones y websockets. La base de
datos ya incluye una tabla `User` con roles y los campos necesarios para
agregar todo eso sin rehacer el sistema.

---

## Fórmulas (exactas)

```
subtotal_material   = cantidad × precio_unitario           (por renglón)
subtotal_materiales = Σ subtotal_material
desperdicio         = subtotal_materiales × desperdicio%    (def. 5%)
materiales_total    = subtotal_materiales + desperdicio
subtotal_mano_obra  = Σ (cantidad × costo_unitario)
subtotal_otros      = Σ montos
suma_costos         = materiales_total + subtotal_mano_obra + subtotal_otros
imprevistos         = suma_costos × imprevistos%            (def. 5%)
costo_base          = suma_costos + imprevistos
ganancia            = costo_base × markup%
precio_sin_iva      = costo_base + ganancia
margen%             = ganancia / precio_sin_iva × 100
iva                 = precio_sin_iva × iva%                 (def. 12%)
precio_final        = precio_sin_iva + iva
```

Margen objetivo → markup: `precio_sin_iva = costo_base / (1 − margen%/100)`.

---

## Estructura

```
src/
  app/
    page.tsx                      Tablero
    cotizacion/[id]/page.tsx      Detalle (5 secciones, polling, adjuntos, historial)
    cotizacion/[id]/cliente/...   Vista cliente / PDF
    api/quotes/...                API JSON (CRUD, cierre, aprobar, import, estimar, revisar)
  components/                     UI por sección
  lib/
    calc.ts                       Motor de cálculo (con test)
    claude/                       Integraciones con Claude (servidor)
    db.ts, storage.ts, api.ts     Prisma, archivos, helpers
prisma/schema.prisma              Modelo de datos
```
