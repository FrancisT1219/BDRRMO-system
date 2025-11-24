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
    driveMode: boolean = false;
    currentStepIndex: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  public routeInstructions: string[] = [];
  userLocation: { lat: number; lng: number } | null = null;
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
            this.userLocation = { lat: userLat, lng: userLng };
            // Add a circle to represent the user's location
            this.map.addSource('user-location', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [userLng, userLat]
                }
              }
            });
            this.map.addLayer({
              id: 'user-location-circle',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 10,
                'circle-color': '#ff0000',
                'circle-opacity': 0.7,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
              }
            });
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
            const marker = new mapboxgl.Marker({ color: 'blue' })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup().setText(center.Name))
              .addTo(this.map);

            marker.getElement().addEventListener('click', () => {
              if (!this.userLocation) {
                alert('User location not available.');
                return;
              }
              this.getDirectionsAndShowRoute([this.userLocation.lng, this.userLocation.lat], [lng, lat], mapboxgl);
            });
          }
        });
      } catch (err) {
        console.error('Failed to fetch evacuation centers:', err);
      }
    }
  }

  getDirectionsAndShowRoute(start: number[], end: number[], mapboxgl: any) {
    // Remove previous route if any
    if (this.map.getSource('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }
    // Build Directions API URL
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${environment.mapboxToken}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0].geometry;
          this.map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: route
            }
          });
          this.map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3887be',
              'line-width': 5,
              'line-opacity': 0.75
            }
          });
          // Extract step-by-step instructions
          const steps = data.routes[0].legs[0].steps;
          this.routeInstructions = steps.map((step: any, idx: number) => `${idx + 1}. ${step.maneuver.instruction}`);
          this.currentStepIndex = 0;
          this.driveMode = false;
          
        } else {
          this.routeInstructions = ['No route found.'];
        }
      })
      .catch(err => {
        console.error('Error fetching directions:', err);
        this.routeInstructions = ['Error fetching directions.'];
      });
  }

  startDrive() {
    if (this.routeInstructions.length > 1) {
      this.driveMode = true;
      this.currentStepIndex = 0;
    }
  }

  nextStep() {
    if (this.currentStepIndex < this.routeInstructions.length - 1) {
      this.currentStepIndex++;
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}