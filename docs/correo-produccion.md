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
| `MAIL_HOST` | `smtp-relay.brevo.com` |
| `MAIL_PORT` | `587` |
| `MAIL_SMTP_AUTH` | `true` |
| `MAIL_SMTP_STARTTLS` | `true` |
| `MAIL_USERNAME` | el login SMTP de Brevo |
| `MAIL_PASSWORD` | la clave SMTP de Brevo |
| `APP_MAIL_FROM` | el remitente verificado en el paso 2 |

Guardar reinicia el servicio. En el plan gratuito el arranque tarda cerca de tres
minutos.

> `APP_MAIL_FROM` no puede ser una dirección de un dominio que no controlemos. El
> valor que había, `no-reply@reservaya.app`, es de un dominio ajeno y ningún
> proveedor serio lo deja salir.

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
