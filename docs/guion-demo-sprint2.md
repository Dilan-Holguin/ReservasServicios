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
2. **Sembrar los datos. Esto es obligatorio.** Se verificó que la cuenta de cliente tiene
   **cero reservas**, así que sin este paso no hay nada que cancelar y la demo no existe. Hacen
   falta:
   - una reserva a **más de 5 días** (es la que se va a cancelar),
   - una reserva a **menos de 5 días** (es la que muestra la regla de negocio),
   - y el servicio del proveedor **activo**, con turnos libres visibles.
   Créenlas antes de grabar. Reservar en vivo gasta un minuto que no tienen.
3. **Preparar dos sesiones.** Una ventana con el cliente y otra con el proveedor, o dos perfiles
   del navegador. Cambiar de sesión en vivo cuesta veinte segundos cada vez.
4. **Dejar la barra de direcciones visible** en toda la grabación: los lineamientos piden que se
   vea la URL del despliegue. Zoom al 100%, sin la terminal ni el editor a la vista.
5. **Ojo con los dos servicios del mismo nombre.** El catálogo público tiene hoy dos servicios
   llamados «Corte de cabello», uno de «Peluqueria Demo» (id 1) y otro de «Peluquería Demo
   Sprint 2» (id 2). El que pertenece a la cuenta de proveedor de la demo es el **id 2**. Para que
   no se confunda en cámara, lo más limpio es renombrar uno de los dos antes de grabar, o crear un
   servicio con un nombre distintivo y usar ese.

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

Esta es la vista del cliente. Acá está su reserva de un corte de cabello.

[Acción: pulsar «Cancelar reserva». Se abre el diálogo. **Leerlo en voz alta mientras se ve.**]

Antes de hacer nada, el sistema dice exactamente qué va a pasar: la reserva queda cancelada, y su
cupo y sus recursos se liberan.

[Acción: confirmar. La insignia cambia a CANCELADA de inmediato.]

Cambió al instante, sin recargar la página.

[Acción: bajar a la **otra** reserva, la que está dentro de los cinco días. Señalar el mensaje.]

Y acá está la regla de negocio del sprint. Esta otra reserva es dentro de tres días, y la política
pide cinco días de anticipación para que un cliente cancele. Fíjense en lo que hace la aplicación:
**no** le ofrece un botón que va a fallar. Le explica por qué no puede y qué hacer en su lugar.

## 1:30 — La prueba de que está integrado (45 s) · VOZ 2

[Acción: ir a la ficha del servicio, a la grilla de disponibilidad. Señalar el turno recuperado.]

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

[Acción: ir a «Mis servicios». Pulsar «Inactivar servicio». Confirmar.]

La última historia es el control del negocio sobre lo que ofrece. Acabamos de inactivar el
servicio.

[Acción: abrir el catálogo público en otra pestaña. El servicio **ya no aparece**.]

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
| Historial de reservas (HU-10) | responde, **0 reservas** → hay que sembrarlas |
| Arranque en frío | **227 segundos** |

## Cómo se mapea con lo que pide el sprint

| Lo que pide el sprint | Dónde aparece en la demo |
|---|---|
| APIs priorizadas, diseñadas y validadas | 0:35 a 4:00, cada pantalla consume la API desplegada |
| Al menos 3 servicios REST documentados | 4:00, el contrato OpenAPI en Swagger |
| CI/CD con GitHub Actions | 4:00, las corridas del pipeline |
| Identificación de vulnerabilidades | 4:00, el análisis de seguridad del código |
| Documentación de las APIs | 4:00, Swagger |
| Diagrama de despliegue | **No va en la demo**, va en el entregable escrito |
