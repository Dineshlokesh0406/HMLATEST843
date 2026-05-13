import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import { countryPhoneValidator, emailFormatValidator, lettersAndSpacesValidator, trimmedRequiredValidator } from '../../core/validators';

@Component({
  selector: 'app-staff-portal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './staff-portal.component.html',
  styleUrl: './staff-portal.component.css'
})
export class StaffPortalComponent {
  readonly hotel = inject(MockHotelService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly currentUser = this.hotel.currentUser;

  activeSection: 'complaints' | 'profile' = 'complaints';
  filterStatus = '';
  actionNotes: Record<string, string> = {};
  page = 1;
  pageSize = 5;
  readonly pageSizes = [5, 10, 20];
  profileMessage = '';
  profileEditMode = false;
  confirmDialog: { title: string; message: string; confirmText: string; action: () => void | Promise<void> } | null = null;

  readonly profileForm = this.fb.nonNullable.group({
    userId: [{ value: '', disabled: true }],
    name: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(2), Validators.maxLength(50), lettersAndSpacesValidator()]],
    email: ['', [Validators.required, emailFormatValidator()]],
    countryCode: ['+91', Validators.required],
    mobile: ['', [Validators.required, countryPhoneValidator('countryCode')]],
    address: ['', [Validators.required, Validators.maxLength(120)]]
  });

  constructor() {
    if (!this.hotel.ensureRoleSession('staff')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.initialize();
    this.profileForm.controls.countryCode.valueChanges.subscribe(() => {
      this.profileForm.controls.mobile.updateValueAndValidity();
    });
  }

  get complaints() {
    const staffId = this.hotel.currentUser()?.userId;
    return this.hotel.complaints().filter((complaint) =>
      (!complaint.assignedTo || complaint.assignedTo === staffId) &&
      (this.filterStatus ? complaint.status === this.filterStatus : true)
    );
  }

  get paginatedComplaints() {
    const start = (this.page - 1) * this.pageSize;
    return this.complaints.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.complaints.length / this.pageSize));
  }

  setPage(page: number): void {
    this.page = Math.min(Math.max(1, page), this.totalPages);
  }

  setPageSize(value: string): void {
    this.pageSize = Number(value) || 5;
    this.page = 1;
  }

  setSection(section: 'complaints' | 'profile'): void {
    this.activeSection = section;
    if (section === 'profile') {
      this.syncProfileForm();
      this.setProfileEditMode(false);
    }
  }

  async updateStatus(complaintId: string, status: string): Promise<void> {
    this.openConfirm('Update complaint?', 'This will save the selected status and notes.', 'Save', async () => {
      await this.hotel.updateComplaint(complaintId, {
        status: status as 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed',
        response: this.actionNotes[complaintId] || 'Staff action updated.',
        resolutionNotes: this.actionNotes[complaintId] || ''
      });
    });
  }

  logout(): void {
    this.openConfirm('Logout now?', 'You will be signed out of the staff portal.', 'Logout', () => {
      this.hotel.logout();
      this.router.navigate(['/login']);
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const raw = this.profileForm.getRawValue();
    this.openConfirm('Save profile changes?', 'Your staff profile details will be updated.', 'Save', async () => {
      try {
        const response = await this.hotel.updateProfile({
          name: raw.name.trim(),
          email: raw.email.trim().toLowerCase(),
          countryCode: raw.countryCode,
          mobile: raw.mobile.trim(),
          address: raw.address.trim()
        });
        this.profileMessage = response.message;
        this.syncProfileForm();
        this.setProfileEditMode(false);
      } catch (error) {
        this.profileMessage = error instanceof Error ? error.message : 'Unable to update profile.';
      }
    });
  }

  setProfileEditMode(editing: boolean): void {
    this.profileEditMode = editing;
    for (const control of Object.values(this.profileForm.controls)) {
      if (editing && control !== this.profileForm.controls.userId) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  cancelProfileEdit(): void {
    this.syncProfileForm();
    this.profileMessage = '';
    this.setProfileEditMode(false);
  }

  openConfirm(title: string, message: string, confirmText: string, action: () => void | Promise<void>): void {
    this.confirmDialog = { title, message, confirmText, action };
  }

  closeConfirm(): void {
    this.confirmDialog = null;
  }

  async confirmAction(): Promise<void> {
    const action = this.confirmDialog?.action;
    this.confirmDialog = null;
    if (action) {
      await action();
    }
  }

  pageSummary(): string {
    if (!this.complaints.length) {
      return 'No items';
    }
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.complaints.length);
    return `${start}-${end} of ${this.complaints.length}`;
  }

  private async initialize(): Promise<void> {
    try {
      await this.hotel.loadStaffData();
      this.syncProfileForm();
      this.setProfileEditMode(false);
    } catch {
      this.router.navigate(['/login']);
    }
  }

  private syncProfileForm(): void {
    const user = this.currentUser();
    if (!user) return;
    this.profileForm.reset({
      userId: user.userId,
      name: user.name,
      email: user.email,
      countryCode: user.countryCode || '+91',
      mobile: user.mobile,
      address: user.address
    });
  }
}
