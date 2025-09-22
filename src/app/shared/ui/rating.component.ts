import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "ph-rating",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rating.component.html",
  styleUrls: ["./rating.component.css"],
})
export class RatingComponent {
  @Input() value = 0;
  @Input() readonly = false;
  @Input() showValue = false;
  @Input() max = 5;
  @Input() ariaLabel = "Calificacion";
  @Output() valueChange = new EventEmitter<number>();

  stars = computed(() => Array.from({ length: this.max }, (_, i) => i + 1));
  onSelect(n: number) {
    if (!this.readonly) this.valueChange.emit(n);
  }
}
