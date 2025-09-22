import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AvailabilityService } from "@features/guardians/services";
import { AuthService } from "@core/auth";
import { AvailabilityCalendar3Component } from "./availability-calendar3.component";
import { AvailabilityPeriodFormComponent } from "./availability-period-form.component";

@Component({
  selector: "ph-availability-page",
  standalone: true,
  imports: [
    CommonModule,
    AvailabilityCalendar3Component,
    AvailabilityPeriodFormComponent,
  ],
  templateUrl: "./availability-page.component.html",
  styleUrls: ["./availability-page.component.css"],
})
export class AvailabilityPageComponent {
  private availability = inject(AvailabilityService);
  private auth = inject(AuthService);

  loading = signal(true);
  guardianId = signal<string | null>(null);
  showForm = signal(false);

  ngOnInit() {
    const user = this.auth.user();
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    this.guardianId.set(String(user.id));
    this.loading.set(false);
  }
  reload() {
    /* calendar listens to month changes and fetches itself */
  }
  openForm() {
    this.showForm.set(true);
  }
  closeForm() {
    this.showForm.set(false);
  }
  onSaved() {
    this.showForm.set(
      false,
    ); /* Calendar will refresh on month nav; manual reload: */
  }
}


