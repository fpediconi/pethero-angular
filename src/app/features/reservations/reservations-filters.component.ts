import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BookingStatus } from "@features/bookings/models";

export interface ReservationsFiltersValue {
  states: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  q?: string | null;
}

export interface ReservationStatusOption {
  value: BookingStatus;
  label: string;
}

@Component({
  selector: "ph-reservations-filters",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./reservations-filters.component.html",
  styleUrls: ["./reservations-filters.component.css"],
})
export class ReservationsFiltersComponent implements OnChanges {
  @Input() statuses: ReservationStatusOption[] = [];
  @Input() value: ReservationsFiltersValue = {
    states: [],
    dateFrom: null,
    dateTo: null,
    q: null,
  };
  @Output() search = new EventEmitter<ReservationsFiltersValue>();
  @Output() clear = new EventEmitter<void>();

  selectedStates: string[] = [];
  dateFrom: string | null = null;
  dateTo: string | null = null;
  searchTerm = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] && this.value) {
      this.selectedStates = [...(this.value.states || [])];
      this.dateFrom = this.value.dateFrom || null;
      this.dateTo = this.value.dateTo || null;
      this.searchTerm = this.value.q || "";
    }
  }

  isStateSelected(status: string) {
    return this.selectedStates.includes(status);
  }

  onStatusToggle(status: string, checked?: boolean | null) {
    const next = new Set(this.selectedStates);
    if (checked) {
      next.add(status);
    } else {
      next.delete(status);
    }
    this.selectedStates = Array.from(next);
  }

  onSubmit() {
    this.search.emit({
      states: this.selectedStates,
      dateFrom: this.dateFrom || null,
      dateTo: this.dateTo || null,
      q: this.searchTerm ? this.searchTerm.trim() : null,
    });
  }

  onClear() {
    this.selectedStates = [];
    this.dateFrom = null;
    this.dateTo = null;
    this.searchTerm = "";
    this.clear.emit();
  }
}

