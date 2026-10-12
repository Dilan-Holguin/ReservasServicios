#!/usr/bin/env python3
"""Dispara el despliegue de los servicios de Render y espera el resultado real.

El pipeline es el único que despliega: la cuenta de Render no recibe los eventos de
push de GitHub, así que el despliegue automático de la plataforma nunca se activa.
Verificar que el servicio responde con salud no alcanza, porque un servicio que corre
una versión vieja también responde con salud. Lo que se verifica acá es el despliegue:
que llegue al estado `live` y qué commit quedó publicado.

Variables de entorno:
  RENDER_API_KEY        Obligatoria. Clave de la API de Render.
  RENDER_SERVICIOS      Lista separada por comas de `nombre=idServicio`.
  COMMIT_ESPERADO       Opcional. SHA que se espera ver publicado; solo se informa.
  GITHUB_STEP_SUMMARY   Opcional. Si está, se escribe el resumen del despliegue.

Sin dependencias externas a propósito: el runner no necesita instalar nada.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

API = "https://api.render.com/v1"

# Estados terminales de un despliegue de Render.
EXITO = {"live"}
FRACASO = {
    "build_failed",
    "update_failed",
    "pre_deploy_failed",
    "canceled",
    "deactivated",
}

ESPERA_SEGUNDOS = 20
INTENTOS_MAXIMOS = 90  # 30 minutos


class ErrorDespliegue(RuntimeError):
    """El despliegue no llegó a `live`."""


@dataclass(frozen=True)
class Resultado:
    nombre: str
    id_servicio: str
    id_despliegue: str
    estado: str
    commit: str

    @property
    def exitoso(self) -> bool:
        return self.estado in EXITO


def _pedir(ruta: str, clave: str, cuerpo: dict | None = None) -> dict:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(
        f"{API}{ruta}",
        data=datos,
        method="POST" if cuerpo is not None else "GET",
        headers={
            "Authorization": f"Bearer {clave}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(peticion, timeout=60) as respuesta:
            return json.loads(respuesta.read())
    except urllib.error.HTTPError as error:
        detalle = error.read().decode(errors="replace")[:300]
        raise ErrorDespliegue(f"{error.code} en {ruta}: {detalle}") from error


def disparar(id_servicio: str, clave: str) -> str:
    """Crea un despliegue y devuelve su identificador.

    Se pide siempre con la caché de capas limpia. No es paranoia: un despliegue del
    commit bd22d67 quedó en estado `live` mientras la aplicación servía el código del
    sprint anterior —17 rutas en lugar de 22 y dos migraciones de Flyway en lugar de
    tres—, y volver a construir sin caché fue lo único que publicó el código correcto.
    El costo medido es nulo: la construcción con caché tardó 49 segundos y la limpia 47.
    Entre ahorrar nada y publicar código viejo, no hay elección.
    """
    respuesta = _pedir(
        f"/services/{id_servicio}/deploys", clave, {"clearCache": "clear"}
    )
    return respuesta["id"]


def esperar(id_servicio: str, id_despliegue: str, clave: str) -> tuple[str, str]:
    """Consulta el despliegue hasta que alcance un estado terminal."""
    estado = "desconocido"
    commit = ""
    for intento in range(1, INTENTOS_MAXIMOS + 1):
        despliegue = _pedir(f"/services/{id_servicio}/deploys/{id_despliegue}", clave)
        estado = despliegue.get("status", "desconocido")
        commit = (despliegue.get("commit") or {}).get("id", "")
        print(f"  intento {intento}: {estado}", flush=True)
        if estado in EXITO or estado in FRACASO:
            return estado, commit
        time.sleep(ESPERA_SEGUNDOS)
    raise ErrorDespliegue(
        f"El despliegue {id_despliegue} sigue en «{estado}» tras "
        f"{INTENTOS_MAXIMOS * ESPERA_SEGUNDOS // 60} minutos."
    )


def desplegar(nombre: str, id_servicio: str, clave: str) -> Resultado:
    print(f"{nombre} ({id_servicio}): disparando despliegue", flush=True)
    id_despliegue = disparar(id_servicio, clave)
    print(f"{nombre}: despliegue {id_despliegue}", flush=True)
    estado, commit = esperar(id_servicio, id_despliegue, clave)
    return Resultado(nombre, id_servicio, id_despliegue, estado, commit)


def _leer_servicios(crudo: str) -> list[tuple[str, str]]:
    servicios = []
    for parte in crudo.split(","):
        parte = parte.strip()
        if not parte:
            continue
        if "=" not in parte:
            raise SystemExit(
                f"RENDER_SERVICIOS mal formado en «{parte}»: se espera nombre=idServicio"
            )
        nombre, id_servicio = parte.split("=", 1)
        servicios.append((nombre.strip(), id_servicio.strip()))
    if not servicios:
        raise SystemExit("RENDER_SERVICIOS está vacío.")
    return servicios


def _resumir(resultados: list[Resultado], esperado: str) -> None:
    ruta = os.environ.get("GITHUB_STEP_SUMMARY")
    if not ruta:
        return
    lineas = ["## Despliegue en Render", "", "| Servicio | Estado | Commit |", "|---|---|---|"]
    for r in resultados:
        marca = "✅" if r.exitoso else "❌"
        lineas.append(f"| {r.nombre} | {marca} {r.estado} | `{r.commit[:7] or '-'}` |")
    if esperado:
        lineas += ["", f"Commit esperado: `{esperado[:7]}`"]
    with open(ruta, "a", encoding="utf-8") as archivo:
        archivo.write("\n".join(lineas) + "\n")


def main() -> int:
    clave = os.environ.get("RENDER_API_KEY", "").strip()
    if not clave:
        print("Falta el secreto RENDER_API_KEY.", file=sys.stderr)
        return 1

    servicios = _leer_servicios(os.environ.get("RENDER_SERVICIOS", ""))
    esperado = os.environ.get("COMMIT_ESPERADO", "").strip()

    resultados: list[Resultado] = []
    fallos: list[str] = []
    for nombre, id_servicio in servicios:
        try:
            resultados.append(desplegar(nombre, id_servicio, clave))
        except ErrorDespliegue as error:
            print(f"{nombre}: {error}", file=sys.stderr)
            fallos.append(nombre)

    _resumir(resultados, esperado)

    for r in resultados:
        if not r.exitoso:
            print(f"{r.nombre}: terminó en «{r.estado}».", file=sys.stderr)
            fallos.append(r.nombre)
            continue
        print(f"{r.nombre}: live en {r.commit[:7]}")
        # Render despliega la punta de la rama. Si alguien mergeó entre que CI terminó y
        # este paso arrancó, la punta se movió y ya viene otro despliegue en camino: se
        # avisa, pero no se trata como un fallo.
        if esperado and not r.commit.startswith(esperado[:7]):
            print(
                f"::warning::{r.nombre} publicó {r.commit[:7]} y se esperaba "
                f"{esperado[:7]}: la rama se movió durante el despliegue."
            )

    if fallos:
        print(f"Despliegues fallidos: {', '.join(sorted(set(fallos)))}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
