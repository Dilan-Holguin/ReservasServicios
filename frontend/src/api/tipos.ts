/**
 * Tipos del contrato de la API de ReservaYa.
 *
 * Las formas están tomadas de respuestas reales del backend desplegado
 * (https://reservaya-vvke.onrender.com/api/v1) y de los DTO de
 * `src/main/java/co/reservas/adapters/in/web/**`, no de suposiciones.
 */

export type Rol = 'CLIENTE' | 'PROVEEDOR' | 'ADMIN';

export type EstadoUsuario = 'PENDIENTE_VERIFICACION' | 'ACTIVO' | 'INACTIVO';

export type EstadoServicio = 'ACTIVO' | 'INACTIVO';

export type EstadoReserva = 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA';

/** Códigos de error del contrato uniforme (docs/modelo-datos-y-paquetes.md §3). */
export type CodigoError =
  | 'VALIDACION_FALLIDA'
  | 'SOLICITUD_INVALIDA'
  | 'SERVICIO_REQUERIDO'
  | 'TOKEN_VERIFICACION_INVALIDO'
  | 'NO_AUTENTICADO'
  | 'CREDENCIALES_INVALIDAS'
  | 'ACCESO_DENEGADO'
  | 'CUENTA_NO_VERIFICADA'
  | 'CUENTA_INACTIVA'
  | 'SERVICIO_NO_ENCONTRADO'
  | 'HORARIO_NO_ENCONTRADO'
  | 'RECURSO_NO_ENCONTRADO'
  | 'CATEGORIA_NO_ENCONTRADA'
  | 'TIPO_RECURSO_NO_ENCONTRADO'
  | 'RESERVA_NO_ENCONTRADA'
  | 'RUTA_NO_ENCONTRADA'
  | 'METODO_NO_PERMITIDO'
  | 'EMAIL_YA_REGISTRADO'
  | 'SERVICIO_YA_REGISTRADO'
  | 'RECURSO_YA_REGISTRADO'
  | 'HORARIO_SOLAPADO'
  | 'HORARIO_CON_RESERVAS'
  | 'TURNO_SIN_CUPO'
  | 'RECURSO_NO_DISPONIBLE'
  | 'RESERVA_SOLAPADA'
  | 'RESERVA_NO_CANCELABLE'
  | 'RESERVA_EN_EL_PASADO'
  | 'CANCELACION_FUERA_DE_PLAZO'
  | 'HORARIO_NO_DISPONIBLE'
  | 'SERVICIO_NO_DISPONIBLE'
  | 'BLOQUE_MENOR_A_DURACION'
  | 'CUENTA_BLOQUEADA'
  | 'ERROR_INTERNO';

/**
 * `details` es heterogéneo: el backend lo declara como `List<Object>` y según el
 * código de error trae errores de campo, turnos sugeridos, recursos en conflicto
 * o reservas afectadas.
 */
export interface DetalleCampo {
  campo: string;
  mensaje: string;
}

export interface SugerenciaTurno {
  tipo: 'SUGERENCIA';
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

export interface RecursoEnConflicto {
  tipo: 'RECURSO';
  idRecurso: number;
  nombre: string;
}

export interface ReservaAfectada {
  idReserva: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

export type DetalleError =
  | DetalleCampo
  | SugerenciaTurno
  | RecursoEnConflicto
  | ReservaAfectada
  | Record<string, unknown>;

/** Cuerpo uniforme de error: `{errorCode, message, details, traceId, timestamp}`. */
export interface RespuestaError {
  errorCode: CodigoError;
  message: string;
  details: DetalleError[];
  traceId: string | null;
  timestamp: string;
}

export interface ElementoCatalogo {
  id: number;
  nombre: string;
}

export interface Servicio {
  id: number;
  idProveedor: number;
  nombreProveedor: string;
  zonaHoraria: string;
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  duracionMinutos: number;
  capacidad: number;
  estado: EstadoServicio;
}

export interface TurnoDisponible {
  fechaHoraInicio: string;
  fechaHoraFin: string;
  cuposDisponibles: number;
}

export interface Disponibilidad {
  idServicio: number;
  zonaHoraria: string;
  turnos: TurnoDisponible[];
}

/** `horaInicio` y `horaFin` llegan como `HH:mm:ss`. */
export interface Horario {
  id: number;
  idServicio: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface CambioHorario {
  horario: Horario | null;
  reservasAfectadas: ReservaAfectada[];
}

export interface EliminacionHorario {
  reservasAfectadas: ReservaAfectada[];
}

export interface Recurso {
  id: number;
  idTipoRecurso: number;
  nombre: string;
  activo: boolean;
}

export interface Reserva {
  id: number;
  idServicio: number;
  nombreServicio: string;
  idCliente: number;
  estado: EstadoReserva;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  recursos: Recurso[];
  creadoEn: string;
}

/* ------------------------------------------------------ historiales (Sprint 2) */

/** Autor de un cambio registrado en un historial. No trae datos de contacto. */
export interface AutorCambio {
  idUsuario: number;
  nombre: string;
  rol: Rol;
}

/** Transición de estado de una reserva. `estadoAnterior` es `null` en la creación. */
export interface CambioEstadoReserva {
  estadoAnterior: EstadoReserva | null;
  estadoNuevo: EstadoReserva;
  realizadoPor: AutorCambio;
  fechaCambio: string;
}

/** Reserva con su estado actual y sus cambios en orden cronológico (HU-10, HU-14). */
export interface HistorialReserva {
  idReserva: number;
  idServicio: number;
  nombreServicio: string;
  idCliente: number;
  estado: EstadoReserva;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  creadoEn: string;
  cambios: CambioEstadoReserva[];
}

export interface FiltroHistorialReservas {
  idServicio?: number;
  estado?: EstadoReserva;
  /** Fecha `YYYY-MM-DD` inclusiva, interpretada en la zona del proveedor. */
  desde?: string;
  hasta?: string;
}

/** Tipos de cambio del historial de un servicio (HU-11). */
export type TipoCambioServicio =
  | 'CREACION'
  | 'HORARIO_CREADO'
  | 'HORARIO_EDITADO'
  | 'HORARIO_ELIMINADO'
  | 'RECURSOS_ASIGNADOS'
  | 'ESTADO_CAMBIADO';

/** Cambio en la oferta de un servicio (HU-11). */
export interface CambioServicio {
  id: number;
  idServicio: number;
  nombreServicio: string;
  tipoCambio: TipoCambioServicio;
  valorAnterior: string | null;
  valorNuevo: string | null;
  realizadoPor: AutorCambio;
  fechaCambio: string;
}

export interface Sesion {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  rol: Rol;
  redirectTo: string;
}

export interface RegistroResultado {
  id: number;
  email: string;
  rol: Rol;
  estado: EstadoUsuario;
  mensaje: string;
}

export interface Mensaje {
  mensaje: string;
}

export interface NuevoServicio {
  nombre: string;
  descripcion?: string;
  idCategoria: number;
  duracionMinutos: number;
  capacidad: number;
}

export interface DatosRegistro {
  nombreCompleto: string;
  email: string;
  password: string;
  rol: 'CLIENTE' | 'PROVEEDOR';
  telefono?: string;
  nombreComercial?: string;
  zonaHoraria?: string;
  servicios?: NuevoServicio[];
}
