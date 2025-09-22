import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule, ActivatedRoute } from "@angular/router";
import { AuthService } from "@core/auth";
import { UserRole } from "@shared/models";

@Component({
  standalone: true,
  selector: "app-login",
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
  });

  touched = (c: "email" | "password") =>
    this.form.controls[c].touched || this.form.controls[c].dirty;

  onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (user: import("@shared/models").User) => {
        const redirect = this.route.snapshot.queryParamMap.get("redirect");
        if (redirect) {
          this.router.navigateByUrl(redirect);
        } else {
          const role = (user?.role as UserRole) ?? "owner";
          this.router.navigateByUrl("/home");
        }
        this.loading.set(false);
      },
      error: (e) => {
        console.error(e);
        this.error.set("Email o contraseña incorrectos");
        this.loading.set(false);
      },
    });
  }
}

