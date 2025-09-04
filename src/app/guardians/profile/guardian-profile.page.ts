import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuardiansService } from '../guardians.service';
import { GuardianProfile } from '../../shared/models/guardian';

@Component({
  selector: 'ph-guardian-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ng-container *ngIf="profile() as p">
      <div class="card">
        <h2>Perfil Guardián</h2>
        <p><b>ID:</b> {{ p.id }}</p>
        <p><b>Bio:</b> {{ p.bio }}</p>
        <p><b>Precio:</b> \${{ p.pricePerNight }}/noche</p>
        <a [routerLink]="['/bookings/request', p.id]">Solicitar Reserva</a>
      </div>
    </ng-container>
  `
})
export class GuardianProfilePage {
  private route = inject(ActivatedRoute);
  private service = inject(GuardiansService);
  profile = signal<GuardianProfile | null>(null);

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getProfile(id).subscribe(p => this.profile.set(p));
  }
}
