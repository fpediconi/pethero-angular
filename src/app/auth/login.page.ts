import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'ph-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
  <div class="card">
    <h2>Ingresar</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input placeholder="Email" formControlName="email" type="email"/>
      <input placeholder="Contraseña" formControlName="password" type="password"/>
      <button type="submit" [disabled]="form.invalid">Entrar</button>
    </form>
    <p>¿No tenés cuenta?
      <a routerLink="/auth/register-owner">Soy Dueño</a> |
      <a routerLink="/auth/register-guardian">Soy Guardián</a>
    </p>
  </div>`
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  submit(){ const { email, password } = this.form.getRawValue(); this.auth.login(email!, password!); }
}