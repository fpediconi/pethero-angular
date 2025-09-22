# PetHero — Guía de funcionalidades (no técnica)

**PetHero** es una app pensada para conectar **Dueños de mascotas (Owners)** con **Cuidadores (Guardians)**. 
El objetivo es simple: encontrar a la persona ideal para cuidar a tu mascota, coordinar fechas, hablar por chat, reservar y dejar una reseña al finalizar.

---

## 👤 Roles y qué puede hacer cada uno

### Owner (dueño de mascota)
- Crear su **perfil** personal.
- Cargar una o varias **mascotas** (nombre, tipo, tamaño, notas, foto).
- **Buscar** y **filtrar** cuidadores por ciudad y características.
- Marcar **favoritos** para volver rápido a perfiles que le interesen.
- **Chatear** con cuidadores para despejar dudas.
- **Solicitar reservas** para fechas específicas.
- Recibir **comprobantes de pago** (voucher) y registrar pagos (señal o total).
- Dejar **reseñas** y puntajes cuando el servicio termina.
- Ver un **panel (Home)** con próximos eventos y pendientes.

### Guardian (cuidador)
- Completar su **perfil público** (presentación, foto, ciudad).
- Definir **precio por noche** y qué **tipos/tamaños** acepta.
- Administrar su **disponibilidad por días** con un calendario simple.
- Ver **días con reservas confirmadas** claramente resaltados.
- **Chatear** con dueños para coordinar detalles.
- **Aceptar/Rechazar** solicitudes de reserva.
- Emitir/actualizar **comprobantes de pago (voucher)**.
- Recibir **reseñas** y construir su **reputación**.
- Ver un **panel (Home)** con métricas rápidas del día a día.

---

## 🧭 Recorrido rápido (5 minutos)

1. **Registrate** como Owner o Guardian.
2. Completá tu **perfil**.
3. (Owner) Cargá tu **mascota** y buscá **guardianes** en tu ciudad.
4. Abrí un **chat** con un guardián que te guste.
5. **Solicitá la reserva** para las fechas deseadas.
6. (Guardian) **Aceptá** la solicitud y revisá el **voucher** de pago.
7. Una vez finalizado el servicio, el Owner deja una **reseña** ⭐ y el proceso queda **completado**.

> Bonus: Si sos Guardian, mantené tu **calendario** al día; eso hace que te encuentren más rápido y evita choques de fechas.

---

## 🔎 Búsqueda y perfiles de Guardianes

- Galería de **perfiles** con foto, nombre, **ciudad**, **precio** y rating promedio.
- Detalle del perfil con **descripción**, **fotos**, tamaños y tipos de mascota aceptados.
- Botón de **“Favorito”** para guardar y volver después.
- Botón **“Mandar mensaje”** para abrir el **chat** desde el perfil.

---

## 💬 Chat simple y siempre a mano

- **Barra de chat** en la parte inferior para seguir conversaciones mientras navegás.
- **Lista de contactos** a la derecha para saltar entre conversaciones.
- Ideal para coordinar **detalles rápidos** (horarios, presentación de la mascota, dudas).

---

## 📆 Disponibilidad del guardián (por días)

- Vista de **calendario** para agregar o quitar **días disponibles**.
- **Sin solapamientos**: la app te avisa si intentás superponer periodos.
- **Días con reserva confirmada** aparecen **resaltados** para que no se te pasen.
- Búsquedas y chequeos **por día**, pensadas para evitar confusiones con rangos complejos.

> Consejo: cargá primero los días “fijos” (ej.: todos los lunes y jueves del mes) y luego ajustá casos puntuales.

---

## 🧾 Reservas: del pedido a la reseña

1. **Solicitud** (Owner) → elige fechas y envía el pedido.
2. **Respuesta** (Guardian) → puede **Aceptar** o **Rechazar**.
3. **Seña/Confirmación**: se genera un **voucher** y se registra el pago.
4. **En curso**: servicio activo durante las fechas.
5. **Completado**: el Owner deja una **reseña** y un **puntaje** ⭐⭐️⭐️⭐️⭐️.

