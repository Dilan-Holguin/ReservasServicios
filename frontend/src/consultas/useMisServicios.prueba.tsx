import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Sesion } from '../api/tipos';
import { SesionContext, type ContextoSesion } from '../sesion/SesionContext';
import { clienteDePrueba, sesionDePrueba } from '../prueba/utiles';
import { useMisServicios } from './useMisServicios';

function respuesta(status: number, cuerpo: unknown): Response {
  return { ok: status < 400, status, text: async () => JSON.stringify(cuerpo) } as Response;
}

function servicio(id: number, nombre: string, estado: 'ACTIVO' | 'INACTIVO') {
  return {
    id,
    idProveedor: 9,
    nombreProveedor: 'Peluquería Centro',
    zonaHoraria: 'America/Bogota',
    idCategoria: 1,
    nombre,
    descripcion: null,
    duracionMinutos: 30,
    capacidad: 1,
    estado,
  };
}

function cambioDeCreacion(idServicio: number, nombreServicio: string) {
  return {
    id: idServicio * 10,
    idServicio,
    nombreServicio,
    tipoCambio: 'CREACION',
    valorAnterior: null,
    valorNuevo: nombreServicio,
    realizadoPor: { idUsuario: 9, nombre: 'Dueña', rol: 'PROVEEDOR' },
    fechaCambio: '2026-10-01T10:00:00Z',
  };
}

function envoltura({ children }: { children: ReactNode }) {
  const sesion = sesionDePrueba({ rol: 'PROVEEDOR', email: 'duena@ejemplo.com' });
  const contexto: ContextoSesion = {
    sesion,
    token: sesion.accessToken,
    abrirSesion: (_email: string, _respuesta: Sesion) => sesion,
    cerrarSesion: () => {},
    recordarProveedor: () => {},
  };
  return (
    <MemoryRouter>
      <SesionContext.Provider value={contexto}>
        <QueryClientProvider client={clienteDePrueba()}>{children}</QueryClientProvider>
      </SesionContext.Provider>
    </MemoryRouter>
  );
}

describe('useMisServicios', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Esta es la razón de existir del hook.
   *
   * `GET /servicios` resuelve con `listarActivos(...)`, así que un servicio
   * inactivado desaparece del catálogo público. Si el panel del proveedor se armara
   * filtrando ese catálogo, el dueño perdería de vista su propio servicio y no
   * tendría forma de volver a activarlo. El historial lo rescata.
   */
  it('incluye los servicios inactivos, que el catálogo público ya no devuelve', async () => {
    const espia = vi.fn(async (entrada: string | URL | Request) => {
      const url = String(entrada);
      if (url.includes('/servicios/historial')) {
        return respuesta(200, [cambioDeCreacion(1, 'Corte'), cambioDeCreacion(2, 'Tinte')]);
      }
      if (url.endsWith('/servicios/1')) return respuesta(200, servicio(1, 'Corte', 'ACTIVO'));
      if (url.endsWith('/servicios/2')) return respuesta(200, servicio(2, 'Tinte', 'INACTIVO'));
      // El listado público solo tiene el activo: por eso no se usa acá.
      if (url.includes('/servicios')) return respuesta(200, [servicio(1, 'Corte', 'ACTIVO')]);
      return respuesta(200, []);
    });
    vi.stubGlobal('fetch', espia);

    const { result } = renderHook(() => useMisServicios(), { wrapper: envoltura });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.servicios.map((s) => s.nombre)).toEqual(['Corte', 'Tinte']);
    expect(result.current.servicios.find((s) => s.nombre === 'Tinte')?.estado).toBe('INACTIVO');
  });

  it('deduce los servicios propios del historial, sin sondear el catálogo ajeno', async () => {
    const espia = vi.fn(async (entrada: string | URL | Request) => {
      const url = String(entrada);
      if (url.includes('/servicios/historial')) {
        // Dos cambios del mismo servicio: el id no se debe repetir.
        return respuesta(200, [cambioDeCreacion(1, 'Corte'), cambioDeCreacion(1, 'Corte')]);
      }
      if (url.endsWith('/servicios/1')) return respuesta(200, servicio(1, 'Corte', 'ACTIVO'));
      return respuesta(200, []);
    });
    vi.stubGlobal('fetch', espia);

    const { result } = renderHook(() => useMisServicios(), { wrapper: envoltura });

    await waitFor(() => expect(result.current.servicios).toHaveLength(1));

    const urls = espia.mock.calls.map((llamada) => String(llamada[0]));
    // Un pedido al historial y uno por servicio propio: ni uno más.
    expect(urls.filter((url) => url.includes('/servicios/historial'))).toHaveLength(1);
    expect(urls.filter((url) => url.endsWith('/servicios/1'))).toHaveLength(1);
    // Y ninguna llamada al sondeo de propiedad que se usaba antes.
    expect(urls.some((url) => url.includes('/reservas') && !url.includes('historial'))).toBe(false);
  });

  it('devuelve una lista vacía cuando el proveedor no tiene servicios', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respuesta(200, [])),
    );

    const { result } = renderHook(() => useMisServicios(), { wrapper: envoltura });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.servicios).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});
