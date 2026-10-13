# Correo de verificación en producción

Guía para dejar funcionando el envío del correo de verificación de cuenta
(HU-03) en el servicio desplegado en Render.

## El incidente que originó este documento

El 2026-10-13, dos registros y un reenvío no entregaron ningún correo. El
registro respondía `201` y el reenvío `200`, así que desde afuera parecía
funcionar.

La causa estaba en las variables de entorno del servicio `reservaya`:

```
MAIL_HOST = localhost
MAIL_PORT = 1025
MAIL_SMTP_AUTH = false
MAIL_SMTP_STARTTLS = false
```

`localhost:1025` es **Mailpit**, el buzón de desarrollo. Dentro del contenedor de
Render no hay nada escuchando en ese puerto. `MAIL_USERNAME` y `MAIL_PASSWORD` no
estaban definidas.

Dos cosas lo volvieron invisible:

1. **El fallo se traga por diseño.** `NotificadorVerificacionCuenta` envía en
   `@TransactionalEventListener(phase = AFTER_COMMIT)` y atrapa la excepción para
   registrarla. Es correcto —un hipo de SMTP no debe revertir un registro, y para
   eso existe `POST /auth/verificacion/reenvio`— pero significa que **el código de
   respuesta HTTP del registro no dice nada sobre la entrega**.
2. **El blueprint y la realidad habían derivado.** `render.yaml` declaraba
   `MAIL_PORT: "587"` mientras producción corría `1025`. Los servicios no se
   crearon desde el blueprint, así que el panel manda y nada compara los dos.

## Cómo saber si el correo salió

La única evidencia está en los logs estructurados del servicio. Buscar
exactamente uno de estos dos eventos:

| Evento | Significado |
|--------|-------------|
| `CORREO_VERIFICACION_ENVIADO` | El envío al relay SMTP tuvo éxito. |
| `CORREO_VERIFICACION_FALLIDO` | El envío falló; el usuario puede pedir un reenvío. |

En el panel de Render: servicio `reservaya` → **Logs** → buscar
`CORREO_VERIFICACION`.

## Configuración con Brevo

Brevo da 300 correos diarios gratis, permite verificar un remitente suelto sin
comprar dominio y entrega a cualquier destinatario, que es lo que hace falta si un
evaluador se registra con su propio correo.

1. Crear la cuenta en <https://www.brevo.com> y verificar el correo de acceso.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender.** Verificar la
   dirección que va a figurar como remitente. Ese valor es `APP_MAIL_FROM`.
3. **SMTP & API → SMTP.** Copiar el *login* y la *master password*. Son
   `MAIL_USERNAME` y `MAIL_PASSWORD`.
4. En Render, servicio `reservaya` → **Environment**, dejar así:

| Variable | Valor |
|----------|-------|
| `MAIL_HOST` | `smtp-relay.sendinblue.com` ← **no** `smtp-relay.brevo.com`, ver abajo |
| `MAIL_PORT` | `2525` ← **no** `587`, Render lo bloquea; ver abajo |
| `MAIL_SMTP_AUTH` | `true` |
| `MAIL_SMTP_STARTTLS` | `true` |
| `MAIL_USERNAME` | el login SMTP de Brevo |
| `MAIL_PASSWORD` | la clave SMTP de Brevo |
| `APP_MAIL_FROM` | el remitente verificado en el paso 2 |

Guardar reinicia el servicio. En el plan gratuito el arranque tarda cerca de tres
minutos, así que conviene cambiar las siete variables en **un solo guardado**.

### Los tres tropiezos de esta configuración

Al migrar de Mailpit a Brevo se cambiaron el host y el puerto, se agregaron las
credenciales… y quedaron tres cosas atrás. Vale anotarlas porque las tres dan el
mismo síntoma —el correo no llega— con causas distintas:

1. **`MAIL_SMTP_AUTH` seguía en `false`.** Heredado de Mailpit, que no pide
   contraseña. Con esto en `false`, Java no envía las credenciales aunque estén
   perfectamente cargadas, y el relay corta la conexión.
2. **`MAIL_SMTP_STARTTLS` seguía en `false`.** También heredado. Brevo en el
   puerto 587 exige STARTTLS y rechaza antes de llegar a la autenticación.
3. **`APP_MAIL_FROM` seguía en `no-reply@reservaya.app`**, un dominio que no
   controlamos. Ningún proveedor serio deja salir un remitente sin verificar.

