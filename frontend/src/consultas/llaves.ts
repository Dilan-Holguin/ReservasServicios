import type { FiltroHistorialReservas } from '../api/tipos';

/**
 * Llaves de caché en un solo lugar.
 *
 * Cada llave es un arreglo jerárquico: `['reservas']` es el prefijo de todas las
 * consultas de reservas, así que invalidar ese prefijo alcanza a `['reservas','mias']`
 * y a `['reservas','historial', filtros]` sin enumerarlas. Tenerlas centralizadas
 * evita el error clásico de invalidar una llave que se escribió distinto en otra página.
 */
export const llaves = {
  categorias: () => ['catalogos', 'categorias'] as const,

  servicios: () => ['servicios'] as const,
  catalogo: (filtros: { idProveedor?: number; idCategoria?: number }) =>
    ['servicios', 'lista', filtros] as const,
  servicio: (id: number) => ['servicios', 'detalle', id] as const,
  historialServicios: (idServicio?: number) =>
    ['servicios', 'historial', idServicio ?? 'todos'] as const,
  disponibilidad: (idServicio: number, desde: string, hasta: string) =>
    ['servicios', idServicio, 'disponibilidad', desde, hasta] as const,

  reservas: () => ['reservas'] as const,
  historialReservas: (filtros: FiltroHistorialReservas) =>
    ['reservas', 'historial', filtros] as const,
} as const;
