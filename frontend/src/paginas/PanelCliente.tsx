import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EstadoReserva, FiltroHistorialReservas, HistorialReserva } from '../api/tipos';
import { Dialogo } from '../componentes/Dialogo';
import { Anuncio, CajaError, Cargando, Vacio } from '../componentes/Estados';
import { LineaTiempoReserva } from '../componentes/LineaTiempo';
import { useParametrosUrl } from '../consultas/useParametrosUrl';
import { useCancelarReserva, useHistorialReservas } from '../consultas/useReservas';
import { useSesion } from '../sesion/useSesion';
import { DIAS_ANTICIPACION_CLIENTE, diasHasta, evaluarCancelacion } from '../utiles/cancelacion';
import { esFuturo, fechaLarga, soloHora } from '../utiles/fechas';

const ESTADOS: EstadoReserva[] = ['CONFIRMADA', 'CANCELADA', 'COMPLETADA'];

function TarjetaReserva({
  entrada,
  onCancelar,
  cancelando,
}: {
  entrada: HistorialReserva;
  onCancelar: (entrada: HistorialReserva) => void;
  cancelando: boolean;
}) {
  const { sesion } = useSesion();
  const veredicto = evaluarCancelacion(entrada, sesion?.rol);
  const dias = diasHasta(entrada.fechaHoraInicio);

  return (
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
        {entrada.estado === 'CONFIRMADA' && dias >= 0 ? (
          <li>
            <span className="atributos__clave">Faltan</span>
            <span className="atributos__valor">{dias === 0 ? 'menos de un día' : `${dias} días`}</span>
          </li>
        ) : null}
      </ul>

      {/* `<details>` en lugar de un acordeón a mano: el navegador ya lo hace accesible
          —operable con teclado y anunciado como plegable— sin una línea de JavaScript. */}
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
          Ver el servicio {entrada.nombreServicio}
        </Link>

        {veredicto.permitida ? (
          <button
            type="button"
            className="boton boton--peligro"
            disabled={cancelando}
            onClick={() => onCancelar(entrada)}
          >
            {cancelando ? 'Cancelando…' : 'Cancelar reserva'}
          </button>
        ) : entrada.estado === 'CONFIRMADA' ? (
          // Un botón que se puede pulsar y después falla enseña menos que un motivo
          // escrito. El plazo se explica antes del intento, no después del error.
          <p className="tarjeta__nota">{veredicto.motivo}</p>
        ) : null}
      </div>
    </article>
  );
}

