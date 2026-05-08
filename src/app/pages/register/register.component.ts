import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import {
  indianPhoneValidator,
  lettersAndSpacesValidator,
  matchOtherControlValidator,
  passwordStrengthValidator,
  trimmedRequiredValidator,
  usernameNoSpacesValidator
} from '../../core/validators';
import { AppUser } from '../../core/models';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly hotel = inject(MockHotelService);
  private readonly router = inject(Router);

  acknowledgementUser: AppUser | null = null;
  formMessage = '';

  readonly registerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), lettersAndSpacesValidator()]],
    email: ['', [Validators.required, trimmedRequiredValidator(), Validators.email]],
    countryCode: ['+91', Validators.required],
    mobile: ['', [Validators.required, indianPhoneValidator()]],
    address: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(10)]],
    username: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(5), usernameNoSpacesValidator()]],
    password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required, matchOtherControlValidator('password')]]
  });

  resetForm(): void {
    this.registerForm.reset({
      name: '',
      email: '',
      countryCode: '+91',
      mobile: '',
      address: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
    this.formMessage = '';
  }

  async submit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();
    const result = await this.hotel.registerCustomer({
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      countryCode: raw.countryCode,
      mobile: raw.mobile.trim(),
      address: raw.address.trim(),
      username: raw.username.trim(),
      password: raw.password.trim()
    });

    this.formMessage = result.message;
    this.acknowledgementUser = result.user ?? null;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
