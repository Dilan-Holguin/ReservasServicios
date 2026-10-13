import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TurnoDisponible } from '../api/tipos';
import { fechaLarga, soloHora } from '../utiles/fechas';

export interface FilaDeDia {
  /** Clave `YYYY-MM-DD` en la zona del proveedor. */
  dia: string;
  turnos: TurnoDisponible[];
}

interface PropsGrilla {
  filas: FilaDeDia[];
  zonaHoraria?: string;
  /** Turno cuya reserva está en vuelo, o `null`. */
  enVuelo: string | null;
  idEtiqueta: string;
  onElegir: (fechaHoraInicio: string) => void;
}

/** Mueve un índice dentro de `[0, limite)` sin salirse. */
function acotar(valor: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min(Math.max(valor, 0), limite - 1);
}

/**
 * Grilla de turnos navegable con el teclado.
 *
 * Antes esto era una lista de botones: con el teclado había que pulsar Tab una vez
 * por turno, y una semana de agenda son decenas de turnos. Con el patrón de grilla
 * de ARIA la grilla entera es **una sola** parada de tabulación y por dentro se
 * recorre con las flechas, igual que una hoja de cálculo.
 *
 * El mecanismo es el `tabindex` móvil: exactamente una celda tiene `tabIndex=0` y
 * todas las demás `-1`, así que el navegador trata la grilla como un control único.
 * Las flechas mueven esa celda y el foco va detrás.
 *
 * Teclas: flechas para moverse, Inicio y Fin para los extremos del día,
 * Ctrl+Inicio y Ctrl+Fin para el primero y el último turno de todo el rango,
 * Entrar o Espacio para reservar.
 *
 * Las celdas que no son la que está en vuelo se marcan con `aria-disabled` en lugar
 * de `disabled`: un botón deshabilitado no recibe foco, y eso rompería el recorrido
 * justo cuando el usuario está en medio de él.
 */
export function GrillaTurnos({
  filas,
  zonaHoraria,
  enVuelo,
  idEtiqueta,
  onElegir,
}: PropsGrilla) {
  const [activa, setActiva] = useState<[number, number]>([0, 0]);
  const celdas = useRef(new Map<string, HTMLButtonElement>());
  const debeEnfocar = useRef(false);

  const total = useMemo(
    () => filas.reduce((suma, fila) => suma + fila.turnos.length, 0),
    [filas],
  );

  // Si el rango cambia y la celda activa ya no existe, vuelve al primer turno.
  useEffect(() => {
    setActiva(([fila, columna]) => {
      const filaSegura = acotar(fila, filas.length);
      const columnaSegura = acotar(columna, filas[filaSegura]?.turnos.length ?? 0);
      return [filaSegura, columnaSegura];
    });
  }, [filas]);

  // El foco solo se mueve a mano cuando lo pidió el teclado: si se moviera en cada
  // render, el sondeo de disponibilidad le robaría el foco al usuario cada 30 segundos.
  useEffect(() => {
    if (!debeEnfocar.current) return;
    debeEnfocar.current = false;
    const turno = filas[activa[0]]?.turnos[activa[1]];
    if (turno) celdas.current.get(turno.fechaHoraInicio)?.focus();
  }, [activa, filas]);

  const mover = useCallback(
    (siguiente: [number, number]) => {
      debeEnfocar.current = true;
      setActiva(siguiente);
    },
    [],
  );

  const alPulsar = useCallback(
    (evento: KeyboardEvent<HTMLButtonElement>, fila: number, columna: number) => {
      const turnosDeFila = filas[fila]?.turnos.length ?? 0;

      switch (evento.key) {
        case 'ArrowRight':
          evento.preventDefault();
          mover([fila, acotar(columna + 1, turnosDeFila)]);
          break;
        case 'ArrowLeft':
          evento.preventDefault();
          mover([fila, acotar(columna - 1, turnosDeFila)]);
          break;
        case 'ArrowDown': {
          evento.preventDefault();
          const abajo = acotar(fila + 1, filas.length);
          mover([abajo, acotar(columna, filas[abajo]?.turnos.length ?? 0)]);
          break;
        }
        case 'ArrowUp': {
          evento.preventDefault();
          const arriba = acotar(fila - 1, filas.length);
          mover([arriba, acotar(columna, filas[arriba]?.turnos.length ?? 0)]);
          break;
        }
        case 'Home':
          evento.preventDefault();
          mover(evento.ctrlKey ? [0, 0] : [fila, 0]);
          break;
        case 'End': {
          evento.preventDefault();
          if (evento.ctrlKey) {
            const ultima = acotar(filas.length - 1, filas.length);
            mover([ultima, acotar((filas[ultima]?.turnos.length ?? 1) - 1, filas[ultima]?.turnos.length ?? 0)]);
          } else {
            mover([fila, acotar(turnosDeFila - 1, turnosDeFila)]);
          }
          break;
        }
        default:
          break;
      }
    },
    [filas, mover],
  );

  if (filas.length === 0) return null;

  return (
    <div
      role="grid"
      className="grilla-turnos"
      aria-labelledby={idEtiqueta}
      aria-rowcount={filas.length}
      aria-busy={enVuelo !== null}
    >
      <p className="grilla-turnos__ayuda" id={`${idEtiqueta}-ayuda`}>
        {total === 1 ? '1 turno disponible.' : `${total} turnos disponibles.`} Recórrelos con las
        flechas del teclado y reserva con Entrar.
      </p>

      {filas.map((fila, indiceFila) => (
        <div role="row" className="grilla-turnos__fila" key={fila.dia} aria-rowindex={indiceFila + 1}>
          <span role="rowheader" className="grilla-turnos__dia">
            {fechaLarga(fila.turnos[0].fechaHoraInicio, zonaHoraria)}
          </span>

          <div className="grilla-turnos__celdas">
            {fila.turnos.map((turno, indiceColumna) => {
              const esActiva = activa[0] === indiceFila && activa[1] === indiceColumna;
              const estaEnVuelo = enVuelo === turno.fechaHoraInicio;
              const bloqueada = enVuelo !== null && !estaEnVuelo;

              return (
                <span role="gridcell" key={turno.fechaHoraInicio}>
                  <button
                    ref={(nodo) => {
                      if (nodo) celdas.current.set(turno.fechaHoraInicio, nodo);
                      else celdas.current.delete(turno.fechaHoraInicio);
                    }}
                    type="button"
                    className="turno"
                    tabIndex={esActiva ? 0 : -1}
                    aria-busy={estaEnVuelo}
                    aria-disabled={bloqueada}
                    onFocus={() => setActiva([indiceFila, indiceColumna])}
                    onKeyDown={(evento) => alPulsar(evento, indiceFila, indiceColumna)}
                    onClick={() => {
                      if (bloqueada || estaEnVuelo) return;
                      onElegir(turno.fechaHoraInicio);
                    }}
                  >
                    <span className="turno__hora">
                      {soloHora(turno.fechaHoraInicio, zonaHoraria)}
                    </span>
                    <span className="turno__cupos">
                      {turno.cuposDisponibles === 1
                        ? '1 cupo libre'
                        : `${turno.cuposDisponibles} cupos libres`}
                    </span>
                    <span className="turno__accion">
                      {estaEnVuelo ? 'Reservando…' : 'Reservar'}
                    </span>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