La lección: los valores de desarrollo no son neutros. `false` y `false` eran
correctos para Mailpit y son veneno para un relay real, y no fallan al arrancar
—fallan al enviar, en silencio.

### El remitente NO puede ser `@udea.edu.co` (DMARC)

Con el host correcto, el relay acepta el mensaje y **Google lo rebota**:

```
softBounces  to=isaac.mesag+smtptest@udea.edu.co
550-5.7.26 Unauthenticated email from udea.edu.co is not accepted
           due to domain's DMARC policy.
```

La causa está en el DNS de la universidad:

```
_dmarc.udea.edu.co  "v=DMARC1; p=reject; pct=100; sp=reject; aspf=r; ..."
udea.edu.co         "v=spf1 include:_spf.google.com ... -all"
```

`p=reject` con `pct=100` significa que la universidad pide que se **rechace todo**
el correo que diga venir de `@udea.edu.co` sin estar autenticado para ese dominio,
y su SPF termina en `-all` sin incluir a Brevo. Brevo firma con su propio dominio,
así que la alineación DMARC falla y Gmail cumple la instrucción.

**No hay nada que configurar de nuestro lado.** Esa política existe justamente para
que nadie pueda enviar correo haciéndose pasar por la universidad, y nosotros
estábamos haciendo exactamente eso sin querer.

Opciones, de la más rápida a la más correcta:

| Opción | Qué implica | Para qué sirve |
|--------|-------------|----------------|
| Remitente en Gmail | `_dmarc.gmail.com` es `p=none`, así que no se rechaza. Verificar la dirección en Brevo y usarla en `APP_MAIL_FROM`. | Demostración y desarrollo. Puede caer en spam. |
| Dominio propio autenticado | Registrar un dominio y cargar en su DNS los registros DKIM y SPF que da Brevo. | La solución de verdad, y la que permite un `no-reply@…` presentable. |

Lo que **no** es una opción es pedirle a la universidad que agregue Brevo a su SPF.

### El nombre del relay: `sendinblue`, no `brevo`

Brevo documenta `smtp-relay.brevo.com`, y **ese nombre no funciona** con un
cliente que valide el certificado. El relay presenta un certificado emitido para
otros nombres:

```
subject = CN=smtp-relay-offshore-southamerica-east-v2.sendinblue.com
SAN     = smtp-relay-offshore-southamerica-east-v2.sendinblue.com,
          smtp-relay.sendinblue.com
```

`smtp-relay.brevo.com` no está en la lista. Jakarta Mail valida el nombre del
servidor durante STARTTLS, así que el handshake se corta **antes** de autenticar.

El síntoma es engañoso: `MailSendException` —no `MailAuthenticationException`, las
credenciales nunca se usan— y **cero eventos** en el panel de Brevo, porque la
sesión nunca llegó a entregar el mensaje. Parece un problema de credenciales o de
remitente y no es ninguno de los dos.

Comprobado el 2026-10-13 contra la misma IP (`1.179.117.2`, red `FR-MAILINBLUE`)
con los dos nombres:

| Host | Resultado |
|------|-----------|
| `smtp-relay.sendinblue.com` | STARTTLS OK → autenticación OK → mensaje aceptado |
| `smtp-relay.brevo.com` | `Hostname mismatch, certificate is not valid` |

Es un defecto del lado de Brevo —su certificado no cubre su propia marca nueva—
pero la solución de nuestro lado es usar el nombre heredado, que sigue activo y sí
está en el certificado.

> Lo que **no** hay que hacer es desactivar la validación del certificado con
> `mail.smtp.ssl.trust=*`. Eso convierte un problema de nombre en un agujero:
> cualquiera que intercepte la conexión podría presentar su propio certificado y
> leer las credenciales SMTP en claro.

### La lista blanca de IPs de Brevo

Con las siete variables correctas, el envío seguía fallando con
`MailSendException`. La causa no estaba en la configuración del servicio sino en
la cuenta de Brevo: **tiene restricción por IP activada de fábrica** y solo
confía en la dirección desde la que se creó la cuenta.

La respuesta de Brevo lo dice sin rodeos:

```
401 {"message":"We have detected you are using an unrecognised IP address ...
     make sure to add the new IP address in this link:
     https://app.brevo.com/security/authorised_ips","code":"unauthorized"}
```

El contenedor de Render sale por una IP distinta, así que el relay rechaza la
conexión antes de aceptar el mensaje.

