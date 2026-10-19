# Guion de la demo — Sprint 2 (5 minutos)

Este guion cubre **solo la sección «Demo del incremento de producto terminado»** de los
lineamientos de la Review. Las otras secciones del video (contexto del producto, contexto del
sprint, impedimentos, aprendizajes) van por separado.

Ritmo de lectura: ~150 palabras por minuto. El texto hablado son ~730 palabras, así que entra en
cinco minutos con pausas. Lo que va entre corchetes son indicaciones de pantalla o de acción: **no
se leen**.

Tres voces marcadas como **VOZ 1**, **VOZ 2** y **VOZ 3** para cumplir el requisito de
participación del equipo. Repártanlas según quién trabajó cada parte.

---

## Lo que hay que hacer ANTES de grabar

Esto no es opcional. Sin estos cuatro pasos la demo se cae en cámara.

1. **Despertar los dos servicios 15 minutos antes.** El plan gratuito de Render suspende el
   servicio por inactividad. El arranque en frío se midió el 2026-10-18 y tardó **227 segundos**,
   casi cuatro minutos: la salud respondió vacío a los 90 y a los 196 segundos, y solo contestó
   `UP` a los 227. Abran `https://reservaya-vvke.onrender.com/actuator/health` y
   `https://reservaya-web.onrender.com` hasta que respondan, y **no dejen de usarlos** hasta
   terminar de grabar. Si se detienen media hora entre tomas, vuelve a dormirse.
2. **Los datos ya están sembrados.** Se crearon el 2026-10-18 a través de la API, no por la base,
   así que cada servicio dejó además su entrada de `CREACION` en el historial del negocio, que es
   parte de lo que se muestra en el minuto 3:10.

   **Usen estas dos reservas y no otras:**

   | Reserva | Servicio | Cuándo | Para qué sirve |
   |---------|----------|--------|----------------|
   | **#9** | Coloración completa | 2026-11-03 09:00 | **Es la que se cancela** (a 15 días, bien por encima del mínimo) |
   | **#10** | Coloración completa | 2026-10-22 14:00 | **Es la que muestra la regla** (a 3,6 días, dentro del plazo) |

   Existen también la #7 y la #8, sembradas antes y con menos margen. Ignórenlas.

   > **Fecha límite para grabar: antes del 22 de octubre a las 14:00.** Después de ese momento la
   > reserva #10 ya habrá comenzado y el mensaje cambia de «necesita 5 días de anticipación» a «la
   > reserva ya comenzó» — sigue siendo una regla válida, pero no es la del Sprint 2. Si se pasa la
   > fecha, creen una reserva nueva a tres o cuatro días y usen esa.
3. **Preparar dos sesiones.** Una ventana con el cliente y otra con el proveedor, o dos perfiles
   del navegador. Cambiar de sesión en vivo cuesta veinte segundos cada vez.
4. **Dejar la barra de direcciones visible** en toda la grabación: los lineamientos piden que se
   vea la URL del despliegue. Zoom al 100%, sin la terminal ni el editor a la vista.
5. **El catálogo ya quedó ordenado.** Había dos servicios llamados «Corte de cabello». La API no
   tiene operación para renombrar un servicio —solo crear, consultar y cambiar estado—, así que se
   resolvió con el producto mismo: el duplicado del proveedor de la demo (id 2) se **inactivó**, y
   se crearon cuatro servicios con nombres y duraciones distintas. Así queda el catálogo público:

   | id | Servicio | Negocio | Duración | Cupos |
   |----|----------|---------|----------|-------|
   | 1 | Corte de cabello | Peluqueria Demo | 30 min | 1 |
   | **3** | Corte y peinado | Peluquería Demo Sprint 2 | 45 min | 2 |
   | **4** | Coloración completa | Peluquería Demo Sprint 2 | 90 min | 1 |
   | **5** | Manicure y pedicure | Peluquería Demo Sprint 2 | 60 min | 3 |
   | **6** | Barbería y afeitado clásico | Peluquería Demo Sprint 2 | 30 min | 2 |

   Los del proveedor de la demo son el 3, 4, 5 y 6. Todos con agenda de lunes a viernes de 9 a 13
   y de 14 a 18, y sábados de 9 a 14, así que hay turnos libres para mostrar.

   El id 1 es de otra cuenta de pruebas de septiembre cuya clave no tenemos, así que no se puede
   tocar por la API. Ya no estorba, porque ningún otro servicio se llama igual.

6. **Para el minuto 3:10, inactiven el servicio 5 o el 6**, no el 3 ni el 4: esos dos tienen las
   reservas de la demo y conviene dejarlos quietos.

**Credenciales de la demo**

