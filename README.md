# Pet Hero — Starter Angular (Standalone, Lazy Routes, Mock API)

Cumple con la documentación del TP: registro de usuarios y mascotas, búsqueda/perfil de guardianes,
solicitud de reservas con validaciones, chat, pagos (50% simulado), reseñas (stub), persistencia mock.

## Requisitos
- Node 18+
- npm 9+

## Puesta en marcha
```bash
npm install
npm run mock     # http://localhost:3000
npm start        # http://localhost:4200
# o en paralelo:
npm run start:mock
```

## Features incluidas
- auth/ (login + registro owner/guardian mock)
- guardians/ (búsqueda + perfil)
- owners/pets/ (listado inicial)
- bookings/ (lista + solicitud con validación de fechas, redirección si no hay mascotas)
- messages/ (chat stub)
- reviews/ (stub)
- payments/ (checkout con depósito 50% simulado)

## Infra
- ApiService (HttpClient)
- Interceptor de token
- Interceptor de errores
- Modelos tipados
- Environments (dev → http://localhost:3000)

## Mock
`mock/db.json` con guardianes y una mascota de ejemplo.