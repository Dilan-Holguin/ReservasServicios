import { describe, expect, it } from 'vitest';
import { DIAS_ANTICIPACION_CLIENTE, diasHasta, evaluarCancelacion } from './cancelacion';

const AHORA = new Date('2026-10-12T12:00:00Z').getTime();

function enDias(dias: number): string {
  return new Date(AHORA + dias * 24 * 60 * 60 * 1000).toISOString();
}

describe('evaluarCancelacion', () => {
  it('permite al cliente cancelar justo en el límite de la anticipación mínima', () => {
    // Arrange
    const reserva = { estado: 'CONFIRMADA' as const, fechaHoraInicio: enDias(DIAS_ANTICIPACION_CLIENTE) };

    // Act
    const veredicto = evaluarCancelacion(reserva, 'CLIENTE', AHORA);

    // Assert
    expect(veredicto.permitida).toBe(true);
    expect(veredicto.motivo).toBe('');
  });

  it('niega al cliente un día antes del límite y explica el plazo', () => {
    const reserva = {
      estado: 'CONFIRMADA' as const,
      fechaHoraInicio: enDias(DIAS_ANTICIPACION_CLIENTE - 1),
    };

    const veredicto = evaluarCancelacion(reserva, 'CLIENTE', AHORA);

    expect(veredicto.permitida).toBe(false);
    expect(veredicto.motivo).toContain(`${DIAS_ANTICIPACION_CLIENTE} días`);
  });

  it('permite al proveedor cancelar el mismo día, sin anticipación mínima (HU-15)', () => {
    const reserva = { estado: 'CONFIRMADA' as const, fechaHoraInicio: enDias(0.5) };

    expect(evaluarCancelacion(reserva, 'PROVEEDOR', AHORA).permitida).toBe(true);
    expect(evaluarCancelacion(reserva, 'CLIENTE', AHORA).permitida).toBe(false);
  });

  it('niega a cualquier rol una reserva que ya empezó', () => {
    const reserva = { estado: 'CONFIRMADA' as const, fechaHoraInicio: enDias(-0.1) };

    for (const rol of ['CLIENTE', 'PROVEEDOR'] as const) {
      const veredicto = evaluarCancelacion(reserva, rol, AHORA);
      expect(veredicto.permitida).toBe(false);
      expect(veredicto.motivo).toBe('La reserva ya comenzó.');
    }
  });

  it('niega una reserva ya cancelada o completada antes de mirar la fecha', () => {
    const lejana = enDias(30);

    expect(evaluarCancelacion({ estado: 'CANCELADA', fechaHoraInicio: lejana }, 'CLIENTE', AHORA))
      .toEqual({ permitida: false, motivo: 'Esta reserva ya está cancelada.' });
    expect(evaluarCancelacion({ estado: 'COMPLETADA', fechaHoraInicio: lejana }, 'PROVEEDOR', AHORA))
      .toEqual({ permitida: false, motivo: 'Una reserva completada no se puede cancelar.' });
  });

  it('deja decidir al backend cuando la fecha es ilegible', () => {
    // Si no se puede comparar nada, no se bloquea por las dudas: el servidor es
    // la autoridad y responderá con su propio código de error.
    const veredicto = evaluarCancelacion(
      { estado: 'CONFIRMADA', fechaHoraInicio: 'no-es-una-fecha' },
      'CLIENTE',
      AHORA,
    );

    expect(veredicto.permitida).toBe(true);
  });
});

describe('diasHasta', () => {
  it('cuenta días completos y devuelve negativo para el pasado', () => {
    expect(diasHasta(enDias(3.9), AHORA)).toBe(3);
    expect(diasHasta(enDias(-1), AHORA)).toBe(-1);
  });
});
