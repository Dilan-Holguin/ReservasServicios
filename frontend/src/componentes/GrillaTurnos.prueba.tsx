import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrillaTurnos, type FilaDeDia } from './GrillaTurnos';
import { montar } from '../prueba/utiles';

/** Dos días con distinta cantidad de turnos: el lunes 3, el martes 2. */
const FILAS: FilaDeDia[] = [
  {
    dia: '2026-10-12',
    turnos: [
      { fechaHoraInicio: '2026-10-12T09:00:00-05:00', fechaHoraFin: '2026-10-12T09:30:00-05:00', cuposDisponibles: 2 },
      { fechaHoraInicio: '2026-10-12T10:00:00-05:00', fechaHoraFin: '2026-10-12T10:30:00-05:00', cuposDisponibles: 1 },
      { fechaHoraInicio: '2026-10-12T11:00:00-05:00', fechaHoraFin: '2026-10-12T11:30:00-05:00', cuposDisponibles: 3 },
    ],
  },
  {
    dia: '2026-10-13',
    turnos: [
      { fechaHoraInicio: '2026-10-13T09:00:00-05:00', fechaHoraFin: '2026-10-13T09:30:00-05:00', cuposDisponibles: 1 },
      { fechaHoraInicio: '2026-10-13T10:00:00-05:00', fechaHoraFin: '2026-10-13T10:30:00-05:00', cuposDisponibles: 1 },
    ],
  },
];

function pintar(propiedades: Partial<Parameters<typeof GrillaTurnos>[0]> = {}) {
  const onElegir = vi.fn();
  montar(
    <>
      <h2 id="etiqueta">Disponibilidad</h2>
      <GrillaTurnos
        filas={FILAS}
        zonaHoraria="America/Bogota"
        enVuelo={null}
        idEtiqueta="etiqueta"
        onElegir={onElegir}
        {...propiedades}
      />
    </>,
  );
  return { onElegir, celdas: screen.getAllByRole('button') };
}

describe('GrillaTurnos', () => {
  it('expone la semántica de grilla con su nombre accesible y sus filas', () => {
    pintar();

    const grilla = screen.getByRole('grid', { name: 'Disponibilidad' });
    expect(grilla).toHaveAttribute('aria-rowcount', '2');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('gridcell')).toHaveLength(5);
  });

  it('es una sola parada de tabulación: solo una celda es alcanzable con Tab', () => {
    const { celdas } = pintar();

    const alcanzables = celdas.filter((celda) => celda.getAttribute('tabindex') === '0');

    expect(alcanzables).toHaveLength(1);
    expect(alcanzables[0]).toBe(celdas[0]);
  });

  it('recorre los turnos del día con las flechas horizontales', async () => {
    const usuario = userEvent.setup();
    const { celdas } = pintar();

    await usuario.tab();
    expect(celdas[0]).toHaveFocus();

    await usuario.keyboard('{ArrowRight}');
    expect(celdas[1]).toHaveFocus();

    await usuario.keyboard('{ArrowRight}{ArrowLeft}');
    expect(celdas[1]).toHaveFocus();
  });

  it('no se sale de la fila en los extremos', async () => {
    const usuario = userEvent.setup();
    const { celdas } = pintar();

    await usuario.tab();
    await usuario.keyboard('{ArrowLeft}');
    expect(celdas[0]).toHaveFocus();

    await usuario.keyboard('{End}{ArrowRight}');
    expect(celdas[2]).toHaveFocus();
  });

  it('baja al día siguiente y acota la columna cuando ese día tiene menos turnos', async () => {
    const usuario = userEvent.setup();
    const { celdas } = pintar();

    await usuario.tab();
    // Tercera columna del lunes; el martes solo tiene dos turnos.
    await usuario.keyboard('{End}');
    expect(celdas[2]).toHaveFocus();

    await usuario.keyboard('{ArrowDown}');
    expect(celdas[4]).toHaveFocus();
  });

  it('salta al primero y al último turno de todo el rango con Ctrl', async () => {
    const usuario = userEvent.setup();
    const { celdas } = pintar();

    await usuario.tab();
    await usuario.keyboard('{Control>}{End}{/Control}');
    expect(celdas[4]).toHaveFocus();

    await usuario.keyboard('{Control>}{Home}{/Control}');
    expect(celdas[0]).toHaveFocus();
  });

  it('reserva el turno enfocado con Entrar y con Espacio', async () => {
    const usuario = userEvent.setup();
    const { onElegir, celdas } = pintar();

    await usuario.tab();
    await usuario.keyboard('{ArrowRight}{Enter}');
    expect(celdas[1]).toHaveFocus();
    expect(onElegir).toHaveBeenCalledWith('2026-10-12T10:00:00-05:00');

    await usuario.keyboard('[Space]');
    expect(onElegir).toHaveBeenCalledTimes(2);
    expect(onElegir).toHaveBeenLastCalledWith('2026-10-12T10:00:00-05:00');
  });

  it('mantiene las celdas enfocables mientras una reserva está en vuelo', async () => {
    const usuario = userEvent.setup();
    const { onElegir, celdas } = pintar({ enVuelo: '2026-10-12T09:00:00-05:00' });

    // `aria-disabled` en lugar de `disabled`: un botón deshabilitado pierde el foco y
    // dejaría al usuario fuera de la grilla justo en medio del recorrido.
    expect(celdas[1]).toHaveAttribute('aria-disabled', 'true');
    expect(celdas[1]).not.toBeDisabled();
    expect(celdas[0]).toHaveAttribute('aria-busy', 'true');

    await usuario.tab();
    await usuario.keyboard('{ArrowRight}');
    expect(celdas[1]).toHaveFocus();

    // Enfocable, sí; accionable, no: no se puede disparar una segunda reserva.
    await usuario.keyboard('{Enter}');
    expect(onElegir).not.toHaveBeenCalled();
  });

  it('anuncia cuántos turnos hay y cómo recorrerlos', () => {
    pintar();

    expect(screen.getByText(/5 turnos disponibles/)).toBeInTheDocument();
    expect(screen.getByText(/flechas del teclado/)).toBeInTheDocument();
  });
});