| Rol | Correo | Clave |
|-----|--------|-------|
| Cliente | `isaac.mesag+cliente@udea.edu.co` | `reservaya-demo-2026` |
| Proveedor | `isaac.mesag+proveedor@udea.edu.co` | `reservaya-demo-2026` |

---

## 0:00 — Qué quedó terminado (35 s) · VOZ 1

[En pantalla: `https://reservaya-web.onrender.com`, el catálogo público. La URL bien visible.]

En el sprint anterior un cliente ya podía reservar un turno. Pero una reserva que no se puede
cancelar, y de la que nadie sabe quién la cambió, todavía no es un producto: es una lista.

Este sprint cierra ese hueco. Lo que van a ver está desplegado en esta dirección, funcionando, y
son cinco historias de usuario terminadas: cancelar como cliente, cancelar como proveedor, el
historial de reservas del cliente, el historial del negocio, y el control del estado de los
servicios.

Todo en la misma aplicación, con los mismos datos. Nada de esto está en una rama aparte.

## 0:35 — Cancelar, con la regla a la vista (55 s) · VOZ 1

[Acción: entrar como **cliente**. Ir a «Mis reservas».]

Esta es la vista del cliente. Acá está su reserva de una coloración, para el 3 de noviembre.

[Acción: pulsar «Cancelar reserva» en la **reserva #9**. Se abre el diálogo. **Leerlo en voz alta
mientras se ve.**]

Antes de hacer nada, el sistema dice exactamente qué va a pasar: la reserva queda cancelada, y su
cupo y sus recursos se liberan.

[Acción: confirmar. La insignia cambia a CANCELADA de inmediato.]

Cambió al instante, sin recargar la página.

