import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AvailabilityService } from "@features/guardians/services";
/*
############################################
Name: AvailabilityCalendar3Component
Objetive: Render and orchestrate the availability calendar3 component.
Extra info: Handles bindings, events, and view state.
############################################
*/


@Component({
  selector: "ph-availability-calendar3",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./availability-calendar3.component.html",
  styleUrls: ["./availability-calendar3.component.css"],
})
export class AvailabilityCalendar3Component implements OnChanges {
  private availability = inject(AvailabilityService);

  @Input() guardianId!: string;

  month = signal<number>(new Date().getMonth());
  year = signal<number>(new Date().getFullYear());
  capMap = signal<Record<string, number>>({});
  occMap = signal<Record<string, number>>({});
  bookings = signal<any[]>([]);
  ownerNames = signal<Record<string, string>>({});
  petsMap = signal<
    Record<string, { name: string; type: string; size?: string }>
  >({});
  selectedDay = signal<string | null>(null);
  weekdays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["guardianId"]) this.load();
  }
  monthLabel() {
    const d = new Date(this.year(), this.month(), 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  private rangeUTC() {
    const s = new Date(this.year(), this.month(), 1);
    const e = new Date(this.year(), this.month() + 1, 1);
    return { startUTC: s.toISOString(), endUTC: e.toISOString() };
  }

  
  /*
  ############################################
  Name: load
  Objetive: Load required data.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  private load() {
    if (!this.guardianId) return;
    const { startUTC, endUTC } = this.rangeUTC();
    this.availability
      .computeDailyAvailability({
        guardianId: this.guardianId,
        startUTC,
        endUTC,
      })
      .subscribe(({ cap, occ }) => {
        this.capMap.set(cap);
        this.occMap.set(occ);
      });
    this.availability.listBookingsRaw(this.guardianId).subscribe((list) => {
      const arr = (list || []).filter((b: any) =>
        ["ACCEPTED", "CONFIRMED"].includes(b.status),
      );
      this.bookings.set(arr);
      const ownerIds = Array.from(
        new Set(arr.map((b: any) => String(b.ownerId))),
      );
      const petIds = Array.from(new Set(arr.map((b: any) => String(b.petId))));
      ownerIds.forEach((id) =>
        this.availability["api"]
          .get<any[]>("/profiles", { userId: id })
          .subscribe((resp) =>
            this.ownerNames.set({
              ...this.ownerNames(),
              [id]: String((resp && resp[0]?.displayName) || id),
            }),
          ),
      );
      petIds.forEach((pid) =>
        this.availability["api"]
          .get<any[]>("/pets", { id: pid })
          .subscribe((resp) => {
            const p = resp && resp[0];
            if (p)
              this.petsMap.set({
                ...this.petsMap(),
                [pid]: { name: p.name, type: p.type, size: p.size },
              });
          }),
      );
    });
  }

  prevMonth() {
    const m = this.month();
    if (m === 0) {
      this.month.set(11);
      this.year.set(this.year() - 1);
    } else {
      this.month.set(m - 1);
    }
    this.load();
  }
  nextMonth() {
    const m = this.month();
    if (m === 11) {
      this.month.set(0);
      this.year.set(this.year() + 1);
    } else {
      this.month.set(m + 1);
    }
    this.load();
  }

  gridDays = computed(() => {
    const first = new Date(this.year(), this.month(), 1);
    const startIdx = (first.getDay() + 6) % 7;
    const startGrid = new Date(this.year(), this.month(), 1 - startIdx);
    const cells: {
      date: Date;
      inMonth: boolean;
      dayNum: number;
      key: string;
      state: "open" | "reserved" | "closed";
    }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(
        startGrid.getFullYear(),
        startGrid.getMonth(),
        startGrid.getDate() + i,
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const hasBlock = (this.capMap()[key] || 0) > 0;
      const hasBooking = this.bookingsForDay(key).length > 0;
      const state = hasBooking ? "reserved" : hasBlock ? "open" : "closed";
      cells.push({
        date: d,
        inMonth: d.getMonth() === this.month(),
        dayNum: d.getDate(),
        key,
        state,
      });
    }
    return cells;
  });

  bookingsForDay(dayKey: string) {
    const start = dayKey + "T00:00:00Z";
    const end = new Date(
      new Date(start).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    return (this.bookings() || []).filter(
      (b) => b.start < end && start < b.end,
    );
  }
  bookingLabels(dayKey: string) {
    return this.bookingsForDay(dayKey)
      .map((b: any) => {
        const owner = this.ownerNames()[String(b.ownerId)] || String(b.ownerId);
        const pet = this.petsMap()[String(b.petId)];
        const petName = pet?.name || String(b.petId);
        const petType = pet?.type || "";
        return `${owner} - ${petName}${petType ? " (" + petType + ")" : ""}`;
      })
      .slice(0, 3);
  }
  petName(pid: string) {
    return this.petsMap()[pid]?.name || pid;
  }
  petType(pid: string) {
    return this.petsMap()[pid]?.type || "";
  }
  ownerLabel(b: any) {
    const id = String(b?.ownerId ?? "");
    return this.ownerNames()[id] || id;
  }
  petLabel(b: any) {
    const pid = String(b?.petId ?? "");
    const p = this.petsMap()[pid];
    return p ? `${p.name}${p.type ? " (" + p.type + ")" : ""}` : pid;
  }
  toDateStr(v: any) {
    try {
      return v ? new Date(v).toISOString() : "";
    } catch {
      return "";
    }
  }
  selectDay(cell: { key: string }) {
    this.selectedDay.set(cell.key);
  }

  refreshCurrentRange() {
    this.load();
  }
}

