import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'ph-register-owner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="card">
    <h2>Registro Dueño</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input placeholder="Nombre" formControlName="name"/>
      <input placeholder="Email" formControlName="email" type="email"/>
      <button type="submit" [disabled]="form.invalid">Crear cuenta</button>
    </form>
  </div>`
})
export class RegisterOwnerPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  form = this.fb.group({ name:['', Validators.required], email:['', [Validators.required, Validators.email]] });
  submit(){ const {name,email} = this.form.getRawValue(); this.auth.registerOwner(name!, email!); }
}