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

export function noExcessSpacesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`;
    return /\s{2,}/.test(value.trim()) ? { excessSpaces: true } : null;
  };
}

export function emailFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value) ? null : { emailFormat: true };
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

export const phoneRules: Record<string, { length: number; pattern: RegExp; label: string }> = {
  '+91': { length: 10, pattern: /^[6-9]\d{9}$/, label: 'India' },
  '+1': { length: 10, pattern: /^[2-9]\d{9}$/, label: 'US/Canada' },
  '+44': { length: 10, pattern: /^[1-9]\d{9}$/, label: 'UK' },
  '+61': { length: 9, pattern: /^[2-478]\d{8}$/, label: 'Australia' }
};

export function countryPhoneValidator(countryCodeControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value || !control.parent) {
      return null;
    }
    if (!/^\d+$/.test(value)) {
      return { invalidPhone: true };
    }
    const countryCode = control.parent.get(countryCodeControlName)?.value ?? '+91';
    const rule = phoneRules[countryCode] ?? phoneRules['+91'];
    if (value.length < rule.length) {
      return { phoneTooShort: true };
    }
    if (value.length > rule.length) {
      return { phoneTooLong: true };
    }
    return rule.pattern.test(value) ? null : { invalidPhone: true };
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

export function cardNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const digits = `${control.value ?? ''}`.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    return digits.length === 16 ? null : { cardNumberLength: true };
  };
}

export function cvvValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`;
    if (!value) {
      return null;
    }
    return /^\d{3}$/.test(value) ? null : { cvvLength: true };
  };
}

export function wholeNumberRangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (control.value === '' || control.value === null || control.value === undefined) {
      return null;
    }
    return Number.isInteger(value) && value >= min && value <= max ? null : { wholeNumberRange: { min, max } };
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
