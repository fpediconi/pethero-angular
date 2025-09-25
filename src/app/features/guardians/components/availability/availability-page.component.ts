import { Component, ViewChild, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AvailabilityService } from "@features/guardians/services";
import { AuthService } from "@core/auth";
import { AvailabilityCalendar3Component } from "./availability-calendar3.component";
import { AvailabilityPeriodFormComponent } from "./availability-period-form.component";
/*
############################################
Name: AvailabilityPageComponent
Objetive: Render and orchestrate the availability page component.
Extra info: Handles bindings, events, and view state.
############################################
*/


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

  @ViewChild(AvailabilityCalendar3Component)
  private calendar?: AvailabilityCalendar3Component;

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
    this.calendar?.refreshCurrentRange();
  }
  openForm() {
    this.showForm.set(true);
  }
  closeForm() {
    this.showForm.set(false);
  }
  onSaved() {
    this.showForm.set(false);
    this.calendar?.refreshCurrentRange();
  }
}


