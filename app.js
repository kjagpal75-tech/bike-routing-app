class BikeRoutePlanner {
    constructor() {
        console.log('🚴 Bike Route Planner for Road Cycling Initialized');
        this.map = null;
        this.startMarker = null;
        this.endMarker = null;
        this.waypoints = [];
        this.routeLayer = null;
        
        this.initMap();
        this.setupEventListeners();
    }
    
    initMap() {
        // Initialize map centered on a cycling-friendly area
        this.map = L.map('map').setView([40.7128, -74.0060], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Create custom icons
        this.startIcon = L.divIcon({ 
            html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">S</div>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });
        
        this.endIcon = L.divIcon({ 
            html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">E</div>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });
        
        this.waypointIcon = L.divIcon({ 
            html: '<div style="background: #FF9800; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold;">W</div>',
            iconSize: [25, 25],
            className: 'custom-div-icon'
        });
        
        // Add click handler to map
        this.map.on('click', (e) => this.handleMapClick(e));
    }
    
    setupEventListeners() {
        // Get current location button
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        }
        
        // Generate route button
        const generateRouteBtn = document.getElementById('generateRouteBtn');
        if (generateRouteBtn) {
            generateRouteBtn.addEventListener('click', () => this.generateRoute());
        }
        
        // Clear route button
        const clearRouteBtn = document.getElementById('clearRouteBtn');
        if (clearRouteBtn) {
            clearRouteBtn.addEventListener('click', () => this.clearRoute());
        }
        
        // Add waypoint button
        const addWaypointBtn = document.getElementById('addWaypointBtn');
        if (addWaypointBtn) {
            addWaypointBtn.addEventListener('click', () => this.addWaypoint());
        }
    }
    
    handleMapClick(e) {
        // Set start point first, then end point, then waypoints
        if (!this.startMarker) {
            this.setStartPoint(e.latlng);
        } else if (!this.endMarker) {
            this.setEndPoint(e.latlng);
        } else {
            this.addWaypointAtLocation(e.latlng);
        }
    }
    
    async getCurrentLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });
            
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            this.map.setView(latlng, 15);
            this.setStartPoint(latlng);
            
        } catch (error) {
            console.error('Location error:', error);
            alert('Unable to get your location. Please check your browser settings.');
        }
    }
    
    setStartPoint(latlng) {
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
        }
        
        this.startMarker = L.marker(latlng, { icon: this.startIcon, draggable: true }).addTo(this.map);
        
        const startInput = document.getElementById('startInput');
        if (startInput) {
            startInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
        // Update waypoint counter
        this.updateWaypointCounter();
    }
    
    setEndPoint(latlng) {
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
        }
        
        this.endMarker = L.marker(latlng, { icon: this.endIcon, draggable: true }).addTo(this.map);
        
        const endInput = document.getElementById('endInput');
        if (endInput) {
            endInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
        // Update waypoint counter
        this.updateWaypointCounter();
    }
    
    addWaypoint() {
        const center = this.map.getCenter();
        const waypointId = Date.now();
        
        const waypoint = {
            id: waypointId,
            latlng: center,
            marker: L.marker(center, { icon: this.waypointIcon, draggable: true }).addTo(this.map)
        };
        
        this.waypoints.push(waypoint);
        this.addWaypointInput(waypointId, center);
        this.updateWaypointCounter();
    }
    
    addWaypointAtLocation(latlng) {
        const waypointId = Date.now();
        
        const waypoint = {
            id: waypointId,
            latlng: latlng,
            marker: L.marker(latlng, { icon: this.waypointIcon, draggable: true }).addTo(this.map)
        };
        
        this.waypoints.push(waypoint);
        this.addWaypointInput(waypointId, latlng);
        this.updateWaypointCounter();
    }
    
    addWaypointInput(waypointId, latlng) {
        const waypointsList = document.getElementById('waypointsList');
        if (!waypointsList) return;
        
        const waypointDiv = document.createElement('div');
        waypointDiv.className = 'waypoint-item';
        waypointDiv.innerHTML = `
            <div class="waypoint-header">
                <span class="waypoint-number">Waypoint ${this.waypoints.length}</span>
                <button class="remove-waypoint-btn" onclick="app.removeWaypoint(${waypointId})">✕</button>
            </div>
            <input type="text" class="waypoint-input" placeholder="Waypoint location" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly />
        `;
        
        waypointsList.appendChild(waypointDiv);
    }
    
    removeWaypoint(waypointId) {
        const index = this.waypoints.findIndex(w => w.id === waypointId);
        if (index !== -1) {
            this.map.removeLayer(this.waypoints[index].marker);
            this.waypoints.splice(index, 1);
        }
        
        // Rebuild waypoints list
        this.rebuildWaypointsList();
        this.updateWaypointCounter();
    }
    
    rebuildWaypointsList() {
        const waypointsList = document.getElementById('waypointsList');
        if (!waypointsList) return;
        
        waypointsList.innerHTML = '';
        
        // Re-add all waypoints with updated numbers
        this.waypoints.forEach((waypoint, index) => {
            const waypointDiv = document.createElement('div');
            waypointDiv.className = 'waypoint-item';
            waypointDiv.innerHTML = `
                <div class="waypoint-header">
                    <span class="waypoint-number">Waypoint ${index + 1}</span>
                    <button class="remove-waypoint-btn" onclick="app.removeWaypoint(${waypoint.id})">✕</button>
                </div>
                <input type="text" class="waypoint-input" placeholder="Waypoint location" value="${waypoint.latlng.lat.toFixed(6)}, ${waypoint.latlng.lng.toFixed(6)}" readonly />
            `;
            
            waypointsList.appendChild(waypointDiv);
        });
    }
    
    updateWaypointCounter() {
        const counter = document.getElementById('waypointCounter');
        if (counter) {
            counter.textContent = `Waypoints: ${this.waypoints.length}`;
        }
    }
    
    async generateRoute() {
        if (!this.startMarker || !this.endMarker) {
            alert('Please set both start and end points on the map');
            return;
        }
        
        // Build coordinates array: start -> waypoints -> end
        const coordinates = [
            this.startMarker.getLatLng(),
            ...this.waypoints.map(w => w.latlng),
            this.endMarker.getLatLng()
        ];
        
        try {
            // Use OSRM's driving profile (best for road cycling)
            const coordsStr = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`);
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                
                this.displayRoute(routePoints, route);
                this.displayTurnDirections(route.legs[0].steps);
                this.displayRouteInfo(route);
            } else {
                alert('No route found. Please try different points.');
            }
        } catch (error) {
            console.error('Route generation error:', error);
            alert('Failed to generate route. Please try again.');
        }
    }
    
    displayRoute(routePoints, routeData) {
        // Remove existing route
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        
        // Add new route with cycling-friendly styling
        this.routeLayer = L.polyline(routePoints, {
            color: '#4CAF50',
            weight: 6,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(this.map);
        
        // Fit map to show entire route
        const bounds = L.latLngBounds(routePoints);
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    displayTurnDirections(steps) {
        const directionsDiv = document.getElementById('turnDirections');
        if (!directionsDiv) return;
        
        directionsDiv.innerHTML = '<h3>🚴 Turn-by-Turn Directions</h3>';
        
        steps.forEach((step, index) => {
            const instruction = step.maneuver.instruction || 'Continue';
            const distance = (step.distance / 1000).toFixed(2);
            const duration = Math.round(step.duration / 60);
            
            const stepDiv = document.createElement('div');
            stepDiv.className = 'turn-step';
            stepDiv.innerHTML = `
                <div class="turn-step-header">
                    <span class="turn-step-number">${index + 1}</span>
                    <span class="turn-step-distance">${distance} km</span>
                </div>
                <div class="turn-instruction">${instruction}</div>
                <div class="turn-step-details">
                    <span class="turn-duration">⏱️ ${duration} min</span>
                    <span class="turn-distance-detail">📏 ${(step.distance).toFixed(0)} m</span>
                </div>
            `;
            
            directionsDiv.appendChild(stepDiv);
        });
    }
    
    displayRouteInfo(routeData) {
        const routeInfoDiv = document.getElementById('routeInfo');
        if (!routeInfoDiv) return;
        
        const distance = (routeData.distance / 1000).toFixed(2);
        const duration = Math.round(routeData.duration / 60);
        
        routeInfoDiv.innerHTML = `
            <h3>📊 Route Information</h3>
            <div class="route-stats">
                <div class="route-stat">
                    <span class="stat-label">Distance:</span>
                    <span class="stat-value">${distance} km</span>
                </div>
                <div class="route-stat">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${duration} min</span>
                </div>
                <div class="route-stat">
                    <span class="stat-label">Avg Speed:</span>
                    <span class="stat-value">${(distance / (duration / 60)).toFixed(1)} km/h</span>
                </div>
            </div>
        `;
    }
    
    clearRoute() {
        // Remove markers
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
        
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
            this.endMarker = null;
        }
        
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        
        // Remove waypoints
        this.waypoints.forEach(waypoint => {
            this.map.removeLayer(waypoint.marker);
        });
        this.waypoints = [];
        
        // Clear inputs and displays
        document.getElementById('startInput').value = '';
        document.getElementById('endInput').value = '';
        document.getElementById('waypointsList').innerHTML = '';
        document.getElementById('turnDirections').innerHTML = '';
        document.getElementById('routeInfo').innerHTML = '';
        
        this.updateWaypointCounter();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Bike Route Planner...');
    window.app = new BikeRoutePlanner();
});
