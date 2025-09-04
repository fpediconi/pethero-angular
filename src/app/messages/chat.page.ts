import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MessagesService } from './messages.service';

@Component({
  selector: 'ph-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="card">
    <h2>Mensajes</h2>
    <div style="display:grid; gap:8px; max-height:300px; overflow:auto; margin-bottom:12px">
      <div *ngFor="let m of msgs()" class="card">
        <p><b>{{ m.fromUserId }}</b>: {{ m.body }}</p>
      </div>
    </div>
    <form [formGroup]="form" (ngSubmit)="send()">
      <input placeholder="Mensaje..." formControlName="body">
      <button [disabled]="form.invalid">Enviar</button>
    </form>
  </div>`
})
export class ChatPage {
  private fb = inject(FormBuilder);
  private service = inject(MessagesService);
  msgs = signal<{fromUserId:string, body:string}[]>([
    { fromUserId: 'u1', body: 'Hola!' },
    { fromUserId: 'u2', body: '¡Hola! ¿Cómo va?' }
  ]);
  form = this.fb.group({ body: ['', Validators.required] });
  send(){ const body = this.form.value.body; if(!body) return; this.msgs.update(arr => [...arr, { fromUserId:'u1', body }]); this.form.reset(); }
}