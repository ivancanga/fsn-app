# Contexto de FSN

## Propósito

FSN significa **Fiesta Sin Nombre**. Es una aplicación para apoyar una fiesta organizada en una casa, donde las personas participan en juegos de mesa y sus equipos acumulan puntos durante la noche.

La aplicación se usa tanto desde los teléfonos de las personas invitadas como en una TV grande proyectada durante el evento.

## Flujo principal

1. Una persona llega a la fiesta y abre la pantalla de check-in.
2. Se registra sacándose una foto.
3. Gira una ruleta para asignarse a uno de los cuatro equipos por color.
4. Al completar el check-in, accede al dashboard de puntos.
5. El dashboard muestra su registro y los puntos en tiempo real del equipo asignado.

## Dashboard de la TV

Durante la fiesta, una TV grande muestra el dashboard de los cuatro equipos. Los puntajes se actualizan en tiempo real mientras avanzan los juegos de mesa.

## Conceptos del dominio

| Concepto | Descripción |
| --- | --- |
| Participante | Persona invitada que realiza el check-in y participa en los juegos. |
| Equipo | Uno de los cuatro equipos definidos por color. |
| Check-in | Registro de llegada que incluye una foto y la asignación aleatoria de equipo. |
| Ruleta | Mecanismo que elige el color del equipo de un participante. |
| Puntaje | Puntos acumulados por un equipo durante la fiesta. |

## Criterios importantes

- La asignación de equipo ocurre al terminar el check-in.
- Los puntajes deben actualizarse en tiempo real.
- La vista de TV debe hacer clara la comparación entre los cuatro equipos.
- Las pantallas deben ser simples de usar durante una fiesta, tanto en móvil como en una TV.

## Áreas pendientes de documentar

- Reglas para otorgar y modificar puntajes.
- Rol y funciones de la pantalla de administración.
- Funcionamiento de los juegos, votaciones y otras rutas de la aplicación.
- Estructura de datos en Firebase y rutas de imágenes en Storage.
- Cómo se identifica a un participante y cómo se evita un check-in duplicado.

## Refactor propuesto

El refactor debe conservar este flujo y separar cada responsabilidad:

- Componentes de interfaz para check-in, ruleta y dashboard.
- Hooks para estado de participantes, equipos y puntajes en tiempo real.
- Servicios para Firebase y Storage.
- Tipos compartidos para participantes, equipos, check-in y puntajes.
- Constantes para equipos, colores y rutas de datos.
