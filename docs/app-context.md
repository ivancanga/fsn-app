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

## Administración

La pantalla `/admin` permite modificar los puntajes de los cuatro equipos: rojo, verde, azul y amarillo. Los datos se guardan en Firebase y el dashboard de equipos los recibe en tiempo real.

También contiene controles para la votación de outfits: permite editar los cuatro participantes, sus descripciones e imágenes, y decidir cuándo se muestran los resultados.

## Firebase

La aplicación usa Firebase Web SDK para Firestore y Cloud Storage. La configuración se lee desde estas variables públicas de Next.js:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

No se encontró Firebase Authentication en el código. La pantalla de administración usa una contraseña definida en el cliente y guardada temporalmente en `sessionStorage`; es un control visual, no una protección de acceso a la base de datos. Las reglas de Firestore y Storage deben proteger los datos y las imágenes.

### Firestore: `teams`

Cada equipo se representa mediante un documento dentro de la colección `teams`:

```text
teams/{rojo|verde|azul|amarillo}
  score: number
  players: Array<{
    name: string
    photo: string | null
    createdAt: string  // fecha ISO
  }>
```

El check-in agrega una persona al array `players` mediante `arrayUnion`. La pantalla `/teams`, que se usa como dashboard, escucha la colección completa con `onSnapshot`, muestra integrantes y ordena los equipos por `score`. La administración lee y actualiza `score` para cada documento.

Los documentos de equipo deben existir antes del primer check-in: el código usa `updateDoc`, que falla si el documento todavía no fue creado.

### Firestore: evento activo y reservas de check-in

El documento `settings/currentFSN` identifica la fiesta activa:

```text
settings/currentFSN
  eventId: string
```

El check-in escucha este documento en tiempo real. En `sessionStorage`, guarda el `eventId` en el que el dispositivo ya completó el check-in; una marca de otra FSN no bloquea la nueva. Las reservas temporales también incluyen `eventId` y solo cuentan para el evento activo. Para iniciar otra FSN por ahora, se cambia `eventId` por un valor único en este documento.

### Storage: fotos de check-in

Al registrarse, una persona sube una foto comprimida en el navegador a esta ruta:

```text
checkins/{equipo}/{timestamp}_{nombre-normalizado}.jpg
```

Después se guarda la URL descargable en `teams/{equipo}.players`. La imagen se comprime a JPEG de hasta 800 px antes de subirla.

### Firestore: `votation/current`

Esta pantalla corresponde a la votación de outfits y no forma parte del flujo principal de check-in. El documento contiene un interruptor de resultados y cuatro participantes fijos:

```text
votation/current
  mostrarResultados: boolean
  participante1..participante4:
    name: string
    description: string
    votes: number
```

`/outfits` escucha este documento en tiempo real y modifica los votos con una transacción para mantener los conteos consistentes. El voto elegido se recuerda solamente en `localStorage` del navegador. La administración edita el documento y carga las imágenes asociadas.

Las imágenes de los outfits se guardan en:

```text
outfits/{participante1|participante2|participante3|participante4}.jpg
```

### Firestore: `games/current`

Esta colección se usa para la dinámica llamada "El rito de sangre":

```text
games/current
  winner: string
  {equipo}: number // intentos erróneos por equipo
```

`/game` incrementa el contador del equipo cuando el código es incorrecto y escribe `winner` cuando se acierta. `/stats` escucha el documento para mostrar intentos en tiempo real y redirige a la celebración cuando existe un ganador. `/celebration` lee el ganador una vez para mostrar la pantalla final.

### Uso de tiempo real

| Recurso | Pantalla | Operación |
| --- | --- | --- |
| `teams` | `/components/checkin` | Cuenta integrantes para balancear la ruleta. |
| `teams` | `/teams` | Actualiza la TV con participantes y puntos. |
| `votation/current` | `/outfits` | Actualiza votos y resultados. |
| `games/current` | `/stats` | Actualiza intentos y detecta ganador. |

## Observaciones para el refactor

- Definir un único tipo `TeamId` en minúsculas (`rojo`, `verde`, `azul`, `amarillo`) y derivar desde allí etiquetas, colores y rutas. Hoy algunas pantallas usan IDs en minúscula y otras claves con inicial mayúscula.
- Crear servicios separados para `teams`, `checkins`, `outfits` y `games`, en lugar de llamar a Firebase desde cada pantalla.
- Crear tipos compartidos para `Team`, `Player`, `OutfitParticipant` y `GameState`.
- Sustituir los arrays de jugadores dentro del documento de equipo por una subcolección cuando se necesite escalar, editar o borrar check-ins individualmente.
- Definir y versionar reglas de Firestore y Storage antes de depender de la contraseña del cliente para administrar datos.
- Centralizar la compresión y subida de imágenes, que hoy está repetida en check-in y administración.

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