> Estados especiales: **Cancelada** (por cualquiera de las partes) o **Rechazada** (por el guardián).

---

## 💳 Comprobantes y pagos

- Cada reserva puede tener un **voucher** asociado (importe y vencimiento).
- El estado del voucher cambia (emitido, pagado, vencido, anulado) para que todos estén alineados.
- Registro simple de **pagos** (seña o total) para cerrar el circuito.

---

## 🐾 Mascotas (Owners)

- Cargá todas tus **mascotas** con sus datos básicos.
- Subí **foto**, indicá **tamaño** y agregá **notas** (medicación, carácter, etc.).
- Elegí qué mascota va en cada **reserva**.

---

## ⭐ Reseñas y reputación

- Al finalizar el servicio, el Owner puede dejar una **reseña** con **puntaje**.
- El perfil del Guardián muestra **promedio** y **cantidad** de reseñas.
- Las buenas reseñas ayudan a que te **elijan más**.

---

## 🏠 Home (panel por rol)

- **Próximos eventos** (reservas, pagos, disponibilidad).
- **Atajos** a lo que suele usarse seguido (mensajes, mascotas, calendario).
- **Indicadores** rápidos (por ejemplo: cuántos mensajes sin leer o próximas reservas).

---

## ❤️ Favoritos (Owners)

- Guardá perfiles que te interesan para volver **rápido**.
- Útil si estás **comparando** opciones o querés decidir más tarde.

---

## 🔐 Roles y comportamiento esperado

- Algunas pantallas muestran **cosas distintas** según seas Owner o Guardian.
- El sistema solo habilita **acciones válidas** para tu rol (por ejemplo: solo Guardian puede **aceptar** reservas).
- La navegación te lleva por el **flujo correcto** (no necesitás conocer reglas internas).

---

## 🧪 Datos de prueba

- La app incluye **datos de ejemplo** para que puedas **probar** sin cargar todo desde cero (perfiles, guardianes, etc.).
- Podés **registrarte** con un usuario nuevo si preferís un recorrido limpio.

> Sugerencia: probá con **dos usuarios** (uno Owner y otro Guardian) para vivir ambas experiencias y chatear “contigo mismo”.

---

## 🧰 Consejos de uso

- Si sos **Owner**: hacé una lista corta de 2–3 favoritos y usá el **chat** para decidir.
- Si sos **Guardian**: mantené tu **calendario** al día y pedí a tus clientes que te dejen **reseña**.
- En ambos casos: cargá **fotos** claras (perfiles y mascotas) — ayudan un montón a decidir.

---

## 🗺️ Próximas ideas (roadmap sugerido)

- **Búsquedas avanzadas** (por barrio, disponibilidad directa desde la búsqueda).
- **Promociones** (descuento por reservas largas o clientes recurrentes).
- **Verificación de identidad** y **seguro** opcional.
- **Recordatorios** automáticos de check-in / check-out.
- **Métricas** para guardianes (ocupación, ingresos, reseñas por periodo).

---

## ❓Preguntas frecuentes

**¿Necesito hablar antes de reservar?**  
No es obligatorio, pero el **chat** ayuda a alinear expectativas y evita sorpresas.

**¿Cuándo puedo dejar una reseña?**  
Cuando la reserva está **Completada**. Si se cancela, no se habilita reseña.

**¿Puedo cambiar fechas de una reserva?**  
Sí, pero lo ideal es **coordinar por chat** y volver a emitir el **voucher** si cambia el importe.

**¿Cómo sé si un día está ocupado?**  
En el calendario del Guardian, los **días con reserva confirmada** aparecen resaltados.

---

> Esta guía está orientada a **uso y evaluación funcional**. Si necesitás detalles técnicos (frameworks, rutas, despliegue), hay un README técnico separado.
