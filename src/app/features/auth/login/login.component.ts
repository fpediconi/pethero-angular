import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
  <div class="container" style="max-width:520px;margin:48px auto;padding:0 12px;">
    <h1 style="margin:0 0 20px;font-weight:700;font-size:2.2rem;color:#0f172a;">
      Iniciar sesiÃ³n
    </h1>

    <form [formGroup]="form" (ngSubmit)="onSubmit()"
          class="card"
          style="display:grid;gap:10px;padding:16px;border-radius:16px;box-shadow:0 6px 20px rgba(15,23,42,.08);background:#fff">

      <!-- Email -->
      <label style="font-weight:600;color:#334155;">Email</label>
      <input
        formControlName="email"
        type="email"
        placeholder="tu@email.com"
        autocomplete="username"
        style="width:100%;height:42px;border:1px solid #e2e8f0;border-radius:10px;padding:0 12px;outline:none;"
      />
      <small *ngIf="touched('email') && form.controls.email.invalid"
             style="color:#dc2626;">
        {{ form.controls.email.hasError('required') ? 'El email es obligatorio' : 'Formato de email invÃ¡lido' }}
      </small>

      <!-- Password -->
      <label style="font-weight:600;color:#334155;margin-top:6px;">ContraseÃ±a</label>
      <input
        formControlName="password"
        type="password"
        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
        autocomplete="current-password"
        style="width:100%;height:42px;border:1px solid #e2e8f0;border-radius:10px;padding:0 12px;outline:none;"
      />
      <small *ngIf="touched('password') && form.controls.password.invalid"
             style="color:#dc2626;">
        {{ form.controls.password.hasError('required') ? 'La contraseÃ±a es obligatoria' : 'MÃ­nimo 6 caracteres' }}
      </small>

      <!-- Error general -->
      <div *ngIf="error()" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px 12px;border-radius:10px;">
        {{ error() }}
      </div>

      <!-- BotÃ³n ingresar -->
      <button
        type="submit"
        [disabled]="form.invalid || loading()"
        style="margin-top:6px;height:40px;padding:0 16px;border:none;border-radius:10px;cursor:pointer;background:#0ea5b7;color:white;font-weight:600;display:inline-flex;align-items:center;gap:8px;">
        <span *ngIf="!loading(); else spinner">Ingresar</span>
      </button>

      <ng-template #spinner>
        <span class="sr-only">Cargandoâ€¦</span>
        <span style="width:16px;height:16px;border:2px solid #fff;border-right-color:transparent;border-radius:50%;display:inline-block;animation:spin .8s linear infinite;"></span>
      </ng-template>

      <div style="margin-top:8px;color:#475569">
        Â¿No tenÃ©s cuenta?
        <a [routerLink]="['/auth/register-owner']" style="color:#0ea5b7;text-decoration:none;">Crear cuenta (DueÃ±o/a)</a>
        Â·
        <a [routerLink]="['/auth/register-guardian']" style="color:#0ea5b7;text-decoration:none;">Crear cuenta (Guardian)</a>
      </div>
    </form>
  </div>
  `,
  styles: [`
    :host { display:block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  touched = (c: 'email'|'password') =>
    this.form.controls[c].touched || this.form.controls[c].dirty;

  onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (user: import('../../../core/models/user.model').User) => {
        // redirige por query ?redirect=/foo si vino protegido
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        if (redirect) {
          this.router.navigateByUrl(redirect);
        } else {
          const role = (user?.role as UserRole) ?? 'owner';
          this.router.navigateByUrl('/home');
        }
        this.loading.set(false);
      },
      error: (e) => {
        console.error(e);
        this.error.set('Email o contraseÃ±a incorrectos');
        this.loading.set(false);
      }
    });
  }
}

