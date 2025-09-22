import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { AuthService } from "@core/auth";
import { ProfileService } from "@core/profile";
import { Profile } from "@shared/models";
import { toSignal } from "@angular/core/rxjs-interop";
import { startWith } from "rxjs/operators";
import { CurrentProfileService } from "@core/profile";
import { GuardiansService } from "@features/guardians/services";
import { PetType } from "@features/pets/models";

@Component({
  standalone: true,
  selector: "app-profile-form",
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ["./profile-form.component.css"],
  templateUrl: "./profile-form.component.html",
})
export class ProfileFormComponent implements OnInit {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  private profiles = inject(ProfileService);
  private currentProfile = inject(CurrentProfileService);
  private guardians = inject(GuardiansService);

  loading = signal(false);
  message = signal<string | null>(null);
  submitted = signal(false);
  original = signal<Profile | null>(null);
  isGuardian = computed(() => this.auth.user()?.role === "guardian");

  // Guardian specific state
  guardianId = computed(() => String(this.auth.user()?.id || ""));
  pricePerNight = signal<number | null>(null);
  acceptedTypes = signal<PetType[]>([]);
  // Disponibilidad removida del perfil (se gestiona en /guardian/availability)

  form = this.fb.group({
    id: [undefined as number | undefined],
    userId: [0, [Validators.required]],
    displayName: ["", [Validators.required, Validators.minLength(2)]],
    phone: ["", [Validators.pattern(/^[0-9+()\s-]{6,}$/)]],
    location: [""],
    bio: ["", [Validators.maxLength(280)]],
    avatarUrl: [""],
  });

  // Live signals from form controls
  private bioText = toSignal(
    this.form
      .get("bio")!
      .valueChanges.pipe(startWith(this.form.get("bio")!.value || "")),
    { initialValue: "" as string },
  );
  private avatarText = toSignal(
    this.form
      .get("avatarUrl")!
      .valueChanges.pipe(startWith(this.form.get("avatarUrl")!.value || "")),
    { initialValue: "" as string },
  );
  private nameText = toSignal(
    this.form
      .get("displayName")!
      .valueChanges.pipe(startWith(this.form.get("displayName")!.value || "")),
    { initialValue: "" as string },
  );

  avatarUrl = computed(() => (this.avatarText() || "").trim());
  bioLength = computed(() => (this.bioText() || "").length);
  initials = computed(() => {
    const name = (this.nameText() || "").trim();
    if (!name) return "PH";
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user?.id) return;

    this.form.patchValue({ userId: user.id });

    this.profiles.getByUserId(user.id).subscribe((list) => {
      const found = list[0];
      if (found) {
        this.form.patchValue(found);
        this.original.set(found);
      }
    });

    // Load guardian data
    if (this.isGuardian()) {
      const id = String(user.id);
      this.guardians.getProfile(id).subscribe((g) => {
        this.pricePerNight.set((g as any).pricePerNight ?? null);
        this.acceptedTypes.set(g.acceptedTypes || []);
      });
      // Disponibilidad se gestiona desde "Mi disponibilidad"
    }
  }

  reset() {
    const orig = this.original();
    if (orig) this.form.reset({ ...orig });
    this.submitted.set(false);
  }

  toggleType(type: PetType, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.acceptedTypes());
    checked ? next.add(type) : next.delete(type);
    this.acceptedTypes.set(Array.from(next));
  }

  // addSlot/removeSlot removidos

  onPriceInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const v = el.valueAsNumber;
    this.pricePerNight.set(Number.isFinite(v) ? v : null);
  }

  save() {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.loading.set(true);
    this.message.set(null);

    const value = this.form.getRawValue() as Profile;

    const request$ = value.id
      ? this.profiles.update(value)
      : this.profiles.create(value);

    request$.subscribe({
      next: (p) => {
        this.form.patchValue(p);
        this.original.set(p);
        this.currentProfile.setProfile(p);
        // If guardian, persist guardian profile
        if (this.isGuardian()) {
          const guardianId = this.guardianId();
          const typedPrice = this.pricePerNight();
          const price =
            typeof typedPrice === "number" && !Number.isNaN(typedPrice)
              ? typedPrice
              : 0;
          // Sincroniza también los campos visibles en la búsqueda/perfil de guardianes
          // para evitar desajustes entre /profiles y /guardians
          const gp = {
            id: guardianId,
            name: p.displayName, // nombre visible del perfil
            avatarUrl: p.avatarUrl, // avatar visible del perfil
            bio: p.bio,
            pricePerNight: price,
            acceptedTypes: this.acceptedTypes(),
            acceptedSizes: ["SMALL", "MEDIUM", "LARGE"] as any,
            city: p.location || "",
          } as any;
          this.guardians.upsertProfile(gp).subscribe({
            next: () => {
              this.loading.set(false);
              this.message.set("Perfil guardado");
              setTimeout(() => this.message.set(null), 2500);
            },
            error: (e) => {
              console.error(e);
              this.loading.set(false);
              this.message.set("No se pudo guardar datos de guardián");
            },
          });
          return;
        }
        this.loading.set(false);
        this.message.set("Perfil guardado");
        setTimeout(() => this.message.set(null), 2500);
      },
      error: (e) => {
        this.loading.set(false);
        this.message.set("No se pudo guardar el perfil");
        console.error(e);
      },
    });
  }
}

