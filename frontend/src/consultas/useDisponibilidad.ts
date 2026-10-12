import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { consultarDisponibilidad } from '../api/api';
import type { Disponibilidad } from '../api/tipos';
import { llaves } from './llaves';

/**
 * Cada cuánto se vuelve a pedir la disponibilidad mientras la pestaña está visible.
 *
 * Treinta segundos es un compromiso deliberado. Más corto castigaría al plan
 * gratuito de Render sin que el usuario note la diferencia; más largo deja a la
 * vista turnos que ya tomó otra persona, que es exactamente el error que este
 * sondeo existe para evitar. Con la pestaña en segundo plano no se sondea: la
 * revalidación al volver el foco cubre ese caso sin gastar pedidos.
 */
const SONDEO_MS = 30_000;

export function useDisponibilidad(
  idServicio: number,
  desde: string,
  hasta: string,
  opciones: { activo?: boolean } = {},
) {
  const activo = opciones.activo ?? true;
  const rangoValido = Boolean(desde && hasta && desde <= hasta);

  return useQuery({
    queryKey: llaves.disponibilidad(idServicio, desde, hasta),
    queryFn: ({ signal }) => consultarDisponibilidad(idServicio, desde, hasta, { signal }),
    enabled: activo && rangoValido && Number.isFinite(idServicio),
    // La disponibilidad envejece rápido: se considera vieja a los 15 segundos para
    // que cualquier reentrada a la página traiga datos nuevos.
    staleTime: 15_000,
    refetchInterval: activo ? SONDEO_MS : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Detecta turnos que estaban en pantalla y dejaron de estar disponibles.
 *
 * Sirve para anunciarlo: que un botón desaparezca sin aviso es desconcertante, y
 * para quien usa lector de pantalla es invisible. Devuelve el mensaje una sola vez
 * por cambio, para no repetir el anuncio en cada render.
 */
export function useTurnosDesaparecidos(disponibilidad: Disponibilidad | undefined): string | null {
  const anteriores = useRef<Set<string> | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!disponibilidad) return;
    const actuales = new Set(disponibilidad.turnos.map((turno) => turno.fechaHoraInicio));
    const previos = anteriores.current;
    anteriores.current = actuales;

    if (!previos) return;
    const perdidos = [...previos].filter((inicio) => !actuales.has(inicio));
    if (perdidos.length === 0) return;

    setAviso(
      perdidos.length === 1
        ? 'Un turno que estaba libre acaba de ocuparse y se quitó de la lista.'
        : `${perdidos.length} turnos que estaban libres acaban de ocuparse y se quitaron de la lista.`,
    );
  }, [disponibilidad]);

  return aviso;
}
