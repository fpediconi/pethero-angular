import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetsService } from './pets.service';
import { Pet } from '../../shared/models/pet';

@Component({
  selector: 'ph-pets',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card">
    <h2>Mis Mascotas</h2>
    <table class="table">
      <thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th></tr></thead>
      <tbody>
        <tr *ngFor="let p of pets()">
          <td>{{ p.name }}</td><td>{{ p.type }}</td><td>{{ p.size }}</td>
        </tr>
      </tbody>
    </table>
  </div>`
})
export class PetsPage {
  private service = inject(PetsService);
  pets = signal<Pet[]>([]);
  ngOnInit(){ const ownerId = 'u1'; this.service.list(ownerId).subscribe(p => this.pets.set(p)); }
}