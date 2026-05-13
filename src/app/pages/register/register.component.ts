import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import {
  indianPhoneValidator,
  countryPhoneValidator,
  emailFormatValidator,
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
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), lettersAndSpacesValidator()]],
    email: ['', [Validators.required, trimmedRequiredValidator(), emailFormatValidator()]],
    countryCode: ['+91', Validators.required],
    mobile: ['', [Validators.required, countryPhoneValidator('countryCode')]],
    address: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(10)]],
    username: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(5), usernameNoSpacesValidator()]],
    password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required, matchOtherControlValidator('password')]]
  });

  constructor() {
    this.registerForm.controls.countryCode.valueChanges.subscribe(() => {
      this.registerForm.controls.mobile.updateValueAndValidity();
    });
    this.registerForm.controls.email.valueChanges.subscribe((value) => {
      const trimmed = value.trim();
      if (value !== trimmed) {
        this.registerForm.controls.email.setValue(trimmed, { emitEvent: false });
      }
    });
  }

  phoneValidationMessage(): string {
    const control = this.registerForm.controls.mobile;
    if (control.errors?.['phoneTooShort']) {
      return 'Phone number too short';
    }
    if (control.errors?.['phoneTooLong']) {
      return 'Phone number too long';
    }
    if (control.errors?.['invalidPhone']) {
      return 'Invalid phone number';
    }
    return control.value ? 'Valid number' : '';
  }

  normalizeName(): void {
    const control = this.registerForm.controls.name;
    control.setValue(control.value.replace(/[^A-Za-z ]/g, '').replace(/\s{2,}/g, ' '), { emitEvent: false });
  }

  normalizeEmail(): void {
    const control = this.registerForm.controls.email;
    control.setValue(control.value.replace(/\s/g, '').toLowerCase(), { emitEvent: false });
  }

  normalizePhone(): void {
    const control = this.registerForm.controls.mobile;
    const maxLength = this.registerForm.controls.countryCode.value === '+61' ? 9 : 10;
    control.setValue(control.value.replace(/\D/g, '').slice(0, maxLength), { emitEvent: false });
  }

  passwordStrengthLabel(): string {
    const value = this.registerForm.controls.password.value;
    const checks = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(value)).length;
    if (!value) return '';
    if (value.length >= 8 && checks === 4) return 'Strong password';
    if (value.length >= 6 && checks >= 2) return 'Medium password';
    return 'Weak password';
  }

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
