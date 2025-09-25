import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PetsService } from '@features/pets/services';
import { Pet, PetSize, PetType } from '@features/pets/models';
import { AuthService } from '@core/auth';
import { AvatarComponent } from '@shared/ui';
/*
############################################
Name: PetsPage
Objetive: Drive the pets page experience.
Extra info: Coordinates routing context, data retrieval, and user actions.
############################################
*/


@Component({
  selector: 'ph-pets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarComponent],
  template: `
  <div class="wrap">
    <div class="header">
      <h2>Mis Mascotas</h2>
      <button class="primary" (click)="toggleForm()">{{ showForm() ? 'Cerrar' : 'Agregar Mascota' }}</button>
    </div>

    <section class="card" *ngIf="showForm()">
      <form [formGroup]="form" (ngSubmit)="create()" class="pet-form">
        <h3>Agregar Mascota</h3>

        <div class="grid-form">
          <label>
            <span>Nombre</span>
            <input formControlName="name" placeholder="Ej: Luna" />
            <small class="err" *ngIf="fc('name').touched && fc('name').invalid">Ingresa entre 2 y 60 caracteres.</small>
          </label>

          <label>
            <span>Tipo</span>
            <select formControlName="type">
              <option value="DOG">Perro</option>
              <option value="CAT">Gato</option>
            </select>
          </label>

          <label>
            <span>Tamano</span>
            <select formControlName="size">
              <option value="SMALL">Pequeno</option>
              <option value="MEDIUM">Mediano</option>
              <option value="LARGE">Grande</option>
            </select>
          </label>

          <label>
            <span>Raza (opcional)</span>
            <input formControlName="breed" placeholder="Ej: Mestizo" />
            <small class="muted">Hasta 40 caracteres.</small>
          </label>

          <label>
            <span>Calendario de vacunas (URL)</span>
            <input formControlName="vaccineCalendarUrl" placeholder="https://..." />
            <small class="err" *ngIf="fc('vaccineCalendarUrl').touched && fc('vaccineCalendarUrl').invalid">Debe comenzar con http(s)://</small>
          </label>

          <label class="file">
            <span>Foto</span>
            <input type="file" accept="image/png,image/jpeg" (change)="onFileSelected($event)" />
            <small class="muted">JPG o PNG, max 2MB.</small>
          </label>

          <div class="preview" *ngIf="previewUrl()">
            <img [src]="previewUrl()!" alt="Previsualizacion" />
          </div>

          <label class="notes">
            <span>Descripcion / Bio</span>
            <textarea formControlName="notes" rows="3" placeholder="Contanos sobre tu mascota"></textarea>
            <small class="muted">Max 300 caracteres.</small>
          </label>
        </div>

        <div class="actions">
          <button type="submit" class="primary" [disabled]="form.invalid || creating">{{ creating ? 'Guardando...' : 'Guardar Mascota' }}</button>
        </div>
      </form>
    </section>

    <section class="list">
      <div *ngIf="pets().length === 0" class="empty card">
        Aun no cargaste mascotas. !Agrega la primera!
      </div>
      <article class="pet-card card" *ngFor="let p of pets()">
        <div class="media">
          <img *ngIf="p.photoUrl" class="photo" [src]="p.photoUrl" [alt]="'Foto de ' + p.name"/>
          <app-avatar *ngIf="!p.photoUrl" [src]="null" [name]="p.name" size="md"></app-avatar>
        </div>
        <div class="content">
          <div class="title">{{ p.name }}</div>
          <div class="chips">
            <span class="chip type">{{ mapType(p.type) }}</span>
            <span class="chip size">{{ mapSize(p.size) }}</span>
          </div>
          <div *ngIf="p.breed" class="row"><span class="lbl">Raza:</span> <span>{{ p.breed }}</span></div>
          <div *ngIf="p.notes" class="row"><span class="lbl">Bio:</span> <span class="bio">{{ p.notes }}</span></div>
          <div *ngIf="p.vaccineCalendarUrl" class="row"><span class="lbl">Vacunas:</span> <a [href]="p.vaccineCalendarUrl" target="_blank" rel="noopener">Ver calendario</a></div>
        </div>
        <div class="end">
          <button class="danger" (click)="remove(p)">Eliminar</button>
        </div>
      </article>
    </section>
  </div>
  `,
  styles: [`
    .wrap{ padding:16px; display:grid; gap:16px }
    .header{ display:flex; justify-content:space-between; align-items:center }
    h2{ margin:0 }
    .card{ background:#fff; border:1px solid #e6e6e6; border-radius:12px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.05) }
    .pet-form{ display:grid; gap:14px }
    .grid-form{ display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; align-items:start }
    .grid-form .notes{ grid-column: 1 / -1 }
    label{ display:grid; gap:6px; font-weight:600; color:#374151 }
    input, select, textarea{ padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font: inherit }
    input:focus, select:focus, textarea:focus{ outline:2px solid #0ea5e9; border-color:#0ea5e9 }
    .notes textarea{ resize: vertical }
    .file input{ padding:6px }
    .err{ color:#b91c1c; font-weight:500 }
    .muted{ color:#6b7280 }
    .actions{ display:flex; gap:8px }
    button{ cursor:pointer; padding:10px 14px; border-radius:8px; border:1px solid #d1d5db; background:#f9fafb }
    .primary{ background:#0ea5e9; border-color:#0ea5e9; color:#fff; font-weight:600 }
    .danger{ background:#fee2e2; border-color:#fecaca; color:#b91c1c }
    .ghost{ background:transparent }

    .list{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); }
    @media (max-width: 760px){ .grid-form{ grid-template-columns: 1fr } .list{ grid-template-columns: 1fr } }

    .empty{ text-align:center; color:#6b7280 }

    .pet-card{ display:grid; grid-template-columns: 84px 1fr auto; gap:12px; align-items:flex-start }
    .media{ width:84px; height:84px; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#f3f4f6 }
    .photo{ width:100%; height:100%; object-fit:cover }
    .title{ font-weight:700; font-size:1.05rem; margin-bottom:4px }
    .chips{ display:flex; gap:6px; margin: 4px 0 8px }
    .chip{ padding:2px 8px; border-radius:999px; font-size:.8rem; border:1px solid #e5e7eb; color:#374151 }
    .chip.type{ background:#ecfeff; border-color:#a5f3fc; color:#0369a1 }
    .chip.size{ background:#f5f3ff; border-color:#ddd6fe; color:#4c1d95 }
    .row{ display:flex; gap:8px; align-items:baseline }
    .lbl{ color:#6b7280; font-size:.9rem }
    .bio{ white-space: pre-line }
    .preview{ width:140px; height:140px; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center }
    .preview img{ width:100%; height:100%; object-fit:cover }
  `]
})
export class PetsPage {
  private service = inject(PetsService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  pets = signal<Pet[]>([]);
  creating = false;
  showForm = signal(false);
  previewUrl = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    type: ['DOG' as PetType, Validators.required],
    size: ['MEDIUM' as PetSize, Validators.required],
    breed: ['', [Validators.maxLength(40)]],
    vaccineCalendarUrl: ['', [this.urlOrEmpty]],
    notes: ['', [Validators.maxLength(300)]],
    photoUrl: ['']
  });

  ownerKey = computed(() => {
    const u = this.auth.user();
    // En el mock, ownerId es una string tipo "u1"
    return u?.id != null ? `u${u.id}` : 'u0';
  });

  ngOnInit(){
    const ownerId = this.ownerKey();
    this.service.list(ownerId).subscribe(p => this.pets.set(p || []));
  }

  mapType(t: PetType){ return t === 'DOG' ? 'Perro' : 'Gato'; }
  mapSize(s: PetSize){ return s === 'SMALL' ? 'Pequeno' : s === 'MEDIUM' ? 'Mediano' : 'Grande'; }

  onFileSelected(event: Event){
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Validaciones de imagen
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) { alert('Formato no soportado. Usa JPG o PNG.'); input.value=''; return; }
    if (file.size > 2 * 1024 * 1024) { alert('La imagen supera 2MB.'); input.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.form.patchValue({ photoUrl: dataUrl });
      this.previewUrl.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  create(){
    if (this.form.invalid || this.creating) return;
    this.creating = true;
    const payload: Partial<Pet> = {
      ...this.sanitize(this.form.getRawValue()),
      ownerId: this.ownerKey(),
    } as Partial<Pet>;
    this.service.create(payload).subscribe({
      next: (created) => {
        this.pets.update(list => [created, ...list]);
        this.resetForm();
        this.creating = false;
      },
      error: () => { this.creating = false; }
    });
  }

  remove(p: Pet){
    if (!confirm(`?Eliminar a ${p.name}?`)) return;
    this.service.delete(p.id).subscribe(() => {
      this.pets.update(list => list.filter(x => x.id !== p.id));
    });
  }

  // Helpers
  fc(name: keyof typeof this.form.controls){ return this.form.controls[name]; }
  toggleForm(){ this.showForm.update(v => !v); }
  resetForm(){ this.form.reset({ type: 'DOG', size: 'MEDIUM' }); this.previewUrl.set(null); }
  urlOrEmpty(control: any){
    const val = (control?.value || '').trim();
    if (!val) return null;
    return /^https?:\/\//i.test(val) ? null : { url: true };
  }
  sanitize(raw: any){
    const trim = (s: any) => (typeof s === 'string' ? s.trim() : s);
    return {
      name: trim(raw.name),
      type: raw.type === 'DOG' || raw.type === 'CAT' ? raw.type : 'DOG',
      size: ['SMALL','MEDIUM','LARGE'].includes(raw.size) ? raw.size : 'MEDIUM',
      breed: trim(raw.breed) || undefined,
      vaccineCalendarUrl: trim(raw.vaccineCalendarUrl) || undefined,
      notes: trim(raw.notes) || undefined,
      photoUrl: trim(raw.photoUrl) || undefined,
    } as Partial<Pet>;
  }
}

