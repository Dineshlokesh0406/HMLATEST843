import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MockHotelService } from './core/mock-hotel.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly hotel = inject(MockHotelService);

  showPublicTopbar(): boolean {
    const isCustomerArea = this.router.url.startsWith('/customer');
    return !(isCustomerArea && this.hotel.ensureRoleSession('customer'));
  }
}
