import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cambiarEstadoServicio,
  consultarHistorialServicios,
  consultarServicio,
  crearServicio,
  listarServicios,
} from '../api/api';
import type { EstadoServicio, NuevoServicio, Servicio } from '../api/tipos';
import { useSesion } from '../sesion/useSesion';
import { llaves } from './llaves';

export function useCatalogo(filtros: { idProveedor?: number; idCategoria?: number } = {}) {
  return useQuery({
    queryKey: llaves.catalogo(filtros),
    queryFn: ({ signal }) => listarServicios(filtros, { signal }),
  });
}

export function useServicio(idServicio: number) {
  return useQuery({
    queryKey: llaves.servicio(idServicio),
    queryFn: ({ signal }) => consultarServicio(idServicio, { signal }),
    enabled: Number.isFinite(idServicio),
  });
}

/** Historial de cambios de los servicios del proveedor (HU-11). */
export function useHistorialServicios(idServicio?: number) {
  const { token } = useSesion();
  return useQuery({
    queryKey: llaves.historialServicios(idServicio),
    queryFn: ({ signal }) => consultarHistorialServicios(token as string, idServicio, { signal }),
    enabled: Boolean(token),
  });
}

/**
 * Activa o inactiva un servicio (HU-11).
 *
 * El cambio se adelanta en la caché del detalle y de los listados para que el
 * interruptor responda al instante. Al terminar se invalida el historial del
 * servicio, donde el backend acaba de registrar el cambio con su autor.
 */
export function useCambiarEstadoServicio() {
  const { token } = useSesion();
  const cache = useQueryClient();

  return useMutation({
    mutationFn: ({ idServicio, estado }: { idServicio: number; estado: EstadoServicio }) =>
      cambiarEstadoServicio(token as string, idServicio, estado),

    onMutate: async ({ idServicio, estado }) => {
      await cache.cancelQueries({ queryKey: llaves.servicios() });
      const fotoPrevia = cache.getQueriesData({ queryKey: llaves.servicios() });

      cache.setQueryData<Servicio>(llaves.servicio(idServicio), (previo) =>
        previo ? { ...previo, estado } : previo,
      );
      cache.setQueriesData<Servicio[]>({ queryKey: ['servicios', 'lista'] }, (previos) =>
        previos?.map((servicio) =>
          servicio.id === idServicio ? { ...servicio, estado } : servicio,
        ),
      );

      return { fotoPrevia };
    },

    onError: (_error, _variables, contexto) => {
      for (const [llave, datos] of contexto?.fotoPrevia ?? []) {
        cache.setQueryData(llave, datos);
      }
    },

    onSettled: () => {
      void cache.invalidateQueries({ queryKey: llaves.servicios() });
    },
  });
}

export function useCrearServicio() {
  const { token } = useSesion();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (datos: NuevoServicio) => crearServicio(token as string, datos),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: llaves.servicios() });
    },
  });
}
