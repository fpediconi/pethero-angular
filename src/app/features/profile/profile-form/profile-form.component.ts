import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { Profile } from '../../../shared/models/profile.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';
import { CurrentProfileService } from '../../../shared/services/current-profile.service';
import { GuardiansService } from '../../../guardians/guardians.service';
import { AvailabilityService } from '../../../shared/services/availability.service';
import { PetType } from '../../../shared/models/pet';

@Component({
  standalone: true,
  selector: 'app-profile-form',
  imports: [CommonModule, ReactiveFormsModule],
  styles: [`
    .wrapper{ max-width:960px; margin:32px auto; padding:0 16px }
    .header{ position:relative; background:linear-gradient(135deg,var(--brand),#79d1d9); border-radius:16px; padding:24px; color:#08323a; overflow:hidden }
    .header:after{ content:""; position:absolute; right:-40px; top:-40px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.25); filter:blur(2px) }
    .profile{ display:flex; align-items:center; gap:16px }
    .avatar-lg{ width:84px; height:84px; border-radius:50%; background:#e6f6f8; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border:3px solid rgba(255,255,255,.6) }
    .avatar-lg img{ width:100%; height:100%; object-fit:cover }
    .title{ margin:0; font-size:1.5rem; color:#08323a }
    .subtitle{ margin:2px 0 0; color:#0a505a; font-weight:500; opacity:.9; font-size:.95rem }

    .grid{ display:grid; grid-template-columns:1fr; gap:16px; margin-top:16px }
    @media (min-width: 768px){ .grid{ grid-template-columns:1.2fr .8fr } }

    .card{ background:#fff; border:1px solid #e6ecf1; border-radius:16px; padding:20px; box-shadow:0 6px 20px rgba(26,43,64,.06) }
    .card h2{ margin:0 0 6px; font-size:1.1rem }
    .muted{ color:#64748b; font-size:.9rem }

    form{ display:grid; gap:14px }
    .field{ display:grid; gap:6px }
    .row{ display:grid; gap:12px; grid-template-columns:1fr }
    @media (min-width: 640px){ .row{ grid-template-columns:1fr 1fr } }
    label{ font-weight:600; color:#334155 }
    input, textarea{ width:100%; padding:10px 12px; border:1px solid #cbd5df; border-radius:10px; background:#fbfdfe }
    textarea{ min-height:110px; resize:vertical }
    .hint{ color:#64748b; font-size:.85rem }
    .error{ color:#b00020; font-size:.85rem }

    .actions{ display:flex; gap:8px; justify-content:flex-end; align-items:center; margin-top:8px }
    .btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:1px solid transparent; cursor:pointer; font-weight:600 }
    .btn-primary{ background:var(--brand); color:#fff }
    .btn-ghost{ background:#fff; color:#0b6570; border-color:#d7e3ea }
    .btn[disabled]{ opacity:.6; cursor:not-allowed }

    .preview{ display:grid; gap:10px }
    .avatar-preview{ width:100%; max-width:180px; aspect-ratio:1/1; border-radius:14px; overflow:hidden; border:1px solid #e6ecf1; background:#f1f7f9; display:flex; align-items:center; justify-content:center }
    .avatar-preview img{ width:100%; height:100%; object-fit:cover }
    .kbd{ background:#eef2f7; border:1px solid #dbe3ea; border-bottom-width:2px; border-radius:6px; padding:2px 6px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.85em }

    .toast{ position:fixed; right:16px; bottom:16px; background:#0c7b86; color:#fff; padding:10px 14px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.2) }
    .saving{ display:inline-flex; width:14px; height:14px; border:2px solid rgba(255,255,255,.8); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite }
    @keyframes spin{ to{ transform:rotate(360deg) } }
  `],
  template: `
  <div class="wrapper">
    <div class="header card">
      <div class="profile">
        <div class="avatar-lg" aria-hidden="true">
          <img *ngIf="avatarUrl() as a" [src]="a" alt="Avatar" />
          <span *ngIf="!avatarUrl()">{{ initials() }}</span>
        </div>
        <div>
          <h1 class="title">{{ form.get('displayName')?.value || 'Tu nombre' }}</h1>
          <p class="subtitle">{{ auth.user()?.email }}</p>
        </div>
      </div>
    </div>

    <div class="grid">
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2>Información personal</h2>
        <p class="muted">Actualiza cómo te verán otros usuarios.</p>

        <div class="row">
          <div class="field">
            <label for="displayName">Nombre para mostrar</label>
            <input id="displayName" formControlName="displayName" placeholder="Ej. Ana Pérez" autocomplete="name" />
            <div class="error" *ngIf="submitted() && form.get('displayName')?.hasError('required')">Este campo es obligatorio.</div>
            <div class="error" *ngIf="submitted() && form.get('displayName')?.hasError('minlength')">Mínimo 2 caracteres.</div>
          </div>
          <div class="field">
            <label for="phone">Teléfono</label>
            <input id="phone" formControlName="phone" placeholder="Ej. +54 9 11 1234-5678" inputmode="tel" autocomplete="tel" />
            <div class="hint">Formato flexible. Incluye código de área.</div>
            <div class="error" *ngIf="submitted() && form.get('phone')?.hasError('pattern')">Solo números, espacios y + (mín. 6).</div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label for="location">Ubicación</label>
            <input id="location" formControlName="location" placeholder="Ciudad, País" autocomplete="address-level2" />
          </div>
          <div class="field">
            <label for="avatarUrl">Avatar URL</label>
            <input id="avatarUrl" formControlName="avatarUrl" placeholder="https://..." />
            <div class="hint">Pega un enlace a una imagen cuadrada.</div>
          </div>
        </div>

        <div class="field">
          <label for="bio">Bio</label>
          <textarea id="bio" formControlName="bio" placeholder="Contá algo sobre vos, experiencias con mascotas, etc."></textarea>
          <div class="hint">{{ bioLength() }}/280 caracteres</div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" (click)="reset()" [disabled]="loading()">Restablecer</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading()">
            <span *ngIf="loading()" class="saving" aria-hidden="true"></span>
            <span>{{ loading() ? 'Guardando...' : 'Guardar cambios' }}</span>
          </button>
        </div>
      </form>

      <aside class="card preview">
        <h2>Vista previa</h2>
        <div class="avatar-preview">
          <img *ngIf="avatarUrl() as a" [src]="a" alt="Vista previa de avatar" />
          <span *ngIf="!avatarUrl()" class="kbd">Sin imagen</span>
        </div>
        <div>
          <div><strong>{{ form.get('displayName')?.value || 'Tu nombre' }}</strong></div>
          <div class="muted">{{ form.get('location')?.value || 'Ubicación' }}</div>
          <p class="muted">{{ form.get('bio')?.value || 'Tu bio aparecerá aquí.' }}</p>
        </div>
      </aside>

      <!-- Guardian settings -->
      <aside class="card preview" *ngIf="isGuardian()">
        <h2>Configuración de guardián</h2>
        <div class="field">
          <label>Tipos de mascotas</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <label><input type="checkbox" [checked]="acceptedTypes().includes('DOG')" (change)="toggleType('DOG', $event)"/> Perros</label>
            <label><input type="checkbox" [checked]="acceptedTypes().includes('CAT')" (change)="toggleType('CAT', $event)"/> Gatos</label>
          </div>
          <div class="hint">Elegí qué tipos aceptás.</div>
        </div>

        <div class="field">
          <label for="price">Tarifa por noche (USD)</label>
          <input id="price" type="number" min="0" step="1" [value]="pricePerNight() ?? ''" (input)="onPriceInput($event)" />
        </div>

        <div class="field">
          <label>Disponibilidad</label>
          <div [formGroup]="newSlot" class="row">
            <div class="field">
              <label for="start">Desde</label>
              <input id="start" type="date" formControlName="start" />
            </div>
            <div class="field">
              <label for="end">Hasta</label>
              <input id="end" type="date" formControlName="end" />
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="addSlot()">Agregar rango</button>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
            <span class="badge" *ngFor="let s of slots(); let i = index">
              {{ s.start }} &rarr; {{ s.end }}
              <button type="button" class="linklike" (click)="removeSlot(i)" style="margin-left:6px">x</button>
            </span>
          </div>
          <div class="hint">Podés agregar múltiples rangos de fechas disponibles.</div>
        </div>
      </aside>

      
    </div>

    <div *ngIf="message()" class="toast">{{ message() }}</div>
  </div>
  `,
})
export class ProfileFormComponent implements OnInit {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  private profiles = inject(ProfileService);
  private currentProfile = inject(CurrentProfileService);
  private guardians = inject(GuardiansService);
  private availability = inject(AvailabilityService);

