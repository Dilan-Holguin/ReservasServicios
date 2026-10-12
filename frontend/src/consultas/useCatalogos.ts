import { useQuery } from '@tanstack/react-query';
import { listarCategorias } from '../api/api';
import { llaves } from './llaves';

/**
 * Los catálogos son filas semilla: cambian con una migración, no con el uso.
 * Una hora de frescura evita releerlos en cada navegación.
 */
const UNA_HORA = 60 * 60 * 1000;

export function useCategorias() {
  return useQuery({
    queryKey: llaves.categorias(),
    queryFn: ({ signal }) => listarCategorias({ signal }),
    staleTime: UNA_HORA,
  });
}

// Nota: `GET /catalogos/tipos-recurso` lo consume `SeccionRecursos`, que todavía
// llama a la API de forma imperativa con el token. Cuando esa sección se migre,
// su hook se escribe acá; antes de eso sería un hook sin uso.
