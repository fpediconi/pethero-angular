// src/app/bookings/list/bookings-history-panel.component.ts
import {
  Component,
  effect,
  inject,
  input,
  Output,
  EventEmitter,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { BookingsHistoryService } from "@features/bookings/services";
import { BookingSummary, HistoryQuery, HistoryStatus } from "@features/bookings/models";
import { exportBookingsCsv } from "@features/bookings/utils";
import { debounceTime } from "rxjs/operators";
import { RouterLink } from '@angular/router';
/*
############################################
Name: BookingsHistoryPanelComponent
Objetive: Render and orchestrate the bookings history panel component.
Extra info: Handles bindings, events, and view state.
############################################
*/


@Component({
  selector: "ph-bookings-history-panel",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrls: ["./bookings-history-panel.component.css"],
  templateUrl: "./bookings-history-panel.component.html",
})
export class BookingsHistoryPanelComponent {
  private fb = inject(FormBuilder);
  private api = inject(BookingsHistoryService);

  // QUIEN VE (define columnas)
  roleView = input.required<"GUARDIAN" | "OWNER">();

  // Eventos para enganchar acciones del host 
  @Output() viewProfile = new EventEmitter<BookingSummary>();
  @Output() cancel = new EventEmitter<BookingSummary>();

  // Estado UI
  statuses: HistoryStatus[] = [
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "FINISHED",
  ];
  pageSizes = [10, 25, 50, 100];

  form = this.fb.group({
    q: [""],
    from: [""],
    to: [""],
    status: ["ANY" as "ANY" | HistoryStatus],
  });

  private _page = signal(0);
  private _pageSize = signal(10);

  items = signal<BookingSummary[]>([]);
  total = signal(0);
  page = this._page.asReadonly();
  pageSize = this._pageSize.asReadonly();
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  
  /*
  ############################################
  Name: constructor
  Objetive: Manage the constructor workflow.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  constructor() {
    // Rebuscar ante cambios de filtros
    this.form.valueChanges.pipe(debounceTime(250)).subscribe(() => {
      this._page.set(0);
      this.loadIfReady();
    });

    // Rebuscar ante cambios de pagina/tamano
    effect(() => {
      void this._page();
      void this._pageSize();
      this.loadIfReady();
    });

    effect(() => {
      try {
        void this.roleView();
        this._page.set(0);
        this.loadIfReady();
      } catch { /* todavia no hay input; ignorar */ }
    });
  }

  private loadIfReady() {
    let role: 'OWNER'|'GUARDIAN';
    try {
      role = this.roleView();   // solo sigue si ya esta el input
    } catch { return; }
    this.load();
  }


  private buildQuery(): HistoryQuery {
    const f = this.form.getRawValue();
    return {
      page: this._page(),
      pageSize: this._pageSize(),
      roleView: this.roleView(),
      q: f.q?.trim() || undefined,
      status: f.status || "ANY",
      from: f.from || undefined,
      to: f.to || undefined,
    };
  }

  private load() {
    const qry = this.buildQuery();
    this.api.search(qry).subscribe((res) => {
      this.items.set(res.items);
      this.total.set(res.total);
    });
  }

  resetFilters() {
    this.form.reset({ q: "", from: "", to: "", status: "ANY" });
  }

  prev() {
    if (this._page() > 0) this._page.set(this._page() - 1);
  }
  next() {
    if (this._page() + 1 < this.totalPages()) this._page.set(this._page() + 1);
  }

  onPageSizeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.setPageSize(value);
  }

  setPageSize(v: string) {
    const n = parseInt(v, 10) || 10;
    this._pageSize.set(n);
    this._page.set(0);
  }

  exportCsv() {
    const rows = this.items().map((r) => ({
      id: r.id,
      codigo: r.code ?? "",
      inicio: r.startDate,
      fin: r.endDate,
      noches: r.nights ?? "",
      mascota: r.petName ?? "",
      guardian: r.guardianName,
      dueno: r.ownerName,
      estado: r.status,
      total: r.total,
      creado: r.createdAt ?? "",
    }));
    exportBookingsCsv(rows, "historial_reservas.csv");
  }

  track = (_: number, r: BookingSummary) => r.id;
}


