import { peticion } from './cliente';
import type {
  CambioHorario,
  CambioServicio,
  DatosRegistro,
  Disponibilidad,
  ElementoCatalogo,
  EliminacionHorario,
  EstadoServicio,
  FiltroHistorialReservas,
  HistorialReserva,
  Horario,
  Mensaje,
  NuevoServicio,
  Recurso,
  RegistroResultado,
  Reserva,
  Servicio,
  Sesion,
} from './tipos';

interface Aborto {
  signal?: AbortSignal;
}

/* ------------------------------------------------------------------ catálogos */

export function listarCategorias(o: Aborto = {}): Promise<ElementoCatalogo[]> {
  return peticion<ElementoCatalogo[]>('/catalogos/categorias', o);
}

export function listarTiposRecurso(o: Aborto = {}): Promise<ElementoCatalogo[]> {
  return peticion<ElementoCatalogo[]>('/catalogos/tipos-recurso', o);
}

/* ------------------------------------------------------------------------ auth */

export function iniciarSesion(email: string, password: string): Promise<Sesion> {
  return peticion<Sesion>('/auth/login', {
    metodo: 'POST',
    cuerpo: { email, password },
  });
}

export function registrar(datos: DatosRegistro): Promise<RegistroResultado> {
  return peticion<RegistroResultado>('/auth/registro', { metodo: 'POST', cuerpo: datos });
}

export function verificarCuenta(token: string, o: Aborto = {}): Promise<Mensaje> {
  return peticion<Mensaje>(`/auth/verificacion?token=${encodeURIComponent(token)}`, o);
}

export function reenviarVerificacion(email: string): Promise<Mensaje> {
  return peticion<Mensaje>('/auth/verificacion/reenvio', {
    metodo: 'POST',
    cuerpo: { email },
  });
}

/* -------------------------------------------------------------------- servicios */

export function listarServicios(
  filtros: { idProveedor?: number; idCategoria?: number } = {},
  o: Aborto = {},
): Promise<Servicio[]> {
  const parametros = new URLSearchParams();
  if (filtros.idProveedor !== undefined) {
    parametros.set('idProveedor', String(filtros.idProveedor));
  }
  if (filtros.idCategoria !== undefined) {
    parametros.set('idCategoria', String(filtros.idCategoria));
  }
  const consulta = parametros.toString();
  return peticion<Servicio[]>(`/servicios${consulta ? `?${consulta}` : ''}`, o);
}

export function consultarServicio(id: number, o: Aborto = {}): Promise<Servicio> {
  return peticion<Servicio>(`/servicios/${id}`, o);
}

export function crearServicio(token: string, datos: NuevoServicio): Promise<Servicio> {
  return peticion<Servicio>('/servicios', { metodo: 'POST', cuerpo: datos, token });
}

/* ----------------------------------------------------------------------- agenda */

export function listarHorarios(idServicio: number, o: Aborto = {}): Promise<Horario[]> {
  return peticion<Horario[]>(`/servicios/${idServicio}/horarios`, o);
}

export function crearHorarios(
  token: string,
  idServicio: number,
  datos: { diasSemana: number[]; horaInicio: string; horaFin: string },
): Promise<Horario[]> {
  return peticion<Horario[]>(`/servicios/${idServicio}/horarios`, {
    metodo: 'POST',
    cuerpo: datos,
    token,
  });
}

export function editarHorario(
  token: string,
  idHorario: number,
  datos: { diaSemana: number; horaInicio: string; horaFin: string },
  confirmar: boolean,
): Promise<CambioHorario> {
  return peticion<CambioHorario>(`/horarios/${idHorario}?confirmar=${confirmar}`, {
    metodo: 'PUT',
    cuerpo: datos,
    token,
  });
}

export function eliminarHorario(
  token: string,
  idHorario: number,
  confirmar: boolean,
): Promise<EliminacionHorario> {
  return peticion<EliminacionHorario>(`/horarios/${idHorario}?confirmar=${confirmar}`, {
    metodo: 'DELETE',
    token,
  });
}

/* --------------------------------------------------------------------- recursos */

export function listarRecursos(token: string, o: Aborto = {}): Promise<Recurso[]> {
  return peticion<Recurso[]>('/recursos', { ...o, token });
}

