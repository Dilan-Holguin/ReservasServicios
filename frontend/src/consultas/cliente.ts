import { QueryCache, QueryClient } from '@tanstack/react-query';
import { esErrorApi } from '../api/cliente';

/**
 * Número máximo de reintentos para un fallo que puede resolverse solo.
 *
 * El backend corre en el plan gratuito de Render, que suspende el servicio por
 * inactividad: el primer pedido después de una pausa puede tardar más de un
 * minuto o fallar de plano mientras el contenedor arranca. Reintentar con
 * espera creciente convierte ese arranque en frío en una demora, no en un error
 * en la cara del usuario.
 */
const REINTENTOS = 3;

/** Un fallo de red o un 5xx puede resolverse solo; un 4xx, nunca. */
function vuelveAIntentarse(error: unknown): boolean {
  if (!esErrorApi(error)) return false;
  if (error.esSesionInvalida) return false;
  return error.status === 0 || error.status >= 500;
}

function esperaAntesDeReintentar(intento: number): number {
  return Math.min(1000 * 2 ** intento, 8000);
}

/**
 * Crea el cliente de consultas. Recibe el manejador de sesión expirada para que
 * un 401 en cualquier consulta —no solo en las que la página recuerda atrapar—
 * cierre la sesión y lleve a ingresar.
 */
export function crearClienteConsultas(alExpirarSesion: (error: unknown) => boolean): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        alExpirarSesion(error);
      },
    }),
    defaultOptions: {
      queries: {
        // Los datos se consideran frescos un minuto: evita releer el catálogo al
        // navegar entre páginas, pero mantiene la disponibilidad razonablemente viva.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (intento, error) => vuelveAIntentarse(error) && intento < REINTENTOS,
        retryDelay: esperaAntesDeReintentar,
        // Al volver a la pestaña se revalida: si alguien reservó mientras no mirabas,
        // la grilla se corrige sola en lugar de mentirte.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Una mutación cambia datos: reintentarla sola puede duplicar una reserva.
        retry: false,
      },
    },
  });
}
