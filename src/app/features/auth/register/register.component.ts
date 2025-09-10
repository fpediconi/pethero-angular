import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { UserRole } from '../../../shared/models/user.model';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  styles: [`
    :host { display:block; }
    .container{max-width:520px;margin:48px auto;padding:0 16px;}
    .title{font-size:28px;font-weight:800;letter-spacing:.2px;margin:0 0 16px}
    form.card{
      padding:20px;border-radius:16px;background:#fff;
      box-shadow:0 10px 30px rgba(0,0,0,.06),0 2px 10px rgba(0,0,0,.04);
      transition:transform .2s ease, box-shadow .2s ease;
    }
    form.card:focus-within{ transform:translateY(-1px); box-shadow:0 12px 36px rgba(0,0,0,.08),0 4px 14px rgba(0,0,0,.05); }
    label{display:block;font-weight:600;margin:12px 0 6px}
    .hint{font-size:.84rem;color:#6b7280;margin-top:4px}
    input, select{
      width:100%;padding:12px 12px;border:1px solid #e5e7eb;border-radius:10px;
      outline:none;background:#fafafa;transition:border-color .15s ease, background .15s ease;
      font-size:15px;
    }
    input:focus, select:focus{border-color:#22c55e;background:#fff;box-shadow:0 0 0 3px rgba(34,197,94,.12)}
    .field{margin-bottom:10px}
    .error{color:#b00020;font-size:.9rem;margin-top:6px}
    .ctrl-error{border-color:#b00020;background:#fffafa}
    .chip{
      display:inline-flex;gap:6px;align-items:center;
      padding:8px 12px;border-radius:999px;border:1px dashed #cbd5e1;background:#f8fafc;color:#334155;
      font-size:.92rem
    }
    .actions{display:flex;gap:12px;align-items:center;margin-top:8px}
    button{
      appearance:none;border:0;border-radius:12px;padding:12px 16px;font-weight:700;
      background:#22c55e;color:#fff;cursor:pointer;transition:transform .06s ease, opacity .2s ease, box-shadow .2s ease;
      box-shadow:0 6px 16px rgba(34,197,94,.25)
    }
    button:hover{transform:translateY(-1px)}
    button:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
    .ghost{background:transparent;color:#334155;border:1px solid #e5e7eb;box-shadow:none}
    .row{display:flex;gap:12px}
    .grow{flex:1}
    .spinner{
      width:16px;height:16px;border-radius:999px;border:2px solid #fff;border-right-color:transparent;display:inline-block;vertical-align:-3px;
      animation:spin .6s linear infinite;margin-right:8px
    }
    @keyframes spin{to{transform:rotate(1turn)}}
    .global-error{color:#b00020;margin-top:12px}
    .fade-in{animation:fade .2s ease}
    @keyframes fade{from{opacity:.6;transform:translateY(2px)}to{opacity:1;transform:none}}
  `],
  template: `
    <div class="container">
      <h1 class="title">Crear cuenta</h1>

      <form class="card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" inputmode="email" autocomplete="email"
                 [class.ctrl-error]="invalid(email)"
                 formControlName="email" placeholder="tu@email.com" />
          <div class="error fade-in" *ngIf="invalid(email)">
            {{ email.errors?.['required'] ? 'El email es obligatorio' : 'Formato de email inválido' }}
          </div>
        </div>

        <div class="field">
          <div class="row">
            <label class="grow" for="password">Contraseña</label>
            <span class="hint">mín. 6 caracteres</span>
          </div>
          <input id="password" type="password" autocomplete="new-password"
                 [class.ctrl-error]="invalid(password)"
                 formControlName="password" placeholder="••••••••" />
          <div class="error fade-in" *ngIf="invalid(password)">
            {{ password.errors?.['required'] ? 'La contraseña es obligatoria' : 'Mínimo 6 caracteres' }}
          </div>
        </div>

        <div class="field">
          <label>Rol</label>
          <ng-container *ngIf="!prelockedRole; else lockedRole">
            <select [class.ctrl-error]="invalid(role)" formControlName="role">
              <option value="owner">Dueño/a</option>
              <option value="guardian">Guardian</option>
            </select>
          </ng-container>
          <ng-template #lockedRole>
            <div class="chip" title="Rol preseleccionado">
              {{ role.value === 'owner' ? 'Dueño/a' : 'Guardian' }} · preseleccionado
            </div>
          </ng-template>
        </div>

        <div class="field">
          <label for="displayName">Nombre para mostrar</label>
          <input id="displayName" type="text" autocomplete="nickname"
                 [class.ctrl-error]="invalid(displayName)"
                 formControlName="displayName" placeholder="¿Cómo te mostramos?" />
          <div class="error fade-in" *ngIf="invalid(displayName)">
            {{ displayName.errors?.['required'] ? 'Este campo es obligatorio' : 'Mínimo 2 caracteres' }}
          </div>
        </div>

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || loading()">
            <span *ngIf="loading()" class="spinner"></span>
            {{ loading() ? 'Creando...' : 'Crear cuenta' }}
          </button>
          <button type="button" class="ghost" [disabled]="loading()" (click)="form.reset(defaultValues)">
            Limpiar
          </button>
        </div>

        <p *ngIf="error()" class="global-error">{{ error() }}</p>
      </form>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private profiles = inject(ProfileService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  /** si vino un rol por ruta, se bloquea el selector */
  prelockedRole = false;

  defaultValues = {
    email: '',
    password: '',
    role: 'owner' as UserRole,
    displayName: '',
  };

  form = this.fb.group({
    email: this.fb.control(this.defaultValues.email, { validators: [Validators.required, Validators.email], nonNullable: true }),
    password: this.fb.control(this.defaultValues.password, { validators: [Validators.required, Validators.minLength(6)], nonNullable: true }),
    role:     this.fb.control<UserRole>(this.defaultValues.role, { nonNullable: true }),
    displayName: this.fb.control(this.defaultValues.displayName, { validators: [Validators.required, Validators.minLength(2)], nonNullable: true }),
  });

  // getters cómodos
  get email()       { return this.form.controls.email as AbstractControl; }
  get password()    { return this.form.controls.password as AbstractControl; }
  get role()        { return this.form.controls.role as AbstractControl; }
  get displayName() { return this.form.controls.displayName as AbstractControl; }

  invalid = (c: AbstractControl) => c.invalid && (c.dirty || c.touched);

  ngOnInit(): void {
    // 1) rol por data (definido en auth/routes.ts)
    const dataRole = this.route.snapshot.data['role'] as UserRole | undefined;
    // 2) opcional: rol por query param (?role=owner|guardian)
    const qpRole = this.route.snapshot.queryParamMap.get('role') as UserRole | null;

    const preselected = (dataRole ?? qpRole ?? undefined) as UserRole | undefined;

    if (preselected) {
      this.form.patchValue({ role: preselected });
      this.form.get('role')?.disable({ emitEvent: false }); // se mantiene con getRawValue()
      this.prelockedRole = true;
    }
  }

  onSubmit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // role puede estar deshabilitado; getRawValue lo incluye
    const { email, password, displayName, role } = this.form.getRawValue();

    of(null).pipe(
      switchMap(() => this.auth.register({ email: email!, password: password!, role: role! as UserRole })),
      switchMap((user) => {
        return this.profiles.create({ userId: user.id!, displayName: displayName! })
          .pipe(switchMap(profile => {
            user.profileId = profile.id;
            this.auth.persistSession(user);
            return of({ user, role: role as UserRole });
          }));
      }),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ role }) => {
        // navegación suave según rol
        if (role === 'guardian') this.router.navigateByUrl('/me/profile');
        else this.router.navigateByUrl('/owners/pets');
      },
      error: (e) => {
        console.error(e);
        const msg = (typeof e?.message === 'string' && e.message.includes('email')) ?
          'Ese email ya está registrado' :
          'No se pudo crear la cuenta. Probá de nuevo.';
        this.error.set(msg);
      }
    });
  }
}
