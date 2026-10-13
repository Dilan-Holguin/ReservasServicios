# ReservaYa — Frontend

Interfaz web del MVP de **ReservaYa**, la plataforma de reservas de servicios. Es una SPA en
**React 19 + TypeScript + Vite** que consume la API REST versionada del backend
(`/api/v1`), con **TanStack Query** para el estado del servidor. No usa librerías de UI:
todo el estilo vive en una única hoja `src/estilos.css`, pensada para cumplir
**WCAG 2.2 nivel AA** en tema claro y oscuro.

Cubre las HU del Sprint 1 y del Sprint 2: alta y verificación de cuentas, catálogo,
disponibilidad y reserva (HU-07), cancelación por cliente y por proveedor (HU-08, HU-15),
historial de reservas (HU-10, HU-14) y de cambios de servicios con activación e inactivación
(HU-11).

## Requisitos

- Node.js 20 o superior (probado con Node 22).
- Acceso al backend, desplegado en Render o levantado en local.

## Puesta en marcha

```bash
cd frontend
cp .env.example .env     # opcional: sin .env se usa el backend de Render
npm install
npm run dev              # http://localhost:5173
```

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con recarga en caliente (puerto 5173). |
| `npm run build` | Verificación de tipos (`tsc -b`) y empaquetado de producción en `dist/`. |
| `npm run preview` | Sirve `dist/` para revisar el build localmente. |
| `npm run typecheck` | Solo la verificación de tipos. |
| `npm test` | Pruebas con Vitest y Testing Library, una sola pasada. |
| `npm run test:ver` | Las mismas pruebas en modo observador. |
| `npm run cobertura` | Pruebas con informe de cobertura (`text` y `lcov`). |

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL base de la API, **incluido** el prefijo de versión. | `https://reservaya-vvke.onrender.com/api/v1` |

La plantilla está en `.env.example`. Para desarrollo contra el backend local levantado con
`podman-compose`, usa `VITE_API_URL=http://localhost:8081/api/v1`.

> El backend restringe CORS a los orígenes de `APP_CORS_ALLOWED_ORIGINS`. En desarrollo el
> perfil `dev` ya permite `http://localhost:5173`. Para el despliegue hay que **añadir el
> origen del sitio estático** a esa variable en Render; si no, el navegador bloqueará las
> peticiones.

## Páginas y endpoints

| Ruta | Pantalla | Endpoints que consume |
|------|----------|-----------------------|
| `/` | Catálogo público de servicios con filtro por categoría | `GET /servicios`, `GET /servicios?idCategoria=`, `GET /catalogos/categorias` |
| `/servicios/:id` | Ficha del servicio y disponibilidad por rango de fechas | `GET /servicios/{id}`, `GET /servicios/{id}/disponibilidad?desde=&hasta=`, `POST /reservas` |
| `/ingresar` | Inicio de sesión | `POST /auth/login`, `POST /auth/verificacion/reenvio` |
| `/registro` | Alta de cliente o proveedor (con servicios) | `POST /auth/registro`, `GET /catalogos/categorias` |
| `/verificacion` | Verificación por token y reenvío | `GET /auth/verificacion?token=`, `POST /auth/verificacion/reenvio` |
| `/panel/cliente` | Historial de reservas con filtros y cancelación (HU-08, HU-10) | `GET /reservas/historial?idServicio=&estado=&desde=&hasta=`, `POST /reservas/{id}/cancelacion` |
| `/panel/proveedor` | Servicios, agenda, recursos, reservas y cambios | `GET`/`POST /servicios`, `GET /servicios/{id}`, `PUT /servicios/{id}/estado`, `GET /servicios/historial`, `GET /reservas/historial`, `POST /reservas/{id}/cancelacion`, `GET`/`POST /servicios/{id}/horarios`, `PUT`/`DELETE /horarios/{id}`, `GET`/`POST /recursos`, `PUT /servicios/{id}/recursos`, `GET /catalogos/tipos-recurso` |

Las secciones del panel del proveedor son enlaces reales (`?seccion=servicios|agenda|recursos|reservas|cambios`),
no pestañas simuladas: el botón «atrás» funciona y cada sección se puede compartir por enlace.

## Decisiones de interfaz

- **Carga, vacío y error en todas las pantallas.** Están centralizados en
  `src/componentes/Estados.tsx` (`Cargando`, `Vacio`, `CajaError`).
- **Errores trazables.** Cada respuesta de error sigue el contrato
  `{errorCode, message, details, traceId}`. Se muestra `message` al usuario y el `traceId`
  queda visible en pequeño bajo el mensaje, para poder cruzarlo con los logs del backend.
