import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import { UserRole } from '../../core/models';
import { emailFormatValidator, matchOtherControlValidator, passwordStrengthValidator, trimmedRequiredValidator } from '../../core/validators';

type ForgotPasswordStep = 'verify' | 'reset';

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
  forgotPasswordOpen = false;
  forgotPasswordStep: ForgotPasswordStep = 'verify';
  forgotPasswordMessage = '';
  resetToken = '';
  loginConfirmRole: UserRole | null = null;

  readonly loginForm = this.fb.nonNullable.group({
    role: ['customer' as UserRole, Validators.required],
    username: ['', [Validators.required, trimmedRequiredValidator()]],
    password: ['', [Validators.required, trimmedRequiredValidator()]]
  });

  readonly forgotPasswordForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, trimmedRequiredValidator()]],
    email: ['', [Validators.required, trimmedRequiredValidator(), emailFormatValidator()]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required, matchOtherControlValidator('newPassword')]]
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
      this.loginConfirmRole = result.role;
    }
  }

  continueAfterLogin(): void {
    const role = this.loginConfirmRole;
    this.loginConfirmRole = null;
    if (role) {
      this.router.navigate([`/${role}`]);
    }
  }

  closeLoginConfirm(): void {
    this.loginConfirmRole = null;
  }

  toggleForgotPassword(): void {
    this.forgotPasswordOpen = !this.forgotPasswordOpen;
    this.forgotPasswordStep = 'verify';
    this.forgotPasswordMessage = '';
    this.resetToken = '';
    this.forgotPasswordForm.reset({
      username: '',
      email: '',
      phoneNumber: '',
      newPassword: '',
      confirmPassword: ''
    });
  }

  normalizeForgotPasswordPhone(): void {
    const control = this.forgotPasswordForm.controls.phoneNumber;
    const normalized = control.value.replace(/\D/g, '').slice(0, 15);
    if (normalized !== control.value) {
      control.setValue(normalized);
    }
  }

  normalizeForgotPasswordEmail(): void {
    const email = this.forgotPasswordForm.controls.email;
    email.setValue(email.value.trim().toLowerCase(), { emitEvent: false });
  }

  async verifyResetIdentity(): Promise<void> {
    this.normalizeForgotPasswordEmail();
    this.normalizeForgotPasswordPhone();
    const identityControls = [
      this.forgotPasswordForm.controls.username,
      this.forgotPasswordForm.controls.email,
      this.forgotPasswordForm.controls.phoneNumber
    ];
    if (identityControls.some((control) => control.invalid)) {
      identityControls.forEach((control) => control.markAsTouched());
      return;
    }
    try {
      const response = await this.hotel.startPasswordReset(
        this.forgotPasswordForm.controls.username.value,
        this.forgotPasswordForm.controls.email.value,
        this.forgotPasswordForm.controls.phoneNumber.value
      );
      this.resetToken = response.resetToken;
      this.forgotPasswordMessage = response.message;
      this.forgotPasswordStep = 'reset';
    } catch (error) {
      this.forgotPasswordMessage = this.extractError(error);
    }
  }

  async resetPassword(): Promise<void> {
    this.forgotPasswordForm.controls.newPassword.updateValueAndValidity();
    this.forgotPasswordForm.controls.confirmPassword.updateValueAndValidity();
    if (!this.resetToken || this.forgotPasswordForm.controls.newPassword.invalid || this.forgotPasswordForm.controls.confirmPassword.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }
    try {
      const response = await this.hotel.resetPassword(
        this.resetToken,
        this.forgotPasswordForm.controls.newPassword.value,
        this.forgotPasswordForm.controls.confirmPassword.value
      );
      this.forgotPasswordMessage = response.message;
      this.forgotPasswordStep = 'verify';
      this.resetToken = '';
      this.forgotPasswordForm.reset({
        username: '',
        email: '',
        phoneNumber: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      this.forgotPasswordMessage = this.extractError(error);
    }
  }

  private extractError(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const errorBody = (error as { error?: { message?: string } }).error;
      if (errorBody?.message) {
        return errorBody.message;
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
