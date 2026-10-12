import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  EstadoReserva,
  FiltroHistorialReservas,
  HistorialReserva,
  Servicio,
} from '../../api/tipos';
import { Dialogo } from '../../componentes/Dialogo';
import { Anuncio, CajaError, Cargando, Vacio } from '../../componentes/Estados';
import { LineaTiempoReserva } from '../../componentes/LineaTiempo';
import { useCancelarReserva, useHistorialReservas } from '../../consultas/useReservas';
import { useSesion } from '../../sesion/useSesion';
import { evaluarCancelacion } from '../../utiles/cancelacion';
import { fechaLarga, soloHora } from '../../utiles/fechas';

const ESTADOS: EstadoReserva[] = ['CONFIRMADA', 'CANCELADA', 'COMPLETADA'];

interface Props {
  servicios: Servicio[];
  leer: (clave: string, porDefecto?: string) => string;
  fijar: (cambios: Record<string, string | null>) => void;
}

/**
 * Reservas de los servicios del proveedor, con su historial de cambios (HU-14),
 * y la cancelación como proveedor (HU-15), que no tiene anticipación mínima.
 */
export function HistorialDeReservas({ servicios, leer, fijar }: Props) {
  const { sesion } = useSesion();
  const [porCancelar, setPorCancelar] = useState<HistorialReserva | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const estado = leer('estado') as EstadoReserva | '';
  const servicioCrudo = leer('servicio');
  const desde = leer('desde');
  const hasta = leer('hasta');

  const filtros: FiltroHistorialReservas = useMemo(() => {
    const id = servicioCrudo ? Number(servicioCrudo) : undefined;
    return {
      ...(estado ? { estado } : {}),
      ...(id !== undefined && Number.isFinite(id) ? { idServicio: id } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    };
  }, [estado, servicioCrudo, desde, hasta]);

  const historial = useHistorialReservas(filtros);
  const cancelacion = useCancelarReserva();
  const hayFiltros = Object.keys(filtros).length > 0;

  function confirmar() {
    if (!porCancelar) return;
    const entrada = porCancelar;
    cancelacion.mutate(entrada.idReserva, {
      onSuccess: () => {
        setAviso(
          `La reserva #${entrada.idReserva} de ${entrada.nombreServicio} quedó cancelada. Su cupo y sus recursos volvieron a estar disponibles.`,
        );
      },
    });
    setPorCancelar(null);
  }

  return (
    <section aria-labelledby="titulo-reservas-proveedor">
      <h2 id="titulo-reservas-proveedor">Reservas de mis servicios</h2>
      <p className="texto-apoyo">
        Como proveedor puedes cancelar una reserva sin anticipación mínima, por ejemplo si te queda
        sin personal o sin recursos. Cada cancelación queda registrada con tu nombre.
      </p>

      <div className="filtros__campos">
        <div className="campo campo--compacto">
          <label className="campo__etiqueta" htmlFor="reservas-servicio">
            Servicio
          </label>
          <select
            id="reservas-servicio"
            className="campo__control"
            value={servicioCrudo}
            onChange={(evento) => fijar({ servicio: evento.target.value || null })}
          >
            <option value="">Todos mis servicios</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo--compacto">
          <label className="campo__etiqueta" htmlFor="reservas-estado">
            Estado
          </label>
          <select
            id="reservas-estado"
            className="campo__control"
            value={estado}
            onChange={(evento) => fijar({ estado: evento.target.value || null })}
          >
            <option value="">Todos</option>
            {ESTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo--compacto">
          <label className="campo__etiqueta" htmlFor="reservas-desde">
            Desde
          </label>
          <input
            id="reservas-desde"
            className="campo__control"
            type="date"
            value={desde}
            onChange={(evento) => fijar({ desde: evento.target.value || null })}
          />
        </div>
        <div className="campo campo--compacto">
          <label className="campo__etiqueta" htmlFor="reservas-hasta">
            Hasta
          </label>
          <input
            id="reservas-hasta"
            className="campo__control"
            type="date"
            value={hasta}
            onChange={(evento) => fijar({ hasta: evento.target.value || null })}
          />
        </div>
        {hayFiltros ? (
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => fijar({ estado: null, servicio: null, desde: null, hasta: null })}
          >
            Quitar filtros
          </button>
        ) : null}
      </div>

      <Anuncio mensaje={aviso} tono="exito" />

      {cancelacion.isError ? (
        <CajaError error={cancelacion.error} titulo="No se pudo cancelar la reserva" />
      ) : null}

      {historial.isPending ? <Cargando mensaje="Cargando las reservas…" /> : null}

      {historial.isError ? (
        <CajaError
          error={historial.error}
          titulo="No se pudieron cargar las reservas"
          onReintentar={() => void historial.refetch()}
        />
      ) : null}

      {historial.isSuccess && (historial.data?.length ?? 0) === 0 ? (
        <Vacio
          titulo={hayFiltros ? 'Ninguna reserva coincide con el filtro' : 'Todavía no hay reservas'}
          detalle={
            hayFiltros
              ? 'Prueba con otro servicio, otro estado o un rango de fechas más amplio.'
              : 'Cuando un cliente reserve uno de tus turnos, aparecerá acá con todo su historial.'
          }
        />
      ) : null}

      {(historial.data?.length ?? 0) > 0 ? (
        <ul className="lista-reservas">
          {(historial.data ?? []).map((entrada) => {
            const veredicto = evaluarCancelacion(entrada, sesion?.rol);
            const ocupado = cancelacion.isPending && cancelacion.variables === entrada.idReserva;
            return (
              <li key={entrada.idReserva}>
                <article className="tarjeta tarjeta--reserva">
                  <h3 className="tarjeta__titulo">{entrada.nombreServicio}</h3>
                  <p className="tarjeta__descripcion">
                    {fechaLarga(entrada.fechaHoraInicio)} · {soloHora(entrada.fechaHoraInicio)} a{' '}
                    {soloHora(entrada.fechaHoraFin)}
                  </p>
                  <ul className="atributos">
                    <li>
                      <span className="atributos__clave">Estado</span>
                      <span className="atributos__valor">
                        <span className={`insignia insignia--${entrada.estado.toLowerCase()}`}>
                          {entrada.estado}
                        </span>
                      </span>
                    </li>
                    <li>
                      <span className="atributos__clave">Reserva</span>
                      <span className="atributos__valor">#{entrada.idReserva}</span>
                    </li>
                    <li>
                      <span className="atributos__clave">Cliente</span>
                      <span className="atributos__valor">#{entrada.idCliente}</span>
                    </li>
                  </ul>

                  <details className="plegable">
                    <summary className="plegable__resumen">
                      {entrada.cambios.length === 1
                        ? 'Ver el cambio de esta reserva'
                        : `Ver los ${entrada.cambios.length} cambios de esta reserva`}
                    </summary>
                    <div className="plegable__cuerpo">
                      <LineaTiempoReserva cambios={entrada.cambios} />
                    </div>
                  </details>

                  <div className="tarjeta__acciones">
                    <Link className="enlace-discreto" to={`/servicios/${entrada.idServicio}`}>
                      Ver la ficha de {entrada.nombreServicio}
                    </Link>
                    {veredicto.permitida ? (
                      <button
                        type="button"
                        className="boton boton--peligro"
                        disabled={ocupado}
                        onClick={() => setPorCancelar(entrada)}
                      >
                        {ocupado ? 'Cancelando…' : 'Cancelar reserva'}
                      </button>
                    ) : entrada.estado === 'CONFIRMADA' ? (
                      <p className="tarjeta__nota">{veredicto.motivo}</p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}

      {porCancelar ? (
        <Dialogo
          titulo="Cancelar la reserva del cliente"
          descripcion={`La reserva #${porCancelar.idReserva} de ${porCancelar.nombreServicio} del ${fechaLarga(porCancelar.fechaHoraInicio)} a las ${soloHora(porCancelar.fechaHoraInicio)} quedará cancelada. Su cupo y sus recursos se liberan y el cambio queda registrado a tu nombre en el historial.`}
          textoConfirmar="Sí, cancelar la reserva"
          textoCancelar="No, conservarla"
          ocupado={cancelacion.isPending}
          onConfirmar={confirmar}
          onCancelar={() => setPorCancelar(null)}
        />
      ) : null}
    </section>
  );
}
