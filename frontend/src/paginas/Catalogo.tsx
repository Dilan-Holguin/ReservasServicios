import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CajaError, Cargando, Vacio } from '../componentes/Estados';
import { useCategorias } from '../consultas/useCatalogos';
import { useParametrosUrl } from '../consultas/useParametrosUrl';
import { useCatalogo } from '../consultas/useServicios';
import { duracionLegible } from '../utiles/fechas';

export function Catalogo() {
  const { leer, leerNumero, fijar } = useParametrosUrl();
  const idCategoria = leer('categoria');

  // El filtro vive en la URL: compartir el enlace comparte la categoría elegida.
  const filtros = useMemo(() => {
    const id = leerNumero('categoria');
    return id === undefined ? {} : { idCategoria: id };
  }, [leerNumero]);

  const servicios = useCatalogo(filtros);
  const categorias = useCategorias();

  useEffect(() => {
    document.title = 'Catálogo de servicios — ReservaYa';
  }, []);

  const nombreCategoria = (id: number) =>
    (categorias.data ?? []).find((categoria) => categoria.id === id)?.nombre ?? 'Sin categoría';

  const lista = servicios.data ?? [];

  return (
    <div className="pagina">
      <section className="portada">
        <h1>Reserva tu turno en minutos</h1>
        <p className="portada__texto">
          Explora los servicios publicados por nuestros proveedores, consulta la disponibilidad real
          de cada agenda y confirma tu reserva.
        </p>
      </section>

      <section aria-labelledby="titulo-catalogo">
        <div className="barra-filtros">
          <h2 id="titulo-catalogo">Servicios disponibles</h2>
          <div className="campo campo--compacto">
            <label className="campo__etiqueta" htmlFor="filtro-categoria">
              Filtrar por categoría
            </label>
            <select
              id="filtro-categoria"
              className="campo__control"
              value={idCategoria}
              onChange={(evento) => fijar({ categoria: evento.target.value || null })}
            >
              <option value="">Todas las categorías</option>
              {(categorias.data ?? []).map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {servicios.isPending ? <Cargando mensaje="Cargando servicios…" /> : null}

        {servicios.isError ? (
          <CajaError
            error={servicios.error}
            titulo="No se pudo cargar el catálogo"
            onReintentar={() => void servicios.refetch()}
          />
        ) : null}

        {servicios.isSuccess && lista.length === 0 ? (
          <Vacio
            titulo="Todavía no hay servicios para mostrar"
            detalle={
              idCategoria
                ? 'Ningún servicio activo pertenece a esa categoría. Prueba con otra o quita el filtro.'
                : 'Cuando un proveedor publique su primer servicio aparecerá aquí.'
            }
            accion={
              idCategoria ? (
                <button
                  type="button"
                  className="boton boton--secundario"
                  onClick={() => fijar({ categoria: null })}
                >
                  Ver todas las categorías
                </button>
              ) : (
                <Link className="boton boton--secundario" to="/registro">
                  Registrar mi negocio
                </Link>
              )
            }
          />
        ) : null}

        {lista.length > 0 ? (
          <ul className="rejilla" aria-label="Listado de servicios">
            {lista.map((servicio) => (
              <li key={servicio.id}>
                <article className="tarjeta">
                  <p className="tarjeta__proveedor">{servicio.nombreProveedor}</p>
                  <h3 className="tarjeta__titulo">
                    <Link to={`/servicios/${servicio.id}`}>{servicio.nombre}</Link>
                  </h3>
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
                  </ul>
                  <Link className="boton boton--principal" to={`/servicios/${servicio.id}`}>
                    Ver disponibilidad de {servicio.nombre}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
