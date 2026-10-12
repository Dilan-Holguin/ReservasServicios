## Qué cambia

<!-- Una o dos frases. Qué resuelve este PR, no cómo. -->

## Historia de usuario

<!-- Enlace o número del work item de Azure DevOps. Ej: HU-08 #15 -->

## Criterios de aceptación cubiertos

<!-- Lista los criterios de la HU que este PR deja cumplidos. -->

- [ ]

## Cómo se verificó

<!-- Pruebas nuevas o modificadas, y cómo reproducir la verificación a mano. -->

## Lista de control

- [ ] `./mvnw verify` pasa en local y el pipeline de CI está en verde.
- [ ] Las reglas de negocio nuevas tienen prueba unitaria y, si tocan la base, de integración.
- [ ] Un cambio de esquema viaja en una migración nueva de Flyway (nunca editando una existente).
- [ ] `docs/modelo-datos-y-paquetes.md` queda al día si cambió el esquema, los paquetes o los códigos de error.
- [ ] No hay secretos ni credenciales en el código ni en los archivos de configuración.
- [ ] Los diagramas y documentos afectados se actualizaron en este mismo sprint.
