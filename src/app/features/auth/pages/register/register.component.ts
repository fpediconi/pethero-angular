import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "@core/auth";
import { ProfileService } from "@core/profile";
import { UserRole } from "@shared/models";
import { finalize, switchMap } from "rxjs/operators";
import { of } from "rxjs";

@Component({
  standalone: true,
  selector: "app-register",
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ["./register.component.css"],
  templateUrl: "./register.component.html",
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private profiles = inject(ProfileService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  /** si vino un rol por ruta, se bloquea el selector */
  prelockedRole = false;

  defaultValues = {
    email: "",
    password: "",
    role: "owner" as UserRole,
    displayName: "",
  };

  form = this.fb.group({
    email: this.fb.control(this.defaultValues.email, {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    password: this.fb.control(this.defaultValues.password, {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
    role: this.fb.control<UserRole>(this.defaultValues.role, {
      nonNullable: true,
    }),
    displayName: this.fb.control(this.defaultValues.displayName, {
      validators: [Validators.required, Validators.minLength(2)],
      nonNullable: true,
    }),
  });

  // getters cómodos
  get email() {
    return this.form.controls.email as AbstractControl;
  }
  get password() {
    return this.form.controls.password as AbstractControl;
  }
  get role() {
    return this.form.controls.role as AbstractControl;
  }
  get displayName() {
    return this.form.controls.displayName as AbstractControl;
  }

  invalid = (c: AbstractControl) => c.invalid && (c.dirty || c.touched);

  ngOnInit(): void {
    // 1) rol por data (definido en auth/routes.ts)
    const dataRole = this.route.snapshot.data["role"] as UserRole | undefined;
    // 2) opcional: rol por query param (?role=owner|guardian)
    const qpRole = this.route.snapshot.queryParamMap.get(
      "role",
    ) as UserRole | null;

    const preselected = (dataRole ?? qpRole ?? undefined) as
      | UserRole
      | undefined;

    if (preselected) {
      this.form.patchValue({ role: preselected });
      this.form.get("role")?.disable({ emitEvent: false }); // se mantiene con getRawValue()
      this.prelockedRole = true;
    }
  }

  onSubmit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // role puede estar deshabilitado; getRawValue lo incluye
    const { email, password, displayName, role } = this.form.getRawValue();

    of(null)
      .pipe(
        switchMap(() =>
          this.auth.register({
            email: email!,
            password: password!,
            role: role! as UserRole,
          }),
        ),
        switchMap((user) => {
          return this.profiles
            .create({ userId: user.id!, displayName: displayName! })
            .pipe(
              switchMap((profile) => {
                user.profileId = profile.id;
                this.auth.persistSession(user);
                return of({ user, role: role as UserRole });
              }),
            );
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ role }) => {
          // navegación suave según rol
          if (role === "guardian") this.router.navigateByUrl("/me/profile");
          else this.router.navigateByUrl("/owners/pets");
        },
        error: (e) => {
          console.error(e);
          const msg =
            typeof e?.message === "string" && e.message.includes("email")
              ? "Ese email ya está registrado"
              : "No se pudo crear la cuenta. Probá de nuevo.";
          this.error.set(msg);
        },
      });
  }
}