- **409 con sugerencias.** Cuando `POST /reservas` responde `TURNO_SIN_CUPO` o
  `RECURSO_NO_DISPONIBLE`, los turnos de `details` se pintan como botones que reservan la
  alternativa con un clic.
- **Conflicto de agenda.** Editar o eliminar un bloque que afecta reservas confirmadas
  devuelve `409 HORARIO_CON_RESERVAS` con la lista en `details`. La interfaz abre un diálogo
  modal con esas reservas y solo al confirmar repite la llamada con `?confirmar=true`.
- **Sesión.** El token se guarda en `localStorage` con `try/catch` (modo privado o
  almacenamiento bloqueado no rompen la app) y caduca solo al vencer `expiresIn`. Un 401 en
  una llamada protegida cierra la sesión y lleva a `/ingresar` con un mensaje explícito y el
  destino al que volver.
- **Volver al turno tras ingresar.** Si se pulsa «Reservar» sin sesión, el turno viaja en el
  estado de navegación y la reserva se confirma automáticamente al volver del login.
- **Estado del servidor con TanStack Query.** Todas las lecturas pasan por
  `src/consultas/`. El cliente se configura en `cliente.ts` y se monta dentro del enrutador
  (`ProveedorConsultas.tsx`) para que **cualquier** 401 cierre la sesión, no solo los de las
  páginas que se acuerdan de atraparlo. Reintenta hasta tres veces con espera creciente ante
  fallos de red y 5xx —el plan gratuito de Render suspende el servicio, y el primer pedido
  tras una pausa puede tardar más de un minuto— y **nunca** ante un 4xx, que no se arregla
  solo. Las mutaciones no se reintentan: repetir un `POST /reservas` duplicaría la reserva.
- **Disponibilidad viva.** `GET /servicios/{id}/disponibilidad` se vuelve a pedir cada 30
  segundos mientras la pestaña está a la vista, y al recuperar el foco o la conexión. Si un
  turno que estaba en pantalla deja de estar libre, se anuncia en una región `aria-live`:
  un botón que desaparece sin aviso desconcierta, y para un lector de pantalla es invisible.
- **Filtros y rangos en la URL.** Fechas, categoría, estado y sección viven en la barra de
  direcciones (`useParametrosUrl.ts`). El botón «atrás» deshace un filtro, el enlace copiado
  reproduce la misma vista y recargar no borra lo elegido.
- **Cancelación adelantada, con reversión.** La cancelación es la única mutación cuyo
  resultado se puede anticipar sin riesgo: el estado final es conocido y no depende de ningún
  cálculo del servidor. Se escribe en la caché al instante y, si el backend la rechaza, se
  restaura la foto previa y se muestra su mensaje. La entrada del historial **no** se inventa:
  la escribe el backend con su autor y su fecha. Crear una reserva no se adelanta, porque el
  servidor asigna recursos y valida cupo.
- **El plazo se explica antes del intento.** Un cliente solo puede cancelar con 5 días de
  anticipación (HU-08); un proveedor, sin mínimo (HU-15). En lugar de ofrecer un botón que va
  a fallar, la tarjeta muestra el motivo. `src/utiles/cancelacion.ts` **refleja** la política
  por defecto del backend para poder explicarla; la autoridad sigue siendo el servidor, que
  responde `CANCELACION_FUERA_DE_PLAZO` y cuyo mensaje se muestra tal cual.
- **Servicios inactivos visibles para su dueño.** `GET /servicios` resuelve con
  `listarActivos(...)`, así que un servicio inactivado desaparece del catálogo público. Si el
  panel se armara filtrando ese catálogo, el dueño perdería de vista su propio servicio y no
  podría reactivarlo. `useMisServicios.ts` deduce los ids propios de
  `GET /servicios/historial` —todo servicio tiene su entrada de `CREACION`, activo o no— y lee
  cada ficha con `GET /servicios/{id}`, que no filtra por estado. De paso elimina el sondeo
  que antes probaba un servicio por proveedor del catálogo hasta encontrar uno que no diera
  403, porque el historial ya es prueba de propiedad.

## Accesibilidad

- `lang="es"` en el documento y enlace «Saltar al contenido principal».
- Landmarks `header`, `nav`, `main` y `footer`; `main` recibe el foco desde el salto.
- Todas las etiquetas van asociadas por `htmlFor`/`id` (`src/componentes/Campo.tsx`), con
  `aria-describedby` para ayudas y errores y `aria-invalid` en los campos con error.