[Acción: bajar a la **reserva #10**, la del 22 de octubre. Señalar el mensaje, no hay botón.]

Y acá está la regla de negocio del sprint. Esta otra reserva es dentro de tres días, y la política
pide cinco días de anticipación para que un cliente cancele. Fíjense en lo que hace la aplicación:
**no** le ofrece un botón que va a fallar. Le explica por qué no puede y qué hacer en su lugar.

## 1:30 — La prueba de que está integrado (45 s) · VOZ 2

[Acción: ir a la ficha de **Coloración completa** (id 4), a la grilla de disponibilidad del 3 de
noviembre. Señalar el turno de las 9:00, que volvió a estar libre.]

Esto es lo que queremos que vean con atención, porque es la diferencia entre cinco funciones
sueltas y un incremento integrado.

El turno que acabamos de cancelar **volvió a estar disponible**. No lo recargamos a mano: cancelar
libera el cupo y libera los recursos que esa reserva tenía tomados, y la disponibilidad se corrige
sola. La grilla se revalida cada medio minuto mientras la pestaña está a la vista, así que si otro
cliente toma un turno mientras usted mira, desaparece de la lista y se le avisa.

[Acción: recorrer dos o tres turnos **con las flechas del teclado** y señalar que el foco se mueve.]

Y se puede operar sin mouse: la grilla completa es una sola parada de tabulación y por dentro se
recorre con las flechas.

## 2:15 — Quién, cuándo y desde qué estado (55 s) · VOZ 2

[Acción: cambiar a la sesión del **proveedor**. Ir a la sección «Reservas».]

Ahora el mismo sistema, del lado del negocio. El proveedor ve las reservas de sus servicios.

[Acción: cancelar una reserva **del mismo día o próxima**. Confirmar.]

El proveedor puede cancelar sin anticipación mínima, porque un negocio se queda sin personal o sin
una sala el mismo día. Es la misma operación que usó el cliente, con una regla distinta según quién
la ejecuta.

[Acción: abrir el plegable «Ver los cambios de esta reserva».]

Y esto es el corazón del sprint. Cada cambio de estado queda registrado: la creación, y la
cancelación. Con el estado anterior, el estado nuevo, **quién lo hizo**, con qué rol, y la fecha y
hora exactas.

Si mañana un cliente reclama que su cita desapareció, esta pantalla responde la pregunta.

## 3:10 — Controlar la oferta (50 s) · VOZ 3

[Acción: ir a «Mis servicios». Pulsar «Inactivar servicio» en **Manicure y pedicure** (id 5).
Confirmar. No usen el 3 ni el 4: tienen las reservas de la demo.]

La última historia es el control del negocio sobre lo que ofrece. Acabamos de inactivar el servicio
de manicure.

[Acción: abrir el catálogo público en otra pestaña. **Manicure y pedicure ya no aparece**.]

En el catálogo público desapareció: no acepta reservas nuevas. Pero las reservas ya confirmadas se
mantienen, porque dar de baja un servicio no es cancelarle la cita a quien ya la tenía.

[Acción: volver al panel. Señalar que el servicio **sigue visible para su dueño**, con la insignia
INACTIVO y el botón para reactivarlo.]

Y sigue acá, para su dueño, con un botón para volver a activarlo.

[Acción: ir a la sección «Cambios» y mostrar la línea de tiempo.]

El cambio de estado quedó en el historial del negocio, junto con la creación del servicio y los
ajustes de agenda. Con autor y fecha, igual que las reservas.

## 4:00 — Cómo llegó ahí y cómo se cuida (40 s) · VOZ 3

[En pantalla: `https://reservaya-vvke.onrender.com/swagger-ui.html`]

Todo lo que acabamos de usar está documentado y es consumible por cualquier cliente: la API está
publicada con su contrato OpenAPI, con los códigos de error y los ejemplos de cada operación.

[En pantalla: la pestaña Actions del repositorio, con las corridas en verde.]

Y no llegó a esa dirección a mano. Cada cambio pasa por el pipeline: las pruebas del backend con su
cobertura, las del frontend, la construcción de la imagen, el análisis de seguridad del código, y
el despliegue automático a la URL que vieron al principio. Si algo se pone rojo, no se publica.

## 4:40 — Cierre (20 s) · VOZ 1

[En pantalla: volver a la aplicación, en el historial de reservas.]

Eso es el incremento del Sprint 2: una reserva ahora se puede cancelar con reglas distintas según
quién la cancela, libera lo que tenía tomado, y deja constancia de quién hizo cada cosa. Está
desplegado, integrado y en uso. Gracias.

---

## Advertencias para la grabación

- **No muestren el enlace del correo de verificación.** Hoy apunta al backend y responde un JSON
  crudo en lugar de una pantalla; se ve mal en cámara. Si quieren demostrar la verificación por
  correo, muestren que el correo **llega** a la bandeja y entren con la cuenta ya verificada.
- **No muestren diagramas.** Los lineamientos piden evitar diagramas técnicos, modelos
  entidad-relación y mockups en la demo. El diagrama de despliegue va en el entregable escrito del
  sprint, no acá.
- **No muestren el código ni la terminal.** La demo es del producto.
- **Nada que no esté terminado.** Los reportes de ocupación, la MFA de administrador y la
  paginación de los historiales no son parte de este incremento. Si un evaluador pregunta, están en
  el backlog; no los presenten como entregados.
- **Si el servicio tarda en responder**, no lo narren como un error: es el arranque en frío del plan
  gratuito. Mejor evitarlo con el paso 1 de la preparación.

## Estado verificado del despliegue (2026-10-18)

Se comprobó contra los servicios en vivo antes de escribir este guion:

| Qué | Resultado |
|-----|-----------|
| Salud del backend | `UP` |
| Rutas publicadas | **22**, incluidas las 5 del Sprint 2 |
| Frontend | HTTP 200 |
| Swagger UI | HTTP 200 en `/swagger-ui.html` |
| Cuenta de cliente | inicia sesión, rol `CLIENTE` |
| Cuenta de proveedor | inicia sesión, rol `PROVEEDOR` |
| Historial de servicios (HU-11) | responde con 1 cambio registrado |
| Historial de reservas (HU-10) | responde con **4 reservas** sembradas |
| Arranque en frío | **227 segundos** |
| Catálogo público | 5 servicios, sin nombres duplicados |

Los datos se sembraron **a través de la API**, no escribiendo en la base. Eso importa por dos
razones: lo que quedó es exactamente lo que el producto sabe producir, y cada creación dejó su
entrada en el historial del negocio, que es justo lo que se muestra en el minuto 3:10.

Una nota sobre la URL del backend: `https://reservaya-vvke.onrender.com/` **no** es la aplicación.
Abrirla en el navegador responde `401 NO_AUTENTICADO`, porque ahí no hay página: es la API, y el
filtro de seguridad pide token para cualquier ruta no declarada. La aplicación está en
`https://reservaya-web.onrender.com`. No abran la primera en cámara.

## Cómo se mapea con lo que pide el sprint

| Lo que pide el sprint | Dónde aparece en la demo |
|---|---|
| APIs priorizadas, diseñadas y validadas | 0:35 a 4:00, cada pantalla consume la API desplegada |
| Al menos 3 servicios REST documentados | 4:00, el contrato OpenAPI en Swagger |
| CI/CD con GitHub Actions | 4:00, las corridas del pipeline |
| Identificación de vulnerabilidades | 4:00, el análisis de seguridad del código |
| Documentación de las APIs | 4:00, Swagger |
| Diagrama de despliegue | **No va en la demo**, va en el entregable escrito |
