# PetHero - Angular Starter (Standalone + Lazy + Mock API)

Aplicacion demo para duenos y guardianes. Incluye Home con dashboard por rol, busqueda de guardianes, reservas con validaciones, pagos simulados, resenas, chat, notificaciones y perfiles, todo sobre una API mock (json-server).

## Requisitos
- Node 18+
- npm 9+

## Puesta en marcha
    npm install
    # Ejecutar API mock y app en paralelo
    npm run start:mock
    # o por separado
    npm run mock      # API: http://localhost:3000
    npm start         # App: http://localhost:4200

## Tecnologias y arquitectura
- Angular 18, Standalone Components y rutas lazy
- Estado reactivo con Angular Signals
- JSON Server como backend mock (mock/db.json)
- Persistencia local para features (localStorage / sessionStorage)
- Interceptores: token mock y manejo de errores

## Navegacion y rutas
- Default: '' -> /home (protegida). Usuarios no autenticados son redirigidos a /auth/login.
- Auth: /auth/* (login, registro owner/guardian)
- Home: /home (dashboard por rol)
- Guardians: /guardians/* (protegido)
- Owners: /owners/* (protegido)
- Bookings, Reviews, Payments: modulos protegidos
- Mi cuenta: /me/profile

## Home (dashboard)
Pantalla principal para usuarios autenticados.
- Saludo rotativo y avatar con fallback (pravatar si el perfil no tiene imagen)
- Actividad: notificaciones recientes y contador de mensajes no leidos
- Dueno:
  - Mis Mascotas: total (compatibilidad con modelos antiguos), accesos rapidos
  - Reservas: activas, pendientes de pago y proxima reserva
  - Minisparkbars con importes de las ultimas reservas
- Guardian:
  - KPIs: pendientes, activas, finalizadas e ingresos estimados
  - Reputacion: promedio y cantidad de resenas
  - Proxima disponibilidad (si hay slots)
  - Minisparkbars de ultimas reservas atendidas
- UI moderna: gradientes, glass cards, responsive y dark-aware

## Autenticacion y perfiles
- Login/Registro contra json-server (/users)
- Sesion mock persistida en sessionStorage
- authGuard protege rutas; usuarios sin sesion son enviados a /auth/login
- CurrentProfileService carga el perfil (/profiles?userId=)

## Duenos - Mascotas
- Listado/creacion/eliminacion via PetsService (/pets)
- Compatibilidad legacy: conteo y listados consideran ownerId en diferentes formatos (por ejemplo "1" o "u1") e incluso ownerEmail si existe en el mock

## Guardianes
- Busqueda con filtros basicos y perfil detallado
- Datos de prueba realistas en mock/db.json (ver abajo)

## Reservas (Bookings)
- Estados: REQUESTED, ACCEPTED, REJECTED, CANCELLED, CONFIRMED, IN_PROGRESS, COMPLETED
- Validaciones: fechas validas, no superposicion para dueno ni para guardian
- Precio: noches * pricePerNight del guardian
- Acciones: solicitar, aceptar/rechazar, pagar (simulado), cancelar, finalizar
- Persistencia en localStorage (demo)
- Notificaciones automaticas para acciones principales

## Pagos (simulado)
- Checkout de deposito (50%) para confirmar reserva

## Resenas
- Servicio y pagina de resenas (/reviews); usadas para el promedio en Home (guardian)

## Chat
- Conversaciones derivadas de reservas y mensajes previos
- Refresco periodico desde la API (/messages)
- Ventanas flotantes, no leidos, recibido/leido
- Persistencia local para mejorar UX en la demo

## Notificaciones
- Servicio en memoria con persistencia local (shared/services/notifications.service.ts)
- Menu en header con punto de no leidos y listado en Home

## Servicios y helpers clave
- ApiService (HTTP base)
- auth-token.interceptor.ts, error-handler.interceptor.ts
- current-profile.service.ts, profile.service.ts
- bookings.service.ts, pets.service.ts, guardians.service.ts, reviews.service.ts, availability.service.ts

## Componentes UI
- AvatarComponent, rating.component, chat-bar, contacts-panel

## Datos mock (json-server)
- Endpoints: /users, /profiles, /guardians, /pets, /bookings, /messages, /reviews, /payments, /availability
- Cuentas de prueba:
  - 15 guardianes adicionales auto-generados (*.mail.com) con perfiles, precios, ciudades y ratings variados

## Scripts npm
- npm run mock    -> inicia json-server (http://localhost:3000)
- npm start       -> inicia la app (http://localhost:4200)
- npm run start:mock -> corre API mock y app en paralelo
- npm run build   -> compila prod
- npm run lint / npm test

## Notas
- Proyecto de demostracion: la seguridad es mock y no debe usarse en produccion.
- El Home asume datos de mock/localStorage; si se borra el storage, la UI se resetea.