- Anuncios asíncronos en regiones `aria-live="polite"`; los errores usan `role="alert"`.
- Foco visible de 3 px en todo elemento interactivo y diálogo modal con foco atrapado,
  cierre con `Escape` y devolución del foco al disparador.
- Objetivos táctiles de al menos 44 px, diseño fluido de 360 px a escritorio, navegación
  plegable en móvil y sin desplazamiento horizontal.
- Paleta con contraste AA en claro y oscuro (`prefers-color-scheme`), y respeto a
  `prefers-reduced-motion`.
- **Grilla de turnos navegable con el teclado** (`GrillaTurnos.tsx`). Antes era una lista de
  botones: con el teclado había que pulsar Tab una vez por turno, y una semana de agenda son
  decenas. Ahora sigue el patrón de grilla de ARIA —`role="grid"`, `row`, `rowheader`,
  `gridcell`— con `tabindex` móvil: la grilla entera es **una sola** parada de tabulación y
  por dentro se recorre con las flechas, como una hoja de cálculo. Flechas para moverse
  (acotando la columna cuando un día tiene menos turnos), Inicio y Fin para los extremos del
  día, Ctrl+Inicio y Ctrl+Fin para los de todo el rango, Entrar o Espacio para reservar.
- **`aria-disabled` en lugar de `disabled`** en las celdas mientras una reserva está en
  vuelo. Un botón deshabilitado no puede recibir el foco, así que deshabilitarlos sacaría al
  usuario de la grilla justo en medio del recorrido. Quedan enfocables pero no accionables.
- **Historiales en `<ol>` y plegables con `<details>`.** La línea de tiempo es una lista
  ordenada de verdad, así que un lector de pantalla anuncia cuántos pasos hay y en qué
  posición va. El plegable es `<details>`/`<summary>` nativo: accesible y operable con
  teclado sin una línea de JavaScript.

## Despliegue en Render (sitio estático)

| Ajuste | Valor |
|--------|-------|
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Variable de entorno | `VITE_API_URL=https://reservaya-vvke.onrender.com/api/v1` |

Al ser una SPA con rutas del lado del cliente hay que añadir una regla de reescritura
`/*` → `/index.html` (tipo *Rewrite*). El archivo `static.json` de esta carpeta deja esa
regla documentada.

Después del primer despliegue, añade la URL pública del sitio a
`APP_CORS_ALLOWED_ORIGINS` en el servicio del backend.

## Pruebas

Vitest sobre jsdom con Testing Library. Los archivos se llaman `*.prueba.ts(x)` y viven al
lado de lo que prueban; los apoyos comunes están en `src/prueba/`, donde `montar()` arma el
árbol real —enrutador, sesión y cliente de consultas— para que la prueba examine el
componente y no el andamio.

| Archivo | Qué protege |
|---------|-------------|
| `utiles/cancelacion.prueba.ts` | La regla de los 5 días en su límite exacto, la excepción del proveedor (HU-15), el estado y la reserva ya iniciada. |
| `componentes/GrillaTurnos.prueba.tsx` | La semántica de grilla, que sea una sola parada de tabulación, el recorrido con flechas con acotado de columna, los saltos con Ctrl y que el foco no se pierda durante una reserva. |
| `paginas/PanelCliente.prueba.tsx` | El historial con su autor, el motivo en lugar del botón condenado, la cancelación adelantada con su anuncio y **la reversión** cuando el backend la rechaza. |
| `consultas/useMisServicios.prueba.tsx` | Que un servicio inactivo siga visible para su dueño y que no se repitan pedidos. |

El cliente de consultas de prueba va sin reintentos a propósito: en producción un fallo de
red se reintenta tres veces con espera creciente, y en una prueba eso solo serviría para que
un caso de error tarde ocho segundos en fallar.

## Fuera de alcance

- **Reportes de ocupación**, MFA de administrador y refresh de token: no existen en el
  backend (`docs/modelo-datos-y-paquetes.md` §5). El acceso caduca a los 30 minutos y se
  vuelve a pedir el inicio de sesión.
- **Paginación de los historiales.** El backend todavía devuelve la lista completa.
- **`SeccionAgenda` y `SeccionRecursos`** siguen llamando a la API de forma imperativa con
  el token por `props`, sin pasar por `src/consultas/`. Funcionan, pero quedaron fuera de
  esta migración: su flujo de dos pasos con `?confirmar=true` tiene su propia máquina de
  estados y mezclarlo con la migración habría hecho el cambio imposible de revisar.
- **Recursos asignados en la lista de reservas.** El panel del cliente se alimenta de
  `GET /reservas/historial`, que no incluye `recursos`; están en la ficha del servicio.
