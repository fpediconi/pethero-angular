export type BookingStatus =
  | 'REQUESTED'     // Pendiente
  | 'ACCEPTED'      // Aceptada (por el guardian)
  | 'REJECTED'      // Rechazada (por el guardian)
  | 'CANCELLED'     // Cancelada (por dueno)
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
