package co.reservas.application.service.auth;

import co.reservas.application.port.out.auth.NotificacionPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envía el correo de verificación después del commit. Un fallo se registra y nunca revierte el registro.
 */
@Component
public class NotificadorVerificacionCuenta {

    private static final Logger log = LoggerFactory.getLogger(NotificadorVerificacionCuenta.class);

    private final NotificacionPort notificaciones;

    public NotificadorVerificacionCuenta(NotificacionPort notificaciones) {
        this.notificaciones = notificaciones;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alSolicitarVerificacion(VerificacionCuentaSolicitada evento) {
        try {
            notificaciones.enviarVerificacionCuenta(evento.email(), evento.nombre(), evento.tokenPlano());
            log.atInfo()
                    .addKeyValue("evento", "CORREO_VERIFICACION_ENVIADO")
                    .addKeyValue("idUsuario", evento.idUsuario())
                    .log("Correo de verificación enviado");
        } catch (RuntimeException e) {
            log.atWarn()
                    .addKeyValue("evento", "CORREO_VERIFICACION_FALLIDO")
                    .addKeyValue("idUsuario", evento.idUsuario())
                    .addKeyValue("causa", e.getClass().getSimpleName())
                    .addKeyValue("detalle", detalleRaiz(e))
                    .log("No se pudo enviar el correo de verificación; el usuario puede solicitar un reenvío");
        }
    }

    /**
     * Mensaje de la causa más profunda, que es donde el servidor SMTP explica el rechazo.
     *
     * Registrar solo {@code getClass().getSimpleName()} no alcanzó: un fallo real de Brevo
     * quedó como «MailSendException» y hubo que reproducir el envío por fuera para
     * descubrir que la cuenta tenía lista blanca de IPs. El nombre de la clase dice que
     * algo falló; el mensaje del servidor dice por qué, y es lo único que ahorra el viaje.
     *
     * No incluye credenciales: las respuestas SMTP de rechazo traen el remitente y el
     * motivo, nunca la contraseña con la que se autenticó la sesión.
     */
    private static String detalleRaiz(Throwable error) {
        Throwable actual = error;
        while (actual.getCause() != null && actual.getCause() != actual) {
            actual = actual.getCause();
        }
        String mensaje = actual.getMessage();
        String descripcion = mensaje == null || mensaje.isBlank()
                ? actual.getClass().getName()
                : mensaje.strip();
        // Las respuestas multilínea del servidor se aplanan para no romper el log JSON.
        descripcion = descripcion.replaceAll("\\s+", " ");
        return descripcion.length() > 300 ? descripcion.substring(0, 300) + "…" : descripcion;
    }
}
