import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Lee y escribe estado en la barra de direcciones.
 *
 * Los filtros y los rangos de fecha viven en la URL, no en `useState`. Eso cambia
 * tres cosas que con estado local no funcionan: el botón «atrás» del navegador
 * deshace un filtro, un enlace copiado reproduce exactamente la misma vista, y
 * recargar la página no borra lo que el usuario había elegido.
 *
 * Se escribe con `replace` para no llenar el historial de entradas por cada
 * tecla, salvo que se pida lo contrario.
 */
export function useParametrosUrl() {
  const [parametros, setParametros] = useSearchParams();

  const fijar = useCallback(
    (cambios: Record<string, string | null>, opciones: { apilar?: boolean } = {}) => {
      setParametros(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === null || valor === '') siguientes.delete(clave);
            else siguientes.set(clave, valor);
          }
          return siguientes;
        },
        { replace: !opciones.apilar },
      );
    },
    [setParametros],
  );

  const leer = useCallback(
    (clave: string, porDefecto = '') => parametros.get(clave) ?? porDefecto,
    [parametros],
  );

  const leerNumero = useCallback(
    (clave: string): number | undefined => {
      const crudo = parametros.get(clave);
      if (crudo === null || crudo.trim() === '') return undefined;
      const numero = Number(crudo);
      return Number.isFinite(numero) ? numero : undefined;
    },
    [parametros],
  );

  return useMemo(() => ({ leer, leerNumero, fijar }), [leer, leerNumero, fijar]);
}
