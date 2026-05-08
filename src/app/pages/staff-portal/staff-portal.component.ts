import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';

@Component({
  selector: 'app-staff-portal',
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-portal.component.html',
  styleUrl: './staff-portal.component.css'
})
export class StaffPortalComponent {
  readonly hotel = inject(MockHotelService);
  private readonly router = inject(Router);

  filterStatus = '';
  actionNotes: Record<string, string> = {};

  constructor() {
    if (!this.hotel.ensureRoleSession('staff')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.initialize();
  }

  get complaints() {
    return this.hotel.complaints().filter((complaint) =>
      this.filterStatus ? complaint.status === this.filterStatus : true
    );
  }

  async updateStatus(complaintId: string, status: string): Promise<void> {
    await this.hotel.updateComplaint(complaintId, {
      status: status as 'Open' | 'In Progress' | 'Resolved' | 'Closed',
      response: this.actionNotes[complaintId] || 'Staff action updated.'
    });
  }

  logout(): void {
    this.hotel.logout();
    this.router.navigate(['/login']);
  }

  private async initialize(): Promise<void> {
    try {
      await this.hotel.loadStaffData();
    } catch {
      this.router.navigate(['/login']);
    }
  }
}
