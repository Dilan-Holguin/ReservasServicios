import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { EstadoServicio, Servicio } from '../api/tipos';
import { Campo, Selector } from '../componentes/Campo';
import { Dialogo } from '../componentes/Dialogo';
import { Anuncio, CajaError, Cargando, Vacio } from '../componentes/Estados';
import { LineaTiempoServicio } from '../componentes/LineaTiempo';
import { SeccionAgenda } from '../componentes/proveedor/SeccionAgenda';
import { SeccionRecursos } from '../componentes/proveedor/SeccionRecursos';
import { useCategorias } from '../consultas/useCatalogos';
import { useMisServicios } from '../consultas/useMisServicios';
import { useParametrosUrl } from '../consultas/useParametrosUrl';
import {
  useCambiarEstadoServicio,
  useCrearServicio,
  useHistorialServicios,
} from '../consultas/useServicios';
import { useSesion } from '../sesion/useSesion';
import { HistorialDeReservas } from './proveedor/HistorialDeReservas';
import { duracionLegible } from '../utiles/fechas';

type Seccion = 'servicios' | 'agenda' | 'recursos' | 'reservas' | 'cambios';

const SECCIONES: ReadonlyArray<{ id: Seccion; texto: string }> = [
  { id: 'servicios', texto: 'Mis servicios' },
  { id: 'agenda', texto: 'Agenda' },
  { id: 'recursos', texto: 'Recursos' },
  { id: 'reservas', texto: 'Reservas' },
  { id: 'cambios', texto: 'Cambios' },
];

const SECCIONES_VALIDAS = new Set<string>(SECCIONES.map((seccion) => seccion.id));

/** Interruptor de estado de un servicio (HU-11). */
function BotonEstado({
  servicio,
  onPedirCambio,
  ocupado,
}: {
  servicio: Servicio;
  onPedirCambio: (servicio: Servicio, estado: EstadoServicio) => void;
  ocupado: boolean;
}) {
  const inactivar = servicio.estado === 'ACTIVO';
  return (
    <button
      type="button"
      className={`boton ${inactivar ? 'boton--peligro' : 'boton--principal'}`}
      disabled={ocupado}
      onClick={() => onPedirCambio(servicio, inactivar ? 'INACTIVO' : 'ACTIVO')}
    >
      {ocupado ? 'Guardando…' : inactivar ? 'Inactivar servicio' : 'Activar servicio'}
    </button>
  );
}

