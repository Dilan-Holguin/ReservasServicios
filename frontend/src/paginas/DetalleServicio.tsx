import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { recursosEnConflicto, sugerenciasDeError } from '../api/cliente';
import type { SugerenciaTurno, TurnoDisponible } from '../api/tipos';
import { Anuncio, CajaError, Cargando, Vacio } from '../componentes/Estados';
import { GrillaTurnos, type FilaDeDia } from '../componentes/GrillaTurnos';
import { useDisponibilidad, useTurnosDesaparecidos } from '../consultas/useDisponibilidad';
import { useParametrosUrl } from '../consultas/useParametrosUrl';
import { useCrearReserva } from '../consultas/useReservas';
import { useServicio } from '../consultas/useServicios';
import { useSesion } from '../sesion/useSesion';
import {
  diaDeTurno,
  duracionLegible,
  fechaLarga,
  hoyISO,
  rangoProximosDias,
  soloHora,
} from '../utiles/fechas';

interface EstadoNavegacion {
  turnoPendiente?: string;
}

export function DetalleServicio() {
  const { id } = useParams<{ id: string }>();
  const idServicio = Number(id);
  const { token, sesion } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { leer, fijar } = useParametrosUrl();

  // El rango vive en la URL: el botón «atrás» deshace un cambio de fechas y el
  // enlace copiado abre exactamente la misma semana de agenda.
  const porDefecto = useMemo(() => rangoProximosDias(7), []);
  const desde = leer('desde', porDefecto.desde);
  const hasta = leer('hasta', porDefecto.hasta);
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const servicio = useServicio(idServicio);
  const disponibilidad = useDisponibilidad(idServicio, desde, hasta, { activo: !rangoInvalido });
  const avisoTurnos = useTurnosDesaparecidos(disponibilidad.data);
  const reserva = useCrearReserva(idServicio);

  const turnoPendiente = (ubicacion.state as EstadoNavegacion | null)?.turnoPendiente ?? null;
  const pendienteProcesado = useRef(false);

  useEffect(() => {
    if (servicio.data) document.title = `${servicio.data.nombre} — ReservaYa`;
  }, [servicio.data]);

  const zona = disponibilidad.data?.zonaHoraria ?? servicio.data?.zonaHoraria;

  /* ---------------------------------------------------------------- reservar */

  const reservar = useCallback(
    (fechaHoraInicio: string) => {
      if (!token || !sesion) {
        // Sin sesión: se envía a ingresar y se vuelve exactamente a este turno.
        navegar('/ingresar', {
          state: {
            destino: `/servicios/${idServicio}?desde=${desde}&hasta=${hasta}`,
            turnoPendiente: fechaHoraInicio,
            aviso: 'Ingresa para confirmar la reserva del turno seleccionado.',
          },
        });
        return;
      }
      if (sesion.rol !== 'CLIENTE') {
        reserva.reset();
        return;
      }
      reserva.mutate(fechaHoraInicio);
    },
    [token, sesion, navegar, idServicio, desde, hasta, reserva],
  );

  // Turno guardado antes de ingresar: se confirma al volver con sesión activa.
  useEffect(() => {
    if (!turnoPendiente || pendienteProcesado.current || !token) return;
    pendienteProcesado.current = true;
    navegar(`${ubicacion.pathname}${ubicacion.search}`, { replace: true, state: null });
    reservar(turnoPendiente);
  }, [turnoPendiente, token, reservar, navegar, ubicacion.pathname, ubicacion.search]);

  /* ---------------------------------------------------------------- agrupado */

  const filas: FilaDeDia[] = useMemo(() => {
    if (!disponibilidad.data) return [];
    const mapa = new Map<string, TurnoDisponible[]>();
    for (const turno of disponibilidad.data.turnos) {
      const clave = diaDeTurno(turno.fechaHoraInicio, disponibilidad.data.zonaHoraria);
      const lista = mapa.get(clave);
      if (lista) lista.push(turno);
      else mapa.set(clave, [turno]);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, turnos]) => ({ dia, turnos }));
  }, [disponibilidad.data]);

  const sugerencias: SugerenciaTurno[] = sugerenciasDeError(reserva.error);
  const conflictos = recursosEnConflicto(reserva.error);
  const esCliente = !sesion || sesion.rol === 'CLIENTE';

  const exito = reserva.data
    ? `Reserva confirmada para el ${fechaLarga(reserva.data.fechaHoraInicio, zona)} a las ${soloHora(reserva.data.fechaHoraInicio, zona)}.`
    : null;

  if (!Number.isFinite(idServicio)) {
    return (
      <div className="pagina">
        <Vacio
          titulo="Servicio no válido"
          detalle="La dirección no corresponde a un servicio del catálogo."
          accion={
            <Link className="boton boton--principal" to="/">
              Volver al catálogo
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pagina">
      <p className="migas">
        <Link to="/">Catálogo</Link> <span aria-hidden="true">›</span>{' '}
        {servicio.data ? servicio.data.nombre : 'Servicio'}
      </p>

      {servicio.isPending ? <Cargando mensaje="Cargando el servicio…" /> : null}

      {servicio.isError ? (
        <CajaError
          error={servicio.error}
          titulo="No se pudo cargar el servicio"
          onReintentar={() => void servicio.refetch()}
        />
      ) : null}

      {servicio.data ? (
        <>
          <section className="ficha" aria-labelledby="titulo-servicio">
            <p className="tarjeta__proveedor">{servicio.data.nombreProveedor}</p>
            <h1 id="titulo-servicio">{servicio.data.nombre}</h1>
            {servicio.data.descripcion ? (
              <p className="ficha__descripcion">{servicio.data.descripcion}</p>
            ) : null}
            <ul className="atributos atributos--fila">
              <li>
                <span className="atributos__clave">Duración</span>
                <span className="atributos__valor">
                  {duracionLegible(servicio.data.duracionMinutos)}
                </span>
              </li>
              <li>
                <span className="atributos__clave">Cupos por turno</span>
                <span className="atributos__valor">{servicio.data.capacidad}</span>
              </li>
              <li>
                <span className="atributos__clave">Zona horaria</span>
                <span className="atributos__valor">{servicio.data.zonaHoraria}</span>
              </li>
              <li>
                <span className="atributos__clave">Estado</span>
                <span className="atributos__valor">
                  <span className={`insignia insignia--${servicio.data.estado.toLowerCase()}`}>
                    {servicio.data.estado}
                  </span>
                </span>
              </li>
            </ul>
          </section>

          {servicio.data.estado === 'INACTIVO' ? (
            <p className="estado estado--aviso" role="status">
              Este servicio está inactivo: no acepta reservas nuevas. Las reservas ya confirmadas se
              mantienen.
            </p>
          ) : null}

          <section aria-labelledby="titulo-disponibilidad">
            <h2 id="titulo-disponibilidad">Disponibilidad</h2>
            <p className="texto-apoyo">
              Los horarios se muestran en la zona del proveedor ({servicio.data.zonaHoraria}). El
              rango máximo de consulta es de 31 días. La lista se actualiza sola cada medio minuto
              mientras esta pestaña está a la vista.
            </p>

            <div className="rango">
              <div className="campo campo--compacto">
                <label className="campo__etiqueta" htmlFor="rango-desde">
                  Desde
                </label>
                <input
                  id="rango-desde"
                  className="campo__control"
                  type="date"
                  value={desde}
                  min={hoyISO()}
                  onChange={(evento) => fijar({ desde: evento.target.value })}
                />
              </div>
              <div className="campo campo--compacto">
                <label className="campo__etiqueta" htmlFor="rango-hasta">
                  Hasta
                </label>
                <input
                  id="rango-hasta"
                  className="campo__control"
                  type="date"
                  value={hasta}
                  min={desde || hoyISO()}
                  onChange={(evento) => fijar({ hasta: evento.target.value })}
                />
              </div>
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => void disponibilidad.refetch()}
                disabled={disponibilidad.isFetching}
              >
                {disponibilidad.isFetching ? 'Actualizando…' : 'Actualizar ahora'}
              </button>
            </div>

            {rangoInvalido ? (
              <p className="estado estado--error" role="alert">
                La fecha inicial no puede ser posterior a la final.
              </p>
            ) : null}

            <Anuncio mensaje={exito} tono="exito" />
            {exito ? (
              <p className="texto-apoyo">
                <Link to="/panel/cliente">Ver mis reservas</Link>
              </p>
            ) : null}

            {/* El sondeo puede quitar un turno de la pantalla sin que nadie lo toque: se
                anuncia para que el cambio no sea invisible, y menos para un lector de pantalla. */}
            <Anuncio mensaje={avisoTurnos} />

            {!esCliente ? (
              <p className="estado estado--aviso" role="status">
                Tu cuenta es de proveedor: solo las cuentas de cliente pueden reservar turnos.
              </p>
            ) : null}

            {reserva.isError ? (
              <CajaError error={reserva.error} titulo="No se pudo crear la reserva">
                {conflictos.length > 0 ? (
                  <p className="estado__detalle">
                    Recursos ocupados: {conflictos.map((recurso) => recurso.nombre).join(', ')}.
                  </p>
                ) : null}
                {sugerencias.length > 0 ? (
                  <div className="sugerencias">
                    <p className="sugerencias__titulo" id="titulo-sugerencias">
                      Turnos alternativos sugeridos
                    </p>
                    <ul className="sugerencias__lista" aria-labelledby="titulo-sugerencias">
                      {sugerencias.map((sugerencia) => (
                        <li key={sugerencia.fechaHoraInicio}>
                          <button
                            type="button"
                            className="boton boton--sugerencia"
                            disabled={reserva.isPending}
                            onClick={() => reservar(sugerencia.fechaHoraInicio)}
                          >
                            Reservar el {fechaLarga(sugerencia.fechaHoraInicio, zona)} a las{' '}
                            {soloHora(sugerencia.fechaHoraInicio, zona)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CajaError>
            ) : null}

            {disponibilidad.isPending ? <Cargando mensaje="Consultando turnos…" /> : null}

            {disponibilidad.isError ? (
              <CajaError
                error={disponibilidad.error}
                titulo="No se pudo consultar la disponibilidad"
                onReintentar={() => void disponibilidad.refetch()}
              />
            ) : null}

            {disponibilidad.isSuccess && filas.length === 0 ? (
              <Vacio
                titulo="No hay turnos disponibles en este rango"
                detalle="Prueba con otras fechas: la agenda del proveedor puede no cubrir los días elegidos o los cupos ya están tomados."
              />
            ) : null}

            {filas.length > 0 ? (
              <GrillaTurnos
                filas={filas}
                zonaHoraria={zona}
                enVuelo={reserva.isPending ? (reserva.variables ?? null) : null}
                idEtiqueta="titulo-disponibilidad"
                onElegir={reservar}
              />
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
