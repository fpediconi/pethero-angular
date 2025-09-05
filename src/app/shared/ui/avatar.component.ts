import { Component, Input, computed } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
  <span class="av" [class.sm]="size==='sm'" [class.md]="size==='md'" [class.lg]="size==='lg'">
    <img *ngIf="srcClean()" [src]="srcClean()" [alt]="altText()" (error)="src = ''" />
    <span *ngIf="!srcClean()">{{ initials() }}</span>
  </span>
  `,
  styles: [`
    .av{ display:inline-flex; align-items:center; justify-content:center; border-radius:50%; background:#e6f6f8; color:#0b6570; font-weight:700; overflow:hidden }
    .av img{ width:100%; height:100%; object-fit:cover }
    .av.sm{ width:28px; height:28px; font-size:.8rem }
    .av.md{ width:40px; height:40px; font-size:1rem }
    .av.lg{ width:84px; height:84px; font-size:1.4rem }
  `]
})
export class AvatarComponent {
  @Input() src: string | null | undefined;
  @Input() name: string | null | undefined;
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';

  srcClean = computed(() => (this.src || '').trim());
  altText = computed(() => `Avatar de ${this.name || 'usuario'}`);
  initials = computed(() => {
    const name = (this.name || '').trim();
    if (!name) return 'PH';
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || '';
    return (a + b).toUpperCase();
  });
}

