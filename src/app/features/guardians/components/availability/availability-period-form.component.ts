import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { AvailabilityService } from "@features/guardians/services";
/*
############################################
Name: AvailabilityPeriodFormComponent
Objetive: Render and orchestrate the availability period form component.
Extra info: Handles bindings, events, and view state.
############################################
*/


@Component({
  selector: "ph-availability-period-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./availability-period-form.component.html",
  styleUrls: ["./availability-period-form.component.css"],
})
export class AvailabilityPeriodFormComponent {
  private fb = inject(FormBuilder);
  private availability = inject(AvailabilityService);

  @Input() guardianId!: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  error: string | null = null;

  form = this.fb.group({
    start: ["", Validators.required],
    end: ["", Validators.required],
  });

  
  /*
  ############################################
  Name: onSubmit
  Objetive: Manage the on submit workflow.
  Extra info: Coordinates asynchronous calls with state updates and error handling.
  ############################################
  */
  async onSubmit() {
    this.error = null;
    const v = this.form.getRawValue();
    if (!v.start || !v.end) {
      this.error = "Debe indicar fechas.";
      return;
    }
    if (String(v.start) >= String(v.end)) {
      this.error = "La fecha Hasta debe ser mayor a Desde.";
      return;
    }
    const blocks = await new Promise<any[]>((resolve) =>
      this.availability.listBlocks(this.guardianId).subscribe(resolve),
    );
    const candidate = {
      start: `${v.start}T00:00:00Z`,
      end: `${v.end}T00:00:00Z`,
    };
    const check = this.availability.validateNoOverlapBlocks(
      candidate,
      blocks as any,
    );
    if (!check.ok) {
      const c = check.conflicts![0];
      this.error = `Se solapa con otro periodo (${(c.start || "").slice(0, 10)}  ${(c.end || "").slice(0, 10)})`;
      return;
    }
    this.availability
      .createBlock({
        guardianId: this.guardianId,
        startDay: String(v.start),
        endDayExcl: String(v.end),
      })
      .subscribe({
        next: () => this.saved.emit(),
        error: (e) => (this.error = String(e?.message || "No se pudo guardar")),
      });
  }
}