export function PanelCliente() {
  const { sesion } = useSesion();
  const { leer, leerNumero, fijar } = useParametrosUrl();
  const [porCancelar, setPorCancelar] = useState<HistorialReserva | null>(null);
  const [anuncio, setAnuncio] = useState<string | null>(null);

  const estadoFiltro = leer('estado') as EstadoReserva | '';
  const filtros: FiltroHistorialReservas = useMemo(
    () => ({
      ...(estadoFiltro ? { estado: estadoFiltro } : {}),
      ...(leerNumero('idServicio') !== undefined ? { idServicio: leerNumero('idServicio') } : {}),
      ...(leer('desde') ? { desde: leer('desde') } : {}),
      ...(leer('hasta') ? { hasta: leer('hasta') } : {}),
    }),
    [estadoFiltro, leer, leerNumero],
  );

  const historial = useHistorialReservas(filtros);
  const cancelacion = useCancelarReserva();

  useEffect(() => {
    document.title = 'Mis reservas — ReservaYa';
  }, []);

  const { proximas, pasadas } = useMemo(() => {
    const datos = historial.data ?? [];
    const ordenadas = [...datos].sort((a, b) =>
      a.fechaHoraInicio.localeCompare(b.fechaHoraInicio),
    );
    return {
      proximas: ordenadas.filter((entrada) => esFuturo(entrada.fechaHoraInicio)),
      pasadas: ordenadas.filter((entrada) => !esFuturo(entrada.fechaHoraInicio)).reverse(),
    };
  }, [historial.data]);

  const hayFiltros = Object.keys(filtros).length > 0;

  function confirmarCancelacion() {
    if (!porCancelar) return;
    const entrada = porCancelar;
    cancelacion.mutate(entrada.idReserva, {
      onSuccess: () => {
        setAnuncio(
          `La reserva #${entrada.idReserva} de ${entrada.nombreServicio} quedó cancelada. Su cupo y sus recursos volvieron a estar disponibles.`,
        );
      },
    });
    setPorCancelar(null);
  }

  return (
    <div className="pagina">
      <header className="encabezado-panel">
        <div>
          <h1>Mis reservas</h1>
          <p className="texto-apoyo">Sesión de {sesion?.email}.</p>
        </div>
        <Link className="boton boton--principal" to="/">
          Explorar el catálogo
        </Link>
      </header>

      <section className="filtros" aria-labelledby="titulo-filtros">
        <h2 className="filtros__titulo" id="titulo-filtros">
          Filtrar el historial
        </h2>
        <div className="filtros__campos">
          <div className="campo campo--compacto">
            <label className="campo__etiqueta" htmlFor="filtro-estado">
              Estado
            </label>
            <select
              id="filtro-estado"
              className="campo__control"
              value={estadoFiltro}
              onChange={(evento) => fijar({ estado: evento.target.value || null })}
            >
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div className="campo campo--compacto">
            <label className="campo__etiqueta" htmlFor="filtro-desde">
              Desde
            </label>
            <input
              id="filtro-desde"
              className="campo__control"
              type="date"
              value={leer('desde')}
              onChange={(evento) => fijar({ desde: evento.target.value || null })}
            />
          </div>
          <div className="campo campo--compacto">
            <label className="campo__etiqueta" htmlFor="filtro-hasta">
              Hasta
            </label>
            <input
              id="filtro-hasta"
              className="campo__control"
              type="date"
              value={leer('hasta')}
              onChange={(evento) => fijar({ hasta: evento.target.value || null })}
            />
          </div>
          {hayFiltros ? (
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => fijar({ estado: null, desde: null, hasta: null, idServicio: null })}
            >
              Quitar filtros
            </button>
          ) : null}
        </div>
        <p className="texto-apoyo">
          Los filtros quedan en la dirección de la página: el botón «atrás» deshace el último y el
          enlace copiado reproduce esta misma vista.
        </p>
      </section>

      <Anuncio mensaje={anuncio} tono="exito" />

      {cancelacion.isError ? (
        <CajaError error={cancelacion.error} titulo="No se pudo cancelar la reserva" />
      ) : null}

      {historial.isPending ? <Cargando mensaje="Cargando tu historial de reservas…" /> : null}

      {historial.isError ? (
        <CajaError
          error={historial.error}
          titulo="No se pudo cargar tu historial"
          onReintentar={() => void historial.refetch()}
        />
      ) : null}

      {historial.isSuccess && (historial.data?.length ?? 0) === 0 ? (
        <Vacio
          titulo={hayFiltros ? 'Ninguna reserva coincide con el filtro' : 'Todavía no tienes reservas'}
          detalle={
            hayFiltros
              ? 'Prueba con otro estado o con un rango de fechas más amplio.'
              : 'Busca un servicio en el catálogo, elige un turno libre y confírmalo.'
          }
          accion={
            hayFiltros ? (
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => fijar({ estado: null, desde: null, hasta: null, idServicio: null })}
              >
                Quitar filtros
              </button>
            ) : (
              <Link className="boton boton--principal" to="/">
                Ver servicios disponibles
              </Link>
            )
          }
        />
      ) : null}

      {proximas.length > 0 ? (
        <section aria-labelledby="titulo-proximas">
          <h2 id="titulo-proximas">Próximas</h2>
          <p className="texto-apoyo">
            Puedes cancelar con al menos {DIAS_ANTICIPACION_CLIENTE} días de anticipación.
          </p>
          <ul className="lista-reservas">
            {proximas.map((entrada) => (
              <li key={entrada.idReserva}>
                <TarjetaReserva
                  entrada={entrada}
                  onCancelar={setPorCancelar}
                  cancelando={cancelacion.isPending && cancelacion.variables === entrada.idReserva}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pasadas.length > 0 ? (
        <section aria-labelledby="titulo-pasadas">
          <h2 id="titulo-pasadas">Anteriores</h2>
          <ul className="lista-reservas">
            {pasadas.map((entrada) => (
              <li key={entrada.idReserva}>
                <TarjetaReserva
                  entrada={entrada}
                  onCancelar={setPorCancelar}
                  cancelando={cancelacion.isPending && cancelacion.variables === entrada.idReserva}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {porCancelar ? (
        <Dialogo
          titulo="Cancelar la reserva"
          descripcion={`La reserva #${porCancelar.idReserva} de ${porCancelar.nombreServicio} del ${fechaLarga(porCancelar.fechaHoraInicio)} a las ${soloHora(porCancelar.fechaHoraInicio)} quedará cancelada. Su cupo y sus recursos se liberan y el cambio queda registrado en el historial.`}
          textoConfirmar="Sí, cancelar la reserva"
          textoCancelar="No, conservarla"
          ocupado={cancelacion.isPending}
          onConfirmar={confirmarCancelacion}
          onCancelar={() => setPorCancelar(null)}
        />
      ) : null}
    </div>
  );
}
