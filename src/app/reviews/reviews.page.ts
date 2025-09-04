import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ph-reviews',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Reseñas</h2><p>Pronto vas a poder ver y cargar reseñas aquí.</p></div>`
})
export class ReviewsPage {}