import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-map', 
  standalone: false,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  private platformId = inject(PLATFORM_ID);

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) { // SSR check to ensure this runs in the browser as GL JS requires a browser environment
      const mapboxgl = (await import('mapbox-gl')).default // dynamically import mapbox-gl as the default export

      // Create a new map instance
      this.map = new mapboxgl.Map({
        accessToken: environment.mapboxToken,
        container: this.mapContainer.nativeElement, // Reference to the map container element
        center: [-98.54818, 40.00811], // Center coordinates for map over the continental US
        zoom: 4, // Initial zoom level
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}