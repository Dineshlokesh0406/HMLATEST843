import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`;
    return value.trim() ? null : { trimmedRequired: true };
  };
}

export function lettersAndSpacesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    return /^[A-Za-z ]+$/.test(value) ? null : { lettersAndSpaces: true };
  };
}

export function usernameNoSpacesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`;
    if (!value) {
      return null;
    }
    return /\s/.test(value) ? { usernameNoSpaces: true } : null;
  };
}

export function indianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    return /^[6-9]\d{7,9}$/.test(value) ? null : { indianPhone: true };
  };
}

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`;
    if (!value) {
      return null;
    }
    const strong =
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value);
    return strong ? null : { passwordStrength: true };
  };
}

export function positiveAmountValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value ?? 0);
    return value > 0 ? null : { positiveAmount: true };
  };
}

export function futureOrTodayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const selected = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected >= today ? null : { futureOrToday: true };
  };
}

export function afterDateValidator(otherControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }
    const otherValue = control.parent.get(otherControlName)?.value;
    const currentValue = control.value;
    if (!otherValue || !currentValue) {
      return null;
    }
    const current = new Date(`${currentValue}T00:00:00`);
    const other = new Date(`${otherValue}T00:00:00`);
    return current > other ? null : { afterDate: true };
  };
}

export function maxStayDurationValidator(checkInControlName: string, maxDays: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }
    const checkInValue = control.parent.get(checkInControlName)?.value;
    const checkOutValue = control.value;
    if (!checkInValue || !checkOutValue) {
      return null;
    }
    const diff = new Date(checkOutValue).getTime() - new Date(checkInValue).getTime();
    const nights = Math.round(diff / (1000 * 60 * 60 * 24));
    return nights <= maxDays ? null : { maxStayDuration: true };
  };
}

export function expiryDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) {
      return { expiryFormat: true };
    }
    const [monthText, yearText] = value.split('/');
    const month = Number(monthText);
    const year = 2000 + Number(yearText);
    const expiry = new Date(year, month, 0, 23, 59, 59);
    return expiry > new Date() ? null : { expiryPast: true };
  };
}

export function matchOtherControlValidator(otherControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }
    const otherValue = control.parent.get(otherControlName)?.value;
    return control.value === otherValue ? null : { matchOther: true };
  };
}
