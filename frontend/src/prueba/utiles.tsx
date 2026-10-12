import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Sesion } from '../api/tipos';
import { SesionContext, type ContextoSesion } from '../sesion/SesionContext';
import type { SesionGuardada } from '../sesion/almacenamiento';

/**
 * Cliente de consultas para pruebas: sin reintentos y sin caché entre casos.
 *
 * En producción un fallo de red se reintenta tres veces con espera creciente; en
 * una prueba eso solo serviría para que un caso de error tarde ocho segundos en
 * fallar. La política de reintentos se prueba aparte, en su propia unidad.
 */
export function clienteDePrueba(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function sesionDePrueba(parcial: Partial<SesionGuardada> = {}): SesionGuardada {
  return {
    accessToken: 'token-de-prueba',
    rol: 'CLIENTE',
    email: 'cliente@ejemplo.com',
    idUsuario: 1,
    expiraEn: Date.now() + 60 * 60 * 1000,
    ...parcial,
  };
}

interface OpcionesRender {
  sesion?: SesionGuardada | null;
  ruta?: string;
  cliente?: QueryClient;
}

/**
 * Monta un componente con todo lo que el árbol real le da: enrutador, sesión y
 * cliente de consultas. Si una prueba tuviera que armar esos proveedores a mano,
 * dejaría de probar el componente y empezaría a probar el andamio.
 */
export function montar(nodo: ReactElement, opciones: OpcionesRender = {}) {
  const { sesion = null, ruta = '/', cliente = clienteDePrueba() } = opciones;

  const contexto: ContextoSesion = {
    sesion,
    token: sesion?.accessToken ?? null,
    abrirSesion: (_email: string, _respuesta: Sesion) => sesionDePrueba(),
    cerrarSesion: () => {},
    recordarProveedor: () => {},
  };

  function Envoltura({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[ruta]}>
        <SesionContext.Provider value={contexto}>
          <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
        </SesionContext.Provider>
      </MemoryRouter>
    );
  }

  return { ...render(nodo, { wrapper: Envoltura }), cliente };
}
