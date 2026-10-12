import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelarReserva, consultarHistorialReservas, crearReserva } from '../api/api';
import type { FiltroHistorialReservas, HistorialReserva } from '../api/tipos';
import { useSesion } from '../sesion/useSesion';
import { llaves } from './llaves';

/** Historial de reservas con los cambios de estado de cada una (HU-10, HU-14). */
export function useHistorialReservas(filtros: FiltroHistorialReservas) {
  const { token } = useSesion();
  return useQuery({
    queryKey: llaves.historialReservas(filtros),
    queryFn: ({ signal }) => consultarHistorialReservas(token as string, filtros, { signal }),
    enabled: Boolean(token),
  });
}

/**
 * Crea una reserva.
 *
 * Esta no se adelanta en la caché a propósito: el servidor asigna recursos, valida
 * cupo y puede rechazarla con turnos alternativos. Mostrar una reserva que todavía
 * no existe sería prometer algo que no está en nuestras manos. Lo que sí se hace es
 * invalidar la disponibilidad al terminar, para que el cupo consumido desaparezca
 * de la grilla.
 */
export function useCrearReserva(idServicio: number) {
  const { token } = useSesion();
  const cache = useQueryClient();

  return useMutation({
    mutationFn: (fechaHoraInicio: string) =>
      crearReserva(token as string, idServicio, fechaHoraInicio),
    onSettled: () => {
      void cache.invalidateQueries({ queryKey: llaves.servicios() });
      void cache.invalidateQueries({ queryKey: llaves.reservas() });
    },
  });
}

/**
 * Cancela una reserva y pinta el resultado antes de que el servidor responda.
 *
 * La cancelación es la única mutación de esta aplicación que se puede anticipar sin
 * riesgo: el estado final es conocido (CANCELADA) y no depende de nada que el
 * servidor calcule. Se escribe en la caché al instante y, si el backend rechaza
 * —por plazo, por estado o por permisos—, se restaura la foto previa y el error se
 * muestra tal como vino. El usuario ve la reacción inmediata; la verdad sigue
 * siendo la del servidor.
 *
 * Al terminar se invalidan también las consultas de disponibilidad, porque cancelar
 * libera el cupo y los recursos: el turno tiene que reaparecer en la grilla.
 */
export function useCancelarReserva() {
  const { token } = useSesion();
  const cache = useQueryClient();

  return useMutation({
    mutationFn: (idReserva: number) => cancelarReserva(token as string, idReserva),

    onMutate: async (idReserva: number) => {
      await cache.cancelQueries({ queryKey: llaves.reservas() });
      const fotoPrevia = cache.getQueriesData({ queryKey: llaves.reservas() });

      // `estado` es lo único que se adelanta. La entrada del historial la escribe el
      // backend con su autor y su fecha reales; inventarla acá sería mentir.
      // El prefijo alcanza a todas las combinaciones de filtros en caché a la vez.
      cache.setQueriesData<HistorialReserva[]>(
        { queryKey: ['reservas', 'historial'] },
        (previas) =>
          previas?.map((entrada) =>
            entrada.idReserva === idReserva
              ? { ...entrada, estado: 'CANCELADA' as const }
              : entrada,
          ),
      );

      return { fotoPrevia };
    },

    onError: (_error, _idReserva, contexto) => {
      for (const [llave, datos] of contexto?.fotoPrevia ?? []) {
        cache.setQueryData(llave, datos);
      }
    },

    onSettled: () => {
      void cache.invalidateQueries({ queryKey: llaves.reservas() });
      void cache.invalidateQueries({ queryKey: llaves.servicios() });
    },
  });
}