export function crearRecurso(
  token: string,
  datos: { nombre: string; idTipoRecurso: number },
): Promise<Recurso> {
  return peticion<Recurso>('/recursos', { metodo: 'POST', cuerpo: datos, token });
}

export function asignarRecursos(
  token: string,
  idServicio: number,
  idsRecursos: number[],
): Promise<Recurso[]> {
  return peticion<Recurso[]>(`/servicios/${idServicio}/recursos`, {
    metodo: 'PUT',
    cuerpo: { idsRecursos },
    token,
  });
}

/* --------------------------------------------------------------------- reservas */

export function consultarDisponibilidad(
  idServicio: number,
  desde: string,
  hasta: string,
  o: Aborto = {},
): Promise<Disponibilidad> {
  return peticion<Disponibilidad>(
    `/servicios/${idServicio}/disponibilidad?desde=${desde}&hasta=${hasta}`,
    o,
  );
}

export function crearReserva(
  token: string,
  idServicio: number,
  fechaHoraInicio: string,
): Promise<Reserva> {
  return peticion<Reserva>('/reservas', {
    metodo: 'POST',
    cuerpo: { idServicio, fechaHoraInicio },
    token,
  });
}

export function listarMisReservas(token: string, o: Aborto = {}): Promise<Reserva[]> {
  return peticion<Reserva[]>('/reservas/mias', { ...o, token });
}

export function listarReservasDeServicio(
  token: string,
  idServicio: number,
  o: Aborto = {},
): Promise<Reserva[]> {
  return peticion<Reserva[]>(`/servicios/${idServicio}/reservas`, { ...o, token });
}

/**
 * Cancela una reserva (HU-08 cliente, HU-15 proveedor; es el mismo endpoint).
 *
 * El backend decide si procede: el cliente necesita la anticipación mínima
 * (`CANCELACION_FUERA_DE_PLAZO`), el proveedor no. También rechaza una reserva ya
 * cancelada o completada (`RESERVA_NO_CANCELABLE`) y una que ya empezó
 * (`RESERVA_EN_EL_PASADO`).
 */
export function cancelarReserva(token: string, idReserva: number): Promise<Reserva> {
  return peticion<Reserva>(`/reservas/${idReserva}/cancelacion`, { metodo: 'POST', token });
}

/* ------------------------------------------------------------- historiales */

/** Historial de reservas: las propias para un CLIENTE, las de sus servicios para un PROVEEDOR. */
export function consultarHistorialReservas(
  token: string,
  filtros: FiltroHistorialReservas = {},
  o: Aborto = {},
): Promise<HistorialReserva[]> {
  const parametros = new URLSearchParams();
  if (filtros.idServicio !== undefined) parametros.set('idServicio', String(filtros.idServicio));
  if (filtros.estado) parametros.set('estado', filtros.estado);
  if (filtros.desde) parametros.set('desde', filtros.desde);
  if (filtros.hasta) parametros.set('hasta', filtros.hasta);
  const consulta = parametros.toString();
  return peticion<HistorialReserva[]>(
    `/reservas/historial${consulta ? `?${consulta}` : ''}`,
    { ...o, token },
  );
}

/** Historial de una sola reserva, con todos sus cambios de estado. */
export function consultarHistorialReserva(
  token: string,
  idReserva: number,
  o: Aborto = {},
): Promise<HistorialReserva> {
  return peticion<HistorialReserva>(`/reservas/${idReserva}/historial`, { ...o, token });
}

/** Historial de cambios de los servicios del proveedor (HU-11). */
export function consultarHistorialServicios(
  token: string,
  idServicio?: number,
  o: Aborto = {},
): Promise<CambioServicio[]> {
  const consulta = idServicio === undefined ? '' : `?idServicio=${idServicio}`;
  return peticion<CambioServicio[]>(`/servicios/historial${consulta}`, { ...o, token });
}

/** Activa o inactiva un servicio. Un servicio INACTIVO no acepta reservas nuevas. */
export function cambiarEstadoServicio(
  token: string,
  idServicio: number,
  estado: EstadoServicio,
): Promise<Servicio> {
  return peticion<Servicio>(`/servicios/${idServicio}/estado`, {
    metodo: 'PUT',
    cuerpo: { estado },
    token,
  });
}
