import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HistorialReserva } from '../api/tipos';
import { PanelCliente } from './PanelCliente';
import { montar, sesionDePrueba } from '../prueba/utiles';

const DIA = 24 * 60 * 60 * 1000;

function enDias(dias: number): string {
  return new Date(Date.now() + dias * DIA).toISOString();
}

function reserva(parcial: Partial<HistorialReserva> = {}): HistorialReserva {
  return {
    idReserva: 41,
    idServicio: 7,
    nombreServicio: 'Corte de cabello',
    idCliente: 1,
    estado: 'CONFIRMADA',
    fechaHoraInicio: enDias(20),
    fechaHoraFin: enDias(20),
    creadoEn: enDias(-3),
    cambios: [
      {
        estadoAnterior: null,
        estadoNuevo: 'CONFIRMADA',
        realizadoPor: { idUsuario: 1, nombre: 'Ana Cliente', rol: 'CLIENTE' },
        fechaCambio: enDias(-3),
      },
    ],
    ...parcial,
  };
}

interface Escenario {
  /** Estado del servidor; la cancelación exitosa lo modifica, como en la vida real. */
  historial: HistorialReserva[];
  /** Respuesta de la cancelación: `null` para éxito, o el cuerpo de error. */
  fallaCancelacion?: { status: number; errorCode: string; message: string };
}

function servidor(escenario: Escenario) {
  const espia = vi.fn(async (entrada: string | URL | Request, opciones?: RequestInit) => {
    const url = String(entrada);
    const metodo = opciones?.method ?? 'GET';

    if (url.includes('/reservas/historial')) {
      return respuesta(200, escenario.historial);
    }

    if (metodo === 'POST' && /\/reservas\/\d+\/cancelacion/.test(url)) {
      if (escenario.fallaCancelacion) {
        const { status, errorCode, message } = escenario.fallaCancelacion;
        return respuesta(status, {
          errorCode,
          message,
          details: [],
          traceId: 'traza-de-prueba',
          timestamp: new Date().toISOString(),
        });
      }
      // El servidor acepta: su estado cambia y el refresco posterior lo refleja.
      escenario.historial = escenario.historial.map((entrada) =>
        entrada.idReserva === 41 ? { ...entrada, estado: 'CANCELADA' as const } : entrada,
      );
      return respuesta(200, { id: 41, estado: 'CANCELADA' });
    }

    return respuesta(200, []);
  });

  vi.stubGlobal('fetch', espia);
  return espia;
}

function respuesta(status: number, cuerpo: unknown): Response {
  return {
    ok: status < 400,
    status,
    text: async () => JSON.stringify(cuerpo),
  } as Response;
}

function montarPanel() {
  return montar(<PanelCliente />, { sesion: sesionDePrueba(), ruta: '/panel/cliente' });
}

/**
 * Estado que muestra la insignia de la tarjeta.
 *
 * Hace falta acotar la búsqueda dos veces. La palabra «Estado» también rotula el
 * filtro de la cabecera, y el nombre del estado aparece además dentro de la línea de
 * tiempo del plegable. Si se buscara el texto suelto, la aserción informaría que hay
 * varias coincidencias en vez de responder la pregunta que importa: qué estado
 * anuncia la tarjeta.
 */
function estadoEnLaTarjeta(): string {
  const tarjeta = screen.getByRole('article');
  const clave = within(tarjeta).getByText('Estado');
  return (clave.parentElement?.textContent ?? '').replace('Estado', '').trim();
}

describe('PanelCliente', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el historial real de cada reserva, con autor y estado', async () => {
    servidor({ historial: [reserva()] });

    montarPanel();

    expect(await screen.findByText('Corte de cabello')).toBeInTheDocument();
    expect(estadoEnLaTarjeta()).toBe('CONFIRMADA');

    // El plegable nombra en singular cuando hay un solo cambio.
    await userEvent.click(screen.getByText('Ver el cambio de esta reserva'));

    expect(screen.getByText('Ana Cliente')).toBeInTheDocument();
    expect(screen.getByText(/Reserva creada como/)).toBeInTheDocument();
  });

  it('explica el plazo en lugar de ofrecer un botón que va a fallar', async () => {
    // Dentro de la ventana de 5 días: el backend lo rechazaría, así que no se ofrece.
    servidor({ historial: [reserva({ fechaHoraInicio: enDias(2), fechaHoraFin: enDias(2) })] });

    montarPanel();

    expect(await screen.findByText(/Solo puedes cancelar con al menos 5 días/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
  });

  it('cancela, pinta el nuevo estado al instante y lo anuncia', async () => {
    const usuario = userEvent.setup();
    servidor({ historial: [reserva()] });

    montarPanel();

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));

    // El diálogo confirma antes de actuar y nombra las consecuencias.
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar la reserva' });
    expect(within(dialogo).getByText(/Su cupo y sus recursos se liberan/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sí, cancelar la reserva' }));

    // La insignia cambia sin esperar al servidor, y el resultado se anuncia.
    await waitFor(() => expect(estadoEnLaTarjeta()).toBe('CANCELADA'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/quedó cancelada/),
    );
  });

  it('revierte el estado y muestra el motivo si el backend rechaza la cancelación', async () => {
    const usuario = userEvent.setup();
    servidor({
      historial: [reserva()],
      fallaCancelacion: {
        status: 422,
        errorCode: 'CANCELACION_FUERA_DE_PLAZO',
        message: 'La cancelación requiere al menos 5 días de anticipación.',
      },
    });

    montarPanel();

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
    await usuario.click(screen.getByRole('button', { name: 'Sí, cancelar la reserva' }));

    // El mensaje del contrato, con su código de seguimiento.
    expect(
      await screen.findByText('La cancelación requiere al menos 5 días de anticipación.'),
    ).toBeInTheDocument();
    expect(screen.getByText('traza-de-prueba')).toBeInTheDocument();

    // Y la reserva volvió a su estado real: el adelanto se deshizo.
    await waitFor(() => expect(estadoEnLaTarjeta()).toBe('CONFIRMADA'));
  });

  it('pide el historial filtrado según lo que trae la dirección de la página', async () => {
    const espia = servidor({ historial: [] });

    montar(<PanelCliente />, {
      sesion: sesionDePrueba(),
      ruta: '/panel/cliente?estado=CANCELADA&desde=2026-10-01&hasta=2026-10-31',
    });

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const url = String(espia.mock.calls[0][0]);
    expect(url).toContain('estado=CANCELADA');
    expect(url).toContain('desde=2026-10-01');
    expect(url).toContain('hasta=2026-10-31');

    // Y el filtro se refleja en el control, no solo en la petición.
    expect(screen.getByLabelText('Estado')).toHaveValue('CANCELADA');
  });
});
