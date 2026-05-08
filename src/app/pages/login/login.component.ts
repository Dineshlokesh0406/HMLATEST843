import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import { UserRole } from '../../core/models';
import { trimmedRequiredValidator } from '../../core/validators';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly hotel = inject(MockHotelService);
  private readonly router = inject(Router);

  loginMessage = '';

  readonly loginForm = this.fb.nonNullable.group({
    role: ['customer' as UserRole, Validators.required],
    username: ['', [Validators.required, trimmedRequiredValidator()]],
    password: ['', [Validators.required, trimmedRequiredValidator()]]
  });

  async submit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const result = await this.hotel.login(
      this.loginForm.controls.role.value,
      this.loginForm.controls.username.value.trim(),
      this.loginForm.controls.password.value.trim()
    );
    this.loginMessage = result.message;

    if (result.success && result.role) {
      this.router.navigate([`/${result.role}`]);
    }
  }
}
