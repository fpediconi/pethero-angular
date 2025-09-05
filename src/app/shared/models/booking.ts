export type BookingStatus =
  | 'REQUESTED'     // Pendiente
  | 'ACCEPTED'      // Aceptada (por el guardián)
  | 'REJECTED'      // Rechazada (por el guardián)
  | 'CANCELLED'     // Cancelada (por dueño)
  | 'CONFIRMED'     // Confirmada (pagada)
  | 'IN_PROGRESS'   // En curso
  | 'COMPLETED';    // Finalizada

export interface Booking {
  id: string;
  ownerId: string;
  guardianId: string;
  petId: string;
  start: string;
  end: string;
  status: BookingStatus;
  depositPaid: boolean; // Pagado / Sin pagar (simulado)
  totalPrice?: number;  // Calculado: noches * pricePerNight
  createdAt: string;
}
