import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockHotelService } from '../../core/mock-hotel.service';
import { CityOption, Room } from '../../core/models';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private readonly hotel = inject(MockHotelService);
  private readonly pageSize = 9;
  private readonly cardImages: Record<string, string> = {
    GOA: 'assets/single.webp',
    BLR: 'assets/double.jpeg',
    DEFAULT: 'assets/luxe.jpeg'
  };

  readonly cities = signal<CityOption[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly selectedCityCode = signal('');
  readonly currentPage = signal(1);
  readonly loading = signal(true);
  readonly loadMessage = signal('');

  readonly filteredRooms = computed(() => {
    const cityCode = this.selectedCityCode();
    const matches = this.rooms().filter((room) => !cityCode || room.cityCode === cityCode);
    return [...matches].sort((left, right) => {
      if (left.available !== right.available) {
        return Number(right.available) - Number(left.available);
      }
      if (left.cityName !== right.cityName) {
        return left.cityName.localeCompare(right.cityName);
      }
      return left.price - right.price;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRooms().length / this.pageSize)));

  readonly paginatedRooms = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredRooms().slice(start, start + this.pageSize);
  });

  readonly pageStart = computed(() => {
    if (!this.filteredRooms().length) {
      return 0;
    }
    return (Math.min(this.currentPage(), this.totalPages()) - 1) * this.pageSize + 1;
  });

  readonly pageEnd = computed(() => Math.min(this.pageStart() + this.pageSize - 1, this.filteredRooms().length));

  constructor() {
    void this.loadLandingData();
  }

  updateSelectedCity(value: string): void {
    this.selectedCityCode.set(value);
    this.currentPage.set(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  getRoomCardImage(room: Room): string {
    return this.cardImages[room.cityCode] ?? this.cardImages['DEFAULT'];
  }

  getRoomCardBadge(room: Room): string {
    if (room.roomType.toLowerCase().includes('lux')) {
      return 'Top Rated | 4.6 star';
    }
    if (room.cityCode === 'BLR') {
      return 'Family Pick | 4.4 star';
    }
    return 'Family Pick | 4.5 star';
  }

  private async loadLandingData(): Promise<void> {
    this.loading.set(true);
    this.loadMessage.set('');
    try {
      const [cities, rooms] = await Promise.all([
        this.hotel.getCustomerCities(),
        this.hotel.getPublicRooms()
      ]);
      this.cities.set(cities);
      this.rooms.set(rooms);
      this.currentPage.set(1);
    } catch {
      this.cities.set([]);
      this.rooms.set([]);
      this.loadMessage.set('Unable to load rooms right now. Please try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
