import { CommonModule } from "@angular/common";
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "@core/auth";
import {
  BookingHistoryItem,
  BookingHistoryRole,
  BookingsService,
} from '@features/bookings/services';
import {
  ReservationsFiltersComponent,
  ReservationsFiltersValue,
  ReservationStatusOption,
} from "./reservations-filters.component";
import { ReservationsTableComponent } from "./reservations-table.component";

@Component({
  selector: "ph-reservations-page",
  standalone: true,
  imports: [
    CommonModule,
    ReservationsFiltersComponent,
    ReservationsTableComponent,
  ],
  templateUrl: "./reservations-page.component.html",
  styleUrls: ["./reservations-page.component.css"],
})
export class ReservationsPageComponent implements OnInit, OnDestroy {
  private bookings = inject(BookingsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly defaultPageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];

  readonly statusOptions: ReservationStatusOption[] = [
    { value: "REQUESTED", label: "Solicitada" },
    { value: "ACCEPTED", label: "Aceptada" },
    { value: "REJECTED", label: "Rechazada" },
    { value: "CANCELLED", label: "Cancelada" },
    { value: "CONFIRMED", label: "Confirmada" },
    { value: "IN_PROGRESS", label: "En curso" },
    { value: "COMPLETED", label: "Completada" },
  ];
  private readonly statusValues = new Set<string>(
    this.statusOptions.map((s) => s.value),
  );

  private paramsSub: Subscription | null = null;

  role = signal<BookingHistoryRole | null>(null);
  userId = signal<string | null>(null);

  filters = signal<ReservationsFiltersValue>({
    states: [],
    dateFrom: null,
    dateTo: null,
    q: null,
  });
  items = signal<BookingHistoryItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  exporting = signal(false);
  page = signal(1);
  pageSize = signal(this.defaultPageSize);
  total = signal(0);

  totalPages = computed(() => {
    const size = this.pageSize();
    const total = this.total();
    if (!size) return 1;
    return Math.max(1, Math.ceil(total / size));
  });

  rangeLabel = computed(() => {
    const total = this.total();
    if (!total) return "0";
    const page = this.page();
    const size = this.pageSize();
    const start = (page - 1) * size + 1;
    const end = Math.min(total, page * size);
    return `${start}-${end}`;
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user?.id) {
      this.error.set("Debes iniciar sesi�n para ver tus reservas.");
      return;
    }
    const role: BookingHistoryRole =
      user.role === "guardian" ? "GUARDIAN" : "OWNER";
    this.role.set(role);
    this.userId.set(String(user.id));

    this.paramsSub = this.route.queryParamMap.subscribe((params) =>
      this.applyParams(params),
    );
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe();
  }

  private applyParams(params: ParamMap) {
    if (!this.role() || !this.userId()) return;

    const rawStates = params.getAll("state");
    const states = (
      rawStates.length
        ? rawStates
        : params.get("state")
          ? [params.get("state")!]
          : []
    )
      .flatMap((s) => s.split(","))
      .map((s) => s.trim().toUpperCase())
      .filter((s) => this.statusValues.has(s));

    const dateFrom = params.get("from");
    const dateTo = params.get("to");
    const q = params.get("q");

    const page = this.ensurePage(params.get("page"));
    const pageSize = this.ensurePageSize(params.get("pageSize"));

    this.filters.set({ states, dateFrom, dateTo, q });
    this.page.set(page);
    this.pageSize.set(pageSize);

    if (this.syncUrl()) {
      return;
    }

    void this.loadHistory();
  }

  private ensurePage(value: string | null) {
    const num = Number(value ?? "1");
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
  }

  private ensurePageSize(value: string | null) {
    const num = Number(value ?? this.defaultPageSize);
    if (!Number.isFinite(num) || num <= 0) return this.defaultPageSize;
    const rounded = Math.floor(num);
    return this.pageSizeOptions.includes(rounded)
      ? rounded
      : this.defaultPageSize;
  }

  async loadHistory() {
    const role = this.role();
    const userId = this.userId();
    if (!role || !userId) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      const f = this.filters();
      const result = await this.bookings.searchHistory({
        role,
        userId,
        states: f.states,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        q: f.q || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.items.set(result.items);
      this.total.set(result.total);
      this.page.set(result.page);
      this.pageSize.set(result.pageSize);
    } catch (error: any) {
      this.error.set(
        error?.message || "No se pudo cargar el historial de reservas.",
      );
      this.items.set([]);
      this.total.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  onApplyFilters(value: ReservationsFiltersValue) {
    this.filters.set({
      states: value.states || [],
      dateFrom: value.dateFrom || null,
      dateTo: value.dateTo || null,
      q: value.q || null,
    });
    this.page.set(1);
    this.syncUrl();
  }

  onClearFilters() {
    this.filters.set({ states: [], dateFrom: null, dateTo: null, q: null });
    this.page.set(1);
    this.syncUrl();
  }

  goPrev() {
    if (this.page() <= 1) return;
    this.page.set(this.page() - 1);
    this.syncUrl();
  }

  goNext() {
    if (this.page() >= this.totalPages()) return;
    this.page.set(this.page() + 1);
    this.syncUrl();
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const size = Number(target.value || this.defaultPageSize);
    if (size === this.pageSize()) return;
    this.pageSize.set(this.ensurePageSize(String(size)));
    this.page.set(1);
    this.syncUrl();
  }

  async onExport() {
    const role = this.role();
    const userId = this.userId();
    if (!role || !userId) return;
    if (this.exporting()) return;

    this.exporting.set(true);
    try {
      const f = this.filters();
      await this.bookings.exportHistoryCsv({
        role,
        userId,
        states: f.states,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        q: f.q || undefined,
        page: 1,
        pageSize: this.pageSize(),
      });
    } catch (error: any) {
      this.error.set(error?.message || "No se pudo exportar el CSV.");
    } finally {
      this.exporting.set(false);
    }
  }

  onView(item: BookingHistoryItem) {
    // Fallback: redirige a la vista general de reservas existente
    this.router.navigate(["/bookings"], {
      queryParams: { focus: item.booking.id },
    });
  }

  onCancel(item: BookingHistoryItem) {
    if (!confirm("�Cancelar la reserva seleccionada?")) return;
    this.bookings.cancel(item.booking.id);
    setTimeout(() => {
      void this.loadHistory();
    }, 250);
  }

  private syncUrl(): boolean {
    const role = this.role();
    if (!role) return false;
    const queryParams = this.buildQueryParams(role);
    if (this.isCurrentQuery(queryParams)) return false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
    return true;
  }

  private buildQueryParams(role: BookingHistoryRole): Record<string, any> {
    const f = this.filters();
    return {
      role,
      page: this.page(),
      pageSize: this.pageSize(),
      state: f.states.length ? f.states.join(",") : null,
      from: f.dateFrom || null,
      to: f.dateTo || null,
      q: f.q && f.q.trim() ? f.q.trim() : null,
      tab: "history",
    };
  }

  private isCurrentQuery(target: Record<string, any>): boolean {
    const map = this.route.snapshot.queryParamMap;
    const keys = new Set([
      "role",
      "page",
      "pageSize",
      "state",
      "from",
      "to",
      "q",
      "tab",
    ]);
    Object.keys(target).forEach((key) => keys.add(key));
    for (const key of keys) {
      const desired = key in target ? target[key] : null;
      const normalized =
        desired === null || desired === undefined || desired === ""
          ? null
          : String(desired);
      const current = map.get(key);
      if (normalized === null) {
        if (current !== null) {
          return false;
        }
      } else if (current !== normalized) {
        return false;
      }
    }
    return true;
  }
}


