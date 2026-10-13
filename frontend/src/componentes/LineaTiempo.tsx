import type { CambioEstadoReserva, CambioServicio, TipoCambioServicio } from '../api/tipos';
import { fechaYHora } from '../utiles/fechas';

/** Etiquetas legibles de los tipos de cambio del historial de servicios (HU-11). */
const ETIQUETA_CAMBIO: Record<TipoCambioServicio, string> = {
  CREACION: 'Servicio creado',
  HORARIO_CREADO: 'Bloque de agenda creado',
  HORARIO_EDITADO: 'Bloque de agenda editado',
  HORARIO_ELIMINADO: 'Bloque de agenda eliminado',
  RECURSOS_ASIGNADOS: 'Recursos asignados',
  ESTADO_CAMBIADO: 'Estado del servicio cambiado',
};

function Autor({ nombre, rol }: { nombre: string; rol: string }) {
  return (
    <span className="linea-tiempo__autor">
      {nombre} <span className="etiqueta-rol etiqueta-rol--discreta">{rol}</span>
    </span>
  );
}

/**
 * Cambios de estado de una reserva, del más antiguo al más reciente (HU-10, HU-14).
 *
 * Es una lista ordenada de verdad (`<ol>`) y no una pila de divs: un lector de
 * pantalla anuncia cuántos pasos hay y en qué posición va, que es justamente la
 * información que vuelve útil a un historial.
 */
export function LineaTiempoReserva({
  cambios,
  zonaHoraria,
}: {
  cambios: CambioEstadoReserva[];
  zonaHoraria?: string;
}) {
  if (cambios.length === 0) {
    return <p className="texto-apoyo">Esta reserva no registra cambios de estado.</p>;
  }

  return (
    <ol className="linea-tiempo">
      {cambios.map((cambio, indice) => (
        <li className="linea-tiempo__paso" key={`${cambio.fechaCambio}-${indice}`}>
          <p className="linea-tiempo__titulo">
            {cambio.estadoAnterior === null ? (
              <>
                Reserva creada como{' '}
                <span className={`insignia insignia--${cambio.estadoNuevo.toLowerCase()}`}>
                  {cambio.estadoNuevo}
                </span>
              </>
            ) : (
              <>
                <span className={`insignia insignia--${cambio.estadoAnterior.toLowerCase()}`}>
                  {cambio.estadoAnterior}
                </span>{' '}
                <span aria-hidden="true">→</span>{' '}
                <span className="solo-lectores">cambió a</span>{' '}
                <span className={`insignia insignia--${cambio.estadoNuevo.toLowerCase()}`}>
                  {cambio.estadoNuevo}
                </span>
              </>
            )}
          </p>
          <p className="linea-tiempo__detalle">
            <Autor nombre={cambio.realizadoPor.nombre} rol={cambio.realizadoPor.rol} />
            <span className="linea-tiempo__fecha">
              <time dateTime={cambio.fechaCambio}>{fechaYHora(cambio.fechaCambio, zonaHoraria)}</time>
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Cambios en la oferta de un servicio, en orden cronológico (HU-11). */
export function LineaTiempoServicio({
  cambios,
  mostrarServicio = false,
}: {
  cambios: CambioServicio[];
  mostrarServicio?: boolean;
}) {
  return (
    <ol className="linea-tiempo">
      {cambios.map((cambio) => (
        <li className="linea-tiempo__paso" key={cambio.id}>
          <p className="linea-tiempo__titulo">
            {ETIQUETA_CAMBIO[cambio.tipoCambio] ?? cambio.tipoCambio}
            {mostrarServicio ? (
              <span className="linea-tiempo__servicio"> · {cambio.nombreServicio}</span>
            ) : null}
          </p>

          {cambio.valorAnterior || cambio.valorNuevo ? (
            <p className="linea-tiempo__valores">
              {cambio.valorAnterior ? (
                <>
                  <span className="linea-tiempo__clave">Antes</span>
                  <span className="linea-tiempo__valor">{cambio.valorAnterior}</span>
                </>
              ) : null}
              {cambio.valorNuevo ? (
                <>
                  <span className="linea-tiempo__clave">Ahora</span>
                  <span className="linea-tiempo__valor">{cambio.valorNuevo}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <p className="linea-tiempo__detalle">
            <Autor nombre={cambio.realizadoPor.nombre} rol={cambio.realizadoPor.rol} />
            <span className="linea-tiempo__fecha">
              <time dateTime={cambio.fechaCambio}>{fechaYHora(cambio.fechaCambio)}</time>
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}
