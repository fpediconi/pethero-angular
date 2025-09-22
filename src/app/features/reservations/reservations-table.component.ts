import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  BookingHistoryItem,
  BookingHistoryRole,
} from "@features/bookings/services";

@Component({
  selector: "ph-reservations-table",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./reservations-table.component.html",
  styleUrls: ["./reservations-table.component.css"],
})
export class ReservationsTableComponent {
  @Input() items: BookingHistoryItem[] = [];
  @Input() role: BookingHistoryRole = "OWNER";
  @Input() loading = false;
  @Output() view = new EventEmitter<BookingHistoryItem>();
  @Output() cancel = new EventEmitter<BookingHistoryItem>();

  counterpartHeader() {
    return this.role === "OWNER" ? "Guardi�n" : "Due�o";
  }

  statusLabel(status: string) {
    const map: Record<string, string> = {
      REQUESTED: "Solicitada",
      ACCEPTED: "Aceptada",
      REJECTED: "Rechazada",
      CANCELLED: "Cancelada",
      CONFIRMED: "Confirmada",
      IN_PROGRESS: "En curso",
      COMPLETED: "Completada",
    };
    return map[status] || status;
  }

  canCancel(item: BookingHistoryItem) {
    if (this.role !== "OWNER") return false;
    const allowed = new Set([
      "REQUESTED",
      "ACCEPTED",
      "CONFIRMED",
      "IN_PROGRESS",
    ]);
    return allowed.has(item.booking.status);
  }
}