export function PanelProveedor() {
  const { token, sesion } = useSesion();
  const { leer, fijar } = useParametrosUrl();

  const seccionCruda = leer('seccion', 'servicios');
  const seccion: Seccion = (SECCIONES_VALIDAS.has(seccionCruda) ? seccionCruda : 'servicios') as Seccion;

  const mios = useMisServicios();
  const categorias = useCategorias();
  const creacion = useCrearServicio();
  const cambioEstado = useCambiarEstadoServicio();

  const [porCambiar, setPorCambiar] = useState<{ servicio: Servicio; estado: EstadoServicio } | null>(
    null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState('30');
  const [capacidad, setCapacidad] = useState('1');

  useEffect(() => {
    document.title = 'Mi negocio — ReservaYa';
  }, []);

  function crear(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);
    creacion.mutate(
      {
        nombre: nombre.trim(),
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        idCategoria: Number(idCategoria),
        duracionMinutos: Number(duracionMinutos),
        capacidad: Number(capacidad),
      },
      {
        onSuccess: (servicio) => {
          setAviso(`Servicio "${servicio.nombre}" creado.`);
          setNombre('');
          setDescripcion('');
          setIdCategoria('');
        },
      },
    );
  }

  function confirmarCambioEstado() {
    if (!porCambiar) return;
    const { servicio, estado } = porCambiar;
    cambioEstado.mutate(
      { idServicio: servicio.id, estado },
      {
        onSuccess: () => {
          setAviso(
            estado === 'INACTIVO'
              ? `"${servicio.nombre}" quedó inactivo: no acepta reservas nuevas. Las reservas ya confirmadas se mantienen.`
              : `"${servicio.nombre}" volvió a estar activo y aparece de nuevo en el catálogo.`,
          );
        },
      },
    );
    setPorCambiar(null);
  }

  const nombreCategoria = (id: number) =>
    (categorias.data ?? []).find((categoria) => categoria.id === id)?.nombre ?? 'Sin categoría';

  return (
    <div className="pagina">
      <header className="encabezado-panel">
        <div>
          <h1>Mi negocio</h1>
          <p className="texto-apoyo">Sesión de {sesion?.email}.</p>
        </div>
        <Link className="boton boton--secundario" to="/">
          Ver el catálogo público
        </Link>
      </header>

      {/* Las secciones son enlaces de verdad, no pestañas simuladas: la sección vive en
          la dirección de la página, así que el botón «atrás» funciona y el enlace se
          puede compartir. Un `<Link>` con `aria-current` es más honesto —y más
          accesible— que un `<button>` disfrazado de pestaña. */}
      <nav className="pestanas" aria-label="Secciones del panel">
        <ul className="pestanas__lista">
          {SECCIONES.map((opcion) => (
            <li key={opcion.id}>
              <NavLink
                to={`/panel/proveedor?seccion=${opcion.id}`}
                className={`pestana${seccion === opcion.id ? ' pestana--activa' : ''}`}
                aria-current={seccion === opcion.id ? 'page' : undefined}
              >
                {opcion.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Anuncio mensaje={aviso} tono="exito" />

      {cambioEstado.isError ? (
        <CajaError error={cambioEstado.error} titulo="No se pudo cambiar el estado del servicio" />
      ) : null}

      {mios.isPending ? <Cargando mensaje="Cargando tu negocio…" /> : null}

      {mios.isError ? (
        <CajaError
          error={mios.error}
          titulo="No se pudo cargar tu información"
          onReintentar={mios.refetch}
        />
      ) : null}

      {!mios.isPending && !mios.isError && seccion === 'servicios' ? (
        <section aria-labelledby="titulo-servicios">
          <h2 id="titulo-servicios">Mis servicios</h2>

          {creacion.isError ? (
            <CajaError error={creacion.error} titulo="No se pudo crear el servicio" />
          ) : null}

          <form className="formulario" onSubmit={crear} noValidate>
            <fieldset className="grupo">
              <legend className="grupo__titulo">Publicar un servicio</legend>
              <Campo
                etiqueta="Nombre del servicio"
                required
                maxLength={100}
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
              />
              <Campo
                etiqueta="Descripción (opcional)"
                maxLength={1000}
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
              />
              <Selector
                etiqueta="Categoría"
                required
                value={idCategoria}
                onChange={(evento) => setIdCategoria(evento.target.value)}
              >
                <option value="">Selecciona una categoría</option>
                {(categorias.data ?? []).map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </Selector>
              <div className="fila-horas">
                <Campo
                  etiqueta="Duración (minutos)"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  required
                  value={duracionMinutos}
                  onChange={(evento) => setDuracionMinutos(evento.target.value)}
                />
                <Campo
                  etiqueta="Cupos por turno"
                  type="number"
                  min={1}
                  required
                  value={capacidad}
                  onChange={(evento) => setCapacidad(evento.target.value)}
                />
              </div>
              <button
                type="submit"
                className="boton boton--principal"
                disabled={creacion.isPending || nombre.trim() === '' || idCategoria === ''}
              >
                {creacion.isPending ? 'Creando…' : 'Crear servicio'}
              </button>
            </fieldset>
          </form>

          <h3 className="subtitulo">Servicios publicados</h3>

          {mios.servicios.length === 0 ? (
            <Vacio
              titulo="Aún no tienes servicios publicados"
              detalle="Crea tu primer servicio con el formulario de arriba para poder definir su agenda."
            />
          ) : (
            <ul className="rejilla">
              {mios.servicios.map((servicio) => (
                <li key={servicio.id}>
                  <article className="tarjeta">
                    <h4 className="tarjeta__titulo">{servicio.nombre}</h4>
                    {servicio.descripcion ? (
                      <p className="tarjeta__descripcion">{servicio.descripcion}</p>
                    ) : null}
                    <ul className="atributos">
                      <li>
                        <span className="atributos__clave">Categoría</span>
                        <span className="atributos__valor">
                          {nombreCategoria(servicio.idCategoria)}
                        </span>
                      </li>
                      <li>
                        <span className="atributos__clave">Duración</span>
                        <span className="atributos__valor">
                          {duracionLegible(servicio.duracionMinutos)}
                        </span>
                      </li>
                      <li>
                        <span className="atributos__clave">Cupos por turno</span>
                        <span className="atributos__valor">{servicio.capacidad}</span>
                      </li>
                      <li>
                        <span className="atributos__clave">Estado</span>
                        <span className="atributos__valor">
                          <span className={`insignia insignia--${servicio.estado.toLowerCase()}`}>
                            {servicio.estado}
                          </span>
                        </span>
                      </li>
                    </ul>

                    {servicio.estado === 'INACTIVO' ? (
                      <p className="tarjeta__nota">
                        No aparece en el catálogo público ni acepta reservas nuevas.
                      </p>
                    ) : null}

                    <div className="tarjeta__acciones">
                      <Link className="enlace-discreto" to={`/servicios/${servicio.id}`}>
                        Ver la ficha pública de {servicio.nombre}
                      </Link>
                      <BotonEstado
                        servicio={servicio}
                        onPedirCambio={(s, estado) => setPorCambiar({ servicio: s, estado })}
                        ocupado={
                          cambioEstado.isPending &&
                          cambioEstado.variables?.idServicio === servicio.id
                        }
                      />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!mios.isPending && !mios.isError && seccion === 'agenda' && token ? (
        <section aria-labelledby="titulo-agenda">
          <h2 id="titulo-agenda">Agenda</h2>
          <SeccionAgenda token={token} servicios={mios.servicios} />
        </section>
      ) : null}

      {!mios.isPending && !mios.isError && seccion === 'recursos' && token ? (
        <section aria-labelledby="titulo-recursos">
          <h2 id="titulo-recursos">Recursos</h2>
          <SeccionRecursos token={token} servicios={mios.servicios} />
        </section>
      ) : null}

      {!mios.isPending && !mios.isError && seccion === 'reservas' ? (
        <HistorialDeReservas servicios={mios.servicios} leer={leer} fijar={fijar} />
      ) : null}

      {!mios.isPending && !mios.isError && seccion === 'cambios' ? (
        <SeccionCambios servicios={mios.servicios} leer={leer} fijar={fijar} />
      ) : null}

      {porCambiar ? (
        <Dialogo
          titulo={
            porCambiar.estado === 'INACTIVO' ? 'Inactivar el servicio' : 'Activar el servicio'
          }
          descripcion={
            porCambiar.estado === 'INACTIVO'
              ? `"${porCambiar.servicio.nombre}" dejará de aparecer en el catálogo y no aceptará reservas nuevas. Las reservas ya confirmadas se mantienen y el cambio queda registrado en el historial.`
              : `"${porCambiar.servicio.nombre}" volverá a aparecer en el catálogo y aceptará reservas nuevas.`
          }
          textoConfirmar={
            porCambiar.estado === 'INACTIVO' ? 'Sí, inactivarlo' : 'Sí, activarlo'
          }
          textoCancelar="No, dejarlo como está"
          ocupado={cambioEstado.isPending}
          onConfirmar={confirmarCambioEstado}
          onCancelar={() => setPorCambiar(null)}
        />
      ) : null}
    </div>
  );
}

/** Historial de cambios en la oferta de los servicios del proveedor (HU-11). */
function SeccionCambios({
  servicios,
  leer,
  fijar,
}: {
  servicios: Servicio[];
  leer: (clave: string, porDefecto?: string) => string;
  fijar: (cambios: Record<string, string | null>) => void;
}) {
  const crudo = leer('servicio');
  const idServicio = crudo ? Number(crudo) : undefined;
  const historial = useHistorialServicios(
    Number.isFinite(idServicio) ? idServicio : undefined,
  );

  return (
    <section aria-labelledby="titulo-cambios">
      <h2 id="titulo-cambios">Cambios en mis servicios</h2>
      <p className="texto-apoyo">
        Creación, bloques de agenda, recursos y cambios de estado, con el valor anterior, el nuevo,
        quién lo hizo y cuándo.
      </p>

      <div className="campo campo--compacto">
        <label className="campo__etiqueta" htmlFor="cambios-servicio">
          Servicio
        </label>
        <select
          id="cambios-servicio"
          className="campo__control"
          value={crudo}
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

      {historial.isPending ? <Cargando mensaje="Cargando los cambios…" /> : null}

      {historial.isError ? (
        <CajaError
          error={historial.error}
          titulo="No se pudo cargar el historial de cambios"
          onReintentar={() => void historial.refetch()}
        />
      ) : null}

      {historial.isSuccess && (historial.data?.length ?? 0) === 0 ? (
        <Vacio
          titulo="Sin cambios registrados"
          detalle="En cuanto publiques un servicio o ajustes su agenda, el cambio aparece acá."
        />
      ) : null}

      {(historial.data?.length ?? 0) > 0 ? (
        <LineaTiempoServicio cambios={historial.data ?? []} mostrarServicio={!idServicio} />
      ) : null}
    </section>
  );
}
