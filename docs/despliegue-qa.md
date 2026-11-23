# Entorno QA para las pruebas E2E

El archivo `render.qa.yaml` prepara un frontend y un backend independientes del despliegue original. Está preparado localmente; todavía no crea servicios en Render.

## Publicar la configuración

1. Subir `render.qa.yaml` y esta guía a una rama del repositorio de la aplicación. Si no se tienen permisos, usar un fork propio de `Satshman/ReservasServicios`. El repositorio Screenplay `SCRerservasServicios` contiene las pruebas, no el frontend ni el backend que Render debe construir.
2. En Render, elegir **New > Blueprint**, conectar el repositorio de la aplicación y seleccionar la rama que contiene estos archivos.
3. En **Blueprint Path**, indicar `render.qa.yaml`. Revisar que se creen los servicios `reservaya-api-qa` y `reservaya-web-qa` como recursos nuevos.
4. Completar las variables solicitadas según las siguientes secciones. Los nombres de servicio propuestos no garantizan el dominio final: Render muestra las URLs efectivas.

Los despliegues automáticos están desactivados para mantener fija la versión mientras se ejecuta la suite. Desplegar manualmente una revisión conocida antes de una ejecución y registrar su commit.

## Base de datos

Usar exclusivamente el proyecto Neon `fabrica`, rama `production`, base `neondb`, preparado para este trabajo. Aunque la rama se llama `production`, aquí corresponde al proyecto propio destinado a QA: no es la base original de Render.

En **Connect** de Neon obtener los datos y configurar el backend:

| Variable | Valor |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://<host-neon-qa>/neondb?sslmode=require` |
| `DB_USERNAME` | El rol de conexión mostrado en Neon |
| `DB_PASSWORD` | La contraseña del rol de conexión |

Usar una conexión directa para las migraciones Flyway. No versionar las credenciales. Al arrancar, Flyway valida el historial y Hibernate valida el esquema. Esta base contiene los catálogos y las migraciones V1 a V6, sin las cuentas del despliegue original. Comprobar en los logs que la validación de Flyway termina correctamente.

## URLs y correo

| Servicio | Variable | Valor |
| --- | --- | --- |
| Backend QA | `APP_BASE_URL` | URL pública HTTPS del backend QA, sin barra final. El código añade `/api/v1/auth/verificacion` al construir el enlace del correo. |
| Backend QA | `APP_CORS_ALLOWED_ORIGINS` | Origen HTTPS del frontend QA, sin barra final. |
| Frontend QA | `VITE_API_URL` | URL HTTPS del backend QA seguida de `/api/v1`. Es obligatoria para evitar que el frontend use por defecto el backend original. |

Render solicita estas variables al crear el Blueprint. Si todavía no se conocen las URLs, completarlas con los dominios propuestos, revisar las URLs reales al crearse los servicios y corregirlas antes de usar QA. Redesplegar el backend y reconstruir el frontend después de corregirlas; Vite incorpora `VITE_API_URL` durante la compilación.

El backend requiere un SMTP real accesible desde Render. Configurar `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` y `APP_MAIL_FROM` con los datos de un proveedor autorizado. La configuración propuesta utiliza el puerto 2525 con autenticación y STARTTLS, como el despliegue documentado en el README; ajustar puerto y TLS si el proveedor lo exige. Mailpit local no recibe automáticamente los correos de Render. No usar un servidor SMTP inexistente para completar el formulario.

## Comprobar el entorno antes de automatizar

1. Abrir `<backend-qa>/actuator/health` y comprobar la salud y los logs de arranque. La salud no comprueba el envío SMTP.
2. Abrir el frontend QA y revisar en Red del navegador que las peticiones se envían al backend QA.
3. Registrar y verificar cuentas de prueba de cliente y proveedor en QA y comprobar sus paneles.
4. Ejecutar las automatizaciones desde `e2eFabrica` con las credenciales de QA y la URL del frontend QA. No reutilizar las credenciales creadas en el despliegue original esperando que existan en esta base.

El código actual de `IniciarSesion` lee la propiedad JVM `reservaya.url` y concatena `ingresar`, por lo que la URL debe terminar en `/`. Para transmitirla al proceso de pruebas de Gradle se puede usar, en una terminal dedicada:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Dreservaya.url=https://<frontend-qa>/'
```

Esta variable aplica la propiedad a los procesos JVM iniciados desde esa terminal. Si ya contiene otras opciones, conservarlas. Las cuatro variables `RESERVAYA_CLIENT_EMAIL`, `RESERVAYA_CLIENT_PASSWORD`, `RESERVAYA_PROVIDER_EMAIL` y `RESERVAYA_PROVIDER_PASSWORD` deben corresponder a cuentas verificadas en QA.

El entorno QA no garantiza FIRST por sí mismo: cada escenario debe preparar datos identificables y aislados, limpiar sus propios datos cuando corresponda, usar esperas por condiciones y comprobar su resultado automáticamente. No ejecutar limpiezas globales sobre datos de otras personas. Los pasos de los 67 escenarios aún no están implementados por completo.

Referencias: README del proyecto; https://render.com/docs/blueprint-spec ; https://render.com/docs/infrastructure-as-code .
