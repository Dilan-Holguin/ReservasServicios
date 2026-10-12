import type { EstadoReserva, Rol } from '../api/tipos';

/**
 * Anticipación mínima, en días, con la que un CLIENTE puede cancelar (HU-08).
 *
 * Es el valor por defecto de `CANCELACION_ANTICIPACION_MINIMA` en el backend. La
 * API no publica la política, así que este número la refleja en lugar de leerla:
 * sirve para *explicar* la regla antes de que el usuario pulse, nunca para
 * decidirla. La autoridad es el backend, que responde `CANCELACION_FUERA_DE_PLAZO`
 * si el plazo no se cumple; la interfaz muestra esa respuesta tal como viene.
 */
export const DIAS_ANTICIPACION_CLIENTE = 5;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface Cancelabilidad {
  permitida: boolean;
  /** Motivo en segunda persona, listo para mostrar. Vacío cuando sí se puede. */
  motivo: string;
}

interface ReservaCancelable {
  estado: EstadoReserva;
  fechaHoraInicio: string;
}

/**
 * Anticipa el veredicto del backend para poder explicarlo *antes* del intento.
 *
 * Un botón que se puede pulsar y después falla es peor que un botón desactivado
 * que dice por qué: el usuario aprende la regla sin chocarse con ella.
 */
export function evaluarCancelacion(
  reserva: ReservaCancelable,
  rol: Rol | undefined,
  ahora: number = Date.now(),
): Cancelabilidad {
  if (reserva.estado === 'CANCELADA') {
    return { permitida: false, motivo: 'Esta reserva ya está cancelada.' };
  }
  if (reserva.estado === 'COMPLETADA') {
    return { permitida: false, motivo: 'Una reserva completada no se puede cancelar.' };
  }

  const inicio = new Date(reserva.fechaHoraInicio).getTime();
  if (Number.isNaN(inicio)) return { permitida: true, motivo: '' };

  if (inicio <= ahora) {
    return { permitida: false, motivo: 'La reserva ya comenzó.' };
  }

  // El proveedor cancela sin anticipación mínima (HU-15): puede quedarse sin
  // personal o sin recursos el mismo día.
  if (rol === 'PROVEEDOR') return { permitida: true, motivo: '' };

  const diasRestantes = (inicio - ahora) / MS_POR_DIA;
  if (diasRestantes < DIAS_ANTICIPACION_CLIENTE) {
    return {
      permitida: false,
      motivo:
        `Solo puedes cancelar con al menos ${DIAS_ANTICIPACION_CLIENTE} días de ` +
        'anticipación. Escribe al proveedor para pedir la cancelación.',
    };
  }

  return { permitida: true, motivo: '' };
}

/** Días completos que faltan para el inicio; negativo si ya pasó. */
export function diasHasta(iso: string, ahora: number = Date.now()): number {
  const inicio = new Date(iso).getTime();
  if (Number.isNaN(inicio)) return 0;
  return Math.floor((inicio - ahora) / MS_POR_DIA);
}