**La solución es desactivar la restricción, no listar las IPs.** En el plan
gratuito de Render las direcciones de salida son compartidas: la propia API lo
informa como `{"type": "shared"}` sin devolver ninguna lista, y las IPs estáticas
son una función de pago. No hay un conjunto estable que agregar.

En **Brevo → Security → Authorised IPs** hay que desactivar la restricción.

### Distinguir las dos credenciales de Brevo

Es el otro error fácil. Brevo entrega claves con prefijos distintos:

| Prefijo | Qué es | Sirve para |
|---------|--------|------------|
| `xsmtpsib-` | clave **SMTP** | `MAIL_PASSWORD`. Es la que necesita `JavaMailSender`. |
| `xkeysib-` | clave de **API REST v3** (y la del servidor MCP, envuelta en base64) | La API HTTP de Brevo. **No** autentica por SMTP. |

Y el *login* SMTP no es el correo personal: Brevo entrega uno propio, con el
formato `xxxxxx@smtp-brevo.com`. Ese va en `MAIL_USERNAME`; el correo personal
verificado va en `APP_MAIL_FROM`.

## Verificación de punta a punta

```bash
API='https://reservaya-vvke.onrender.com/api/v1'

# 1. Registrar una cuenta desechable (el + entrega al mismo buzón en Gmail
#    y en Google Workspace; udea.edu.co usa Google Workspace).
curl -sS -X POST "$API/auth/registro" -H 'Content-Type: application/json' -d '{
  "nombreCompleto": "Prueba Correo",
  "email": "TU.CORREO+prueba1@dominio.com",
  "password": "clave-de-prueba-2026",
  "rol": "CLIENTE"
}'

# 2. Pedir el reenvío (responde 200 exista o no la cuenta, a propósito:
#    no revela si un correo está registrado).
curl -sS -X POST "$API/auth/verificacion/reenvio" \
  -H 'Content-Type: application/json' \
  -d '{"email": "TU.CORREO+prueba1@dominio.com"}'
```

Después buscar `CORREO_VERIFICACION_ENVIADO` en los logs **y** el correo en la
bandeja. Las dos cosas: el evento prueba que el relay lo aceptó, la bandeja prueba
que lo entregó.

> **El reenvío no sirve para probar sobre una cuenta ya activa.**
> `ReenviarVerificacionService` filtra por `estado == PENDIENTE_VERIFICACION`, así
> que pedirlo para una cuenta `ACTIVO` no envía nada y tampoco deja evento en el
> log. Y responde `200` igual, porque a propósito no revela si el correo existe.
> Para probar el envío hay que **registrar una cuenta nueva**.

## Por qué no se puede activar una cuenta a mano sin tocar la base

El token vive en `tbl_tokens_verificacion.token_hash`, un SHA-256 de 64
caracteres (`TokenVerificacion.calcularHash`). El token en claro solo existe en
memoria durante el envío y nunca se guarda, así que **no se puede reconstruir el
enlace de verificación leyendo la base**. Es la decisión correcta: un volcado
robado no entrega enlaces de verificación válidos.

Si hace falta desbloquear una cuenta de prueba sin SMTP, el único camino es
cambiar su estado en la base:

```sql
UPDATE tbl_usuarios
   SET id_estado = (SELECT e.id
                      FROM tbl_estados e
                      JOIN tbl_tipos_estado te ON te.id = e.id_tipo_estado
                     WHERE te.nombre = 'USUARIO' AND e.nombre = 'ACTIVO')
 WHERE email IN ('cuenta@ejemplo.com');
```

Eso **salta la HU-03**, así que la verificación por correo hay que volver a
probarla de punta a punta antes de la entrega.

## Sobre el rol ADMIN

`tbl_roles` incluye `ADMIN` y `Rol.ADMIN` apunta a `/panel/admin`, pero hoy ese
rol no habilita nada:

- No se puede autorregistrar: `RegistroRequest` lo rechaza por patrón y
  `Usuario.registrar` lanza validación si el rol es `ADMIN`.
- Ningún endpoint ni `SecurityConfig` lo menciona, así que toda ruta protegida le
  responde 403. `VerificadorPropiedad` lo dice explícitamente para reservas.
- `/panel/admin` no existe en el frontend: cae en la página de «no encontrada».

Crear una cuenta `ADMIN` hoy produce una cuenta que inicia sesión y aterriza en un
404. Tiene sentido cuando se implementen la MFA de administrador y sus endpoints,
que siguen pendientes en `docs/modelo-datos-y-paquetes.md` §5.
