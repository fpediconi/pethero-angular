import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ph-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stars" role="radiogroup" [attr.aria-label]="ariaLabel">
      <button *ngFor="let s of stars()"
              type="button"
              class="star"
              [class.filled]="s <= value"
              [disabled]="readonly"
              role="radio"
              [attr.aria-checked]="s === value"
              [attr.aria-label]="'Calificar con ' + s + ' estrella' + (s>1?'s':'')"
              (click)="onSelect(s)"
              (keydown.enter)="onSelect(s)"
              (keydown.space)="onSelect(s)">
        &#9733;
      </button>
      <span *ngIf="showValue" class="val">{{ value }}/5</span>
    </div>
  `,
  styles: [`
    .stars{ display:inline-flex; align-items:center; gap:4px }
    .star{ font-size:1.6rem; width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border:none; background:transparent; color:#6b7280; cursor:pointer; border-radius:6px; line-height:1 }
    .star.filled{ color:#f59e0b }
    .star:disabled{ cursor:default; opacity:.7 }
    .star:focus{ outline:2px solid rgba(37,99,235,.6); outline-offset:2px }
    .val{ margin-left:6px; color:#374151; font-size:.9rem }
    @media (prefers-color-scheme: dark){ .star{ color:#9ca3af } .star.filled{ color:#fbbf24 } .val{ color:#e5e7eb } }
  `]
})
export class RatingComponent {
  @Input() value = 0;
  @Input() readonly = false;
  @Input() showValue = false;
  @Input() max = 5;
  @Input() ariaLabel = 'Calificacion';
  @Output() valueChange = new EventEmitter<number>();

  stars = computed(() => Array.from({ length: this.max }, (_, i) => i + 1));
  onSelect(n: number){ if (!this.readonly) this.valueChange.emit(n); }
}

