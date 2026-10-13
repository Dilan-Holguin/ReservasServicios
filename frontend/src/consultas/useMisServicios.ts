import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { consultarServicio } from '../api/api';
import type { Servicio } from '../api/tipos';
import { useSesion } from '../sesion/useSesion';
import { llaves } from './llaves';
import { useHistorialServicios } from './useServicios';

/**
 * Servicios del proveedor autenticado, **incluidos los inactivos**.
 *
 * El camino importa, porque el obvio está roto. `GET /servicios` resuelve con
 * `listarActivos(...)`: en cuanto un proveedor inactiva un servicio, este
 * desaparece del listado público. Si el panel se armara filtrando ese listado
 * —como se hacía antes—, el servicio inactivado se borraría de la vista de su
 * propio dueño y no habría forma de volver a activarlo desde la interfaz.
 *
 * El historial del Sprint 2 lo resuelve de raíz. `GET /servicios/historial`
 * devuelve los cambios de todos los servicios del proveedor, activos o no, y todo
 * servicio tiene al menos su entrada de `CREACION`: de ahí sale la lista completa
 * de ids propios en **un** pedido. Después cada uno se lee con `GET /servicios/{id}`,
 * que no filtra por estado.
 *
 * De paso elimina el sondeo de `descubrirIdProveedor`, que probaba un servicio por
 * proveedor del catálogo hasta encontrar uno que respondiera 200 en lugar de 403.
 * El historial ya es prueba de propiedad: lo que devuelve es, por definición, tuyo.
 */
export function useMisServicios() {
  const { sesion, recordarProveedor } = useSesion();
  const historial = useHistorialServicios();

  const idsPropios = useMemo(() => {
    const ids = new Set<number>();
    for (const cambio of historial.data ?? []) ids.add(cambio.idServicio);
    return [...ids].sort((a, b) => a - b);
  }, [historial.data]);

  const consultas = useQueries({
    queries: idsPropios.map((idServicio) => ({
      queryKey: llaves.servicio(idServicio),
      queryFn: ({ signal }: { signal: AbortSignal }) => consultarServicio(idServicio, { signal }),
    })),
  });

  const servicios = useMemo(
    () =>
      consultas
        .map((consulta) => consulta.data)
        .filter((servicio): servicio is Servicio => servicio !== undefined)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [consultas],
  );

  // El id de proveedor no viaja en el token; el primer servicio propio lo revela.
  useEffect(() => {
    const primero = servicios[0];
    if (primero && sesion?.idProveedor !== primero.idProveedor) {
      recordarProveedor(primero.idProveedor);
    }
  }, [servicios, sesion?.idProveedor, recordarProveedor]);

  const cargandoFichas = consultas.some((consulta) => consulta.isPending);
  const errorFicha = consultas.find((consulta) => consulta.isError)?.error;

  return {
    servicios,
    isPending: historial.isPending || (idsPropios.length > 0 && cargandoFichas),
    isError: historial.isError || errorFicha !== undefined,
    error: historial.error ?? errorFicha,
    refetch: () => void historial.refetch(),
  };
}
