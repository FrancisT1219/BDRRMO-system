import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { environment } from 'src/environments/environment';

const EVACUATION_CENTER_URL = "https://hackathon-flow.stage.cloud.cloudstaff.com/webhook/f779077f-51a4-4fc7-9e58-49ff5de0fbfb";

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
    if (isPlatformBrowser(this.platformId)) {
      const mapboxgl = (await import('mapbox-gl')).default;

      // Create a new map instance
      this.map = new mapboxgl.Map({
        accessToken: environment.mapboxToken,
        container: this.mapContainer.nativeElement,
        center: [120.61999, 15.07941],
        zoom: 12,
      });

      // Get user's current location and add marker
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLng = position.coords.longitude;
            const userLat = position.coords.latitude;
            new mapboxgl.Marker({ color: 'red' })
              .setLngLat([userLng, userLat])
              .addTo(this.map);
            this.map.setCenter([userLng, userLat]);
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
      }

      // Fetch evacuation centers and add markers
      try {
        const response = await fetch(EVACUATION_CENTER_URL);
        const centers = await response.json();
        centers.forEach((center: any) => {
          let lat = center.Latitude;
          let lng = center.Longitude;
          // Handle string format like "~ 15.1588° N"
          if (typeof lat === 'string') {
            lat = parseFloat(lat.replace(/[^\d.\-]/g, ''));
            if (/S/i.test(center.Latitude)) lat = -lat;
          }
          if (typeof lng === 'string') {
            lng = parseFloat(lng.replace(/[^\d.\-]/g, ''));
            if (/W/i.test(center.Longitude)) lng = -lng;
          }
          if (!isNaN(lat) && !isNaN(lng)) {
            new mapboxgl.Marker({ color: 'blue' })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup().setText(center.Name))
              .addTo(this.map);
          }
        });
      } catch (err) {
        console.error('Failed to fetch evacuation centers:', err);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}