  loading = signal(false);
  message = signal<string | null>(null);
  submitted = signal(false);
  original = signal<Profile | null>(null);
  isGuardian = computed(() => this.auth.user()?.role === 'guardian');

  // Guardian specific state
  guardianId = computed(() => String(this.auth.user()?.id || ''));
  pricePerNight = signal<number | null>(null);
  acceptedTypes = signal<PetType[]>([]);
  slots = signal<{ start: string; end: string }[]>([]);
  newSlot = this.fb.group({ start: [''], end: [''] });

  form = this.fb.group({
    id: [undefined as number | undefined],
    userId: [0, [Validators.required]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.pattern(/^[0-9+()\s-]{6,}$/)]],
    location: [''],
    bio: ['', [Validators.maxLength(280)]],
    avatarUrl: [''],
  });

  // Live signals from form controls
  private bioText = toSignal(
    this.form.get('bio')!.valueChanges.pipe(startWith(this.form.get('bio')!.value || '')),
    { initialValue: '' as string }
  );
  private avatarText = toSignal(
    this.form.get('avatarUrl')!.valueChanges.pipe(startWith(this.form.get('avatarUrl')!.value || '')),
    { initialValue: '' as string }
  );
  private nameText = toSignal(
    this.form.get('displayName')!.valueChanges.pipe(startWith(this.form.get('displayName')!.value || '')),
    { initialValue: '' as string }
  );

  avatarUrl = computed(() => (this.avatarText() || '').trim());
  bioLength = computed(() => (this.bioText() || '').length);
  initials = computed(() => {
    const name = (this.nameText() || '').trim();
    if (!name) return 'PH';
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || '';
    return (a + b).toUpperCase();
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user?.id) return;

    this.form.patchValue({ userId: user.id });

    this.profiles.getByUserId(user.id).subscribe(list => {
      const found = list[0];
      if (found) {
        this.form.patchValue(found);
        this.original.set(found);
      }
    });

    // Load guardian data
    if (this.isGuardian()){
      const id = String(user.id);
      this.guardians.getProfile(id).subscribe(g => {
        this.pricePerNight.set((g as any).pricePerNight ?? null);
        this.acceptedTypes.set(g.acceptedTypes || []);
      });
      this.availability.listByGuardian(id).subscribe(list => {
        const items = (list || []).map(s => ({ start: s.start, end: s.end }));
        this.slots.set(items);
      });
    }
  }

  reset(){
    const orig = this.original();
    if (orig) this.form.reset({ ...orig });
    this.submitted.set(false);
  }

  toggleType(type: PetType, ev: Event){
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.acceptedTypes());
    checked ? next.add(type) : next.delete(type);
    this.acceptedTypes.set(Array.from(next));
  }

  addSlot(){
    const v = this.newSlot.getRawValue();
    if (!v.start || !v.end) return;
    const list = this.slots();
    this.slots.set([...list, { start: v.start, end: v.end }]);
    this.newSlot.reset();
  }

  removeSlot(i: number){
    const list = this.slots();
    this.slots.set(list.filter((_, idx) => idx !== i));
  }

  onPriceInput(ev: Event){
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
        // If guardian, persist guardian profile + availability
        if (this.isGuardian()){
          const guardianId = this.guardianId();
          const typedPrice = this.pricePerNight();
          const price = (typeof typedPrice === 'number' && !Number.isNaN(typedPrice)) ? typedPrice : 0;
          // Sincroniza también los campos visibles en la búsqueda/perfil de guardianes
          // para evitar desajustes entre /profiles y /guardians
          const gp = {
            id: guardianId,
            name: p.displayName,            // nombre visible del perfil
            avatarUrl: p.avatarUrl,         // avatar visible del perfil
            bio: p.bio,
            pricePerNight: price,
            acceptedTypes: this.acceptedTypes(),
            acceptedSizes: ['SMALL','MEDIUM','LARGE'] as any,
            city: p.location || ''
          } as any;
          const slotPayload = this.slots().map(s => ({ guardianId, start: s.start, end: s.end, acceptedSizes: ['SMALL','MEDIUM','LARGE'] as any }));
          this.guardians.upsertProfile(gp).subscribe({
            next: () => {
              this.availability.replaceForGuardian(guardianId, slotPayload).subscribe({
                next: () => {
                  this.loading.set(false);
                  this.message.set('Perfil guardado');
                  setTimeout(() => this.message.set(null), 2500);
                },
                error: (e) => {
                  console.error(e);
                  this.loading.set(false);
                  this.message.set('Perfil guardado con advertencias en disponibilidad');
                }
              });
            },
            error: (e) => {
              console.error(e);
              this.loading.set(false);
              this.message.set('No se pudo guardar datos de guardián');
            }
          });
          return;
        }
        this.loading.set(false);
        this.message.set('Perfil guardado');
        setTimeout(() => this.message.set(null), 2500);
      },
      error: (e) => {
        this.loading.set(false);
        this.message.set('No se pudo guardar el perfil');
        console.error(e);
      }
    });
  }
}
