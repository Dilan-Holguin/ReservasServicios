import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSesionExpirada } from '../sesion/useSesionExpirada';
import { crearClienteConsultas } from './cliente';

/**
 * Monta el cliente de consultas dentro del enrutador y de la sesión.
 *
 * Tiene que estar aquí dentro y no en `main.tsx` porque el manejo del 401 necesita
 * navegar y cerrar la sesión, y eso solo existe bajo `<BrowserRouter>` y
 * `<ProveedorSesion>`. Con el cliente en este nivel, **cualquier** consulta que
 * reciba un 401 lleva a ingresar: antes eso solo pasaba en las páginas que se
 * acordaban de atrapar el error una por una.
 *
 * El manejador se guarda en una referencia porque cambia con la ubicación, y el
 * cliente de consultas debe crearse una sola vez: recrearlo en cada render tiraría
 * la caché entera en cada navegación.
 */
export function ProveedorConsultas({ children }: { children: ReactNode }) {
  const manejarSesionExpirada = useSesionExpirada();
  const manejador = useRef(manejarSesionExpirada);

  useEffect(() => {
    manejador.current = manejarSesionExpirada;
  }, [manejarSesionExpirada]);

  const [cliente] = useState(() =>
    crearClienteConsultas((error) => manejador.current(error)),
  );

  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
