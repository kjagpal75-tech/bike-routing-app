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
        this.setupAddressSearch();
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
    
    setupAddressSearch() {
        // Setup address search for start point
        const startInput = document.getElementById('startInput');
        if (startInput) {
            startInput.removeAttribute('readonly');
            startInput.placeholder = 'Enter California address or use Current Location';
            
            // Add search functionality
            let searchTimeout;
            startInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchAddress(e.target.value, 'start');
                }, 500);
            });
            
            // Add enter key support
            startInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.resolveAddress(e.target.value, 'start');
                }
            });
        }
        
        // Setup address search for end point
        const endInput = document.getElementById('endInput');
        if (endInput) {
            endInput.removeAttribute('readonly');
            endInput.placeholder = 'Enter California address or click on map';
            
            // Add search functionality
            let searchTimeout;
            endInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchAddress(e.target.value, 'end');
                }, 500);
            });
            
            // Add enter key support
            endInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.resolveAddress(e.target.value, 'end');
                }
            });
        }
    }
    
    async searchAddress(query, type) {
        if (query.length < 3) {
            this.hideSuggestions(type);
            return;
        }
        
        try {
            // Use Nominatim API for address search, focused on California
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', California')}&limit=5&addressdetails=1`);
            const results = await response.json();
            
            this.displaySuggestions(results, type);
        } catch (error) {
            console.error('Address search error:', error);
        }
    }
    
    displaySuggestions(results, type) {
        // Remove existing suggestions
        this.hideSuggestions(type);
        
        if (results.length === 0) return;
        
        // Create suggestions dropdown
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions';
        suggestionsDiv.id = `${type}Suggestions`;
        
        results.forEach(result => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion-item';
            
            // Format display name
            let displayName = result.display_name;
            if (displayName.length > 60) {
                displayName = displayName.substring(0, 60) + '...';
            }
            
            suggestionDiv.textContent = displayName;
            suggestionDiv.addEventListener('click', () => {
                this.selectSuggestion(result, type);
            });
            
            suggestionsDiv.appendChild(suggestionDiv);
        });
        
        // Position suggestions below the input
        const input = document.getElementById(`${type}Input`);
        if (input) {
            input.parentNode.style.position = 'relative';
            suggestionsDiv.style.top = input.offsetHeight + 'px';
            suggestionsDiv.style.left = '0';
            suggestionsDiv.style.right = '0';
            input.parentNode.appendChild(suggestionsDiv);
        }
    }
    
    hideSuggestions(type) {
        const existingSuggestions = document.getElementById(`${type}Suggestions`);
        if (existingSuggestions) {
            existingSuggestions.remove();
        }
    }
    
    selectSuggestion(result, type) {
        const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
        
        if (type === 'start') {
            this.setStartPoint(latlng);
        } else if (type === 'end') {
            this.setEndPoint(latlng);
        }
        
        // Update input with selected address
        const input = document.getElementById(`${type}Input`);
        if (input) {
            input.value = result.display_name;
        }
        
        // Hide suggestions
        this.hideSuggestions(type);
        
        // Center map on the location
        this.map.setView(latlng, 15);
        
        // Show notification
        this.showNotification(`${type === 'start' ? 'Start' : 'End'} point set to: ${result.display_name}`, 'success');
    }
    
    async resolveAddress(address, type) {
        if (!address.trim()) return;
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', California')}&limit=1`);
            const results = await response.json();
            
            if (results.length > 0) {
                this.selectSuggestion(results[0], type);
            } else {
                this.showNotification('Address not found in California', 'error');
            }
        } catch (error) {
            console.error('Address resolution error:', error);
            this.showNotification('Failed to resolve address', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
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
            <input type="text" class="waypoint-input" id="waypointInput${waypointId}" placeholder="Enter California address or POI" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" />
        `;
        
        waypointsList.appendChild(waypointDiv);
        
        // Add address search functionality to this waypoint input
        const waypointInput = document.getElementById(`waypointInput${waypointId}`);
        if (waypointInput) {
            this.setupWaypointAddressSearch(waypointInput, waypointId);
        }
    }
    
    setupWaypointAddressSearch(input, waypointId) {
        // Add search functionality
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchWaypointAddress(e.target.value, waypointId);
            }, 500);
        });
        
        // Add enter key support
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.resolveWaypointAddress(e.target.value, waypointId);
            }
        });
        
        // Add blur event to hide suggestions when clicking away
        input.addEventListener('blur', () => {
            setTimeout(() => this.hideWaypointSuggestions(waypointId), 200);
        });
    }
    
    async searchWaypointAddress(query, waypointId) {
        if (query.length < 3) {
            this.hideWaypointSuggestions(waypointId);
            return;
        }
        
        try {
            // Use Nominatim API for address search, focused on California
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', California')}&limit=5&addressdetails=1`);
            const results = await response.json();
            
            this.displayWaypointSuggestions(results, waypointId);
        } catch (error) {
            console.error('Waypoint address search error:', error);
        }
    }
    
    displayWaypointSuggestions(results, waypointId) {
        // Remove existing suggestions
        this.hideWaypointSuggestions(waypointId);
        
        if (results.length === 0) return;
        
        // Create suggestions dropdown
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions waypoint-suggestions';
        suggestionsDiv.id = `waypointSuggestions${waypointId}`;
        
        results.forEach(result => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion-item';
            
            // Format display name
            let displayName = result.display_name;
            if (displayName.length > 60) {
                displayName = displayName.substring(0, 60) + '...';
            }
            
            suggestionDiv.textContent = displayName;
            suggestionDiv.addEventListener('click', () => {
                this.selectWaypointSuggestion(result, waypointId);
            });
            
            suggestionsDiv.appendChild(suggestionDiv);
        });
        
        // Find the waypoint input and position suggestions below it
        const waypointInput = document.querySelector(`.waypoint-item input`);
        if (waypointInput && waypointInput.closest('.waypoint-item').querySelector(`input[placeholder*="California"]`)) {
            const waypointItem = waypointInput.closest('.waypoint-item');
            waypointItem.style.position = 'relative';
            suggestionsDiv.style.top = waypointInput.offsetHeight + 'px';
            suggestionsDiv.style.left = '0';
            suggestionsDiv.style.right = '0';
            waypointItem.appendChild(suggestionsDiv);
        }
    }
    
    hideWaypointSuggestions(waypointId) {
        const existingSuggestions = document.getElementById(`waypointSuggestions${waypointId}`);
        if (existingSuggestions) {
            existingSuggestions.remove();
        }
    }
    
    selectWaypointSuggestion(result, waypointId) {
        const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
        
        // Update waypoint marker position
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (waypoint) {
            waypoint.latlng = latlng;
            waypoint.marker.setLatLng(latlng);
        }
        
        // Update input with selected address
        const waypointInput = document.querySelector(`.waypoint-item input[placeholder*="California"]`);
        if (waypointInput) {
            waypointInput.value = result.display_name;
        }
        
        // Hide suggestions
        this.hideWaypointSuggestions(waypointId);
        
        // Center map on the location
        this.map.setView(latlng, 15);
        
        // Show notification
        this.showNotification(`Waypoint set to: ${result.display_name}`, 'success');
    }
    
    async resolveWaypointAddress(address, waypointId) {
        if (!address.trim()) return;
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', California')}&limit=1`);
            const results = await response.json();
            
            if (results.length > 0) {
                this.selectWaypointSuggestion(results[0], waypointId);
            } else {
                this.showNotification('Address not found in California', 'error');
            }
        } catch (error) {
            console.error('Waypoint address resolution error:', error);
            this.showNotification('Failed to resolve address', 'error');
        }
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
                <input type="text" class="waypoint-input" id="waypointInput${waypoint.id}" placeholder="Enter California address or POI" value="${waypoint.latlng.lat.toFixed(6)}, ${waypoint.latlng.lng.toFixed(6)}" />
            `;
            
            waypointsList.appendChild(waypointDiv);
            
            // Add address search functionality to this waypoint input
            const waypointInput = document.getElementById(`waypointInput${waypoint.id}`);
            if (waypointInput) {
                this.setupWaypointAddressSearch(waypointInput, waypoint.id);
            }
        });
    }
    
    updateWaypointCounter() {
        const counter = document.getElementById('waypointCounter');
        if (counter) {
            counter.textContent = `Waypoints: ${this.waypoints.length}`;
        }
    }
    
    async setupTestRoute() {
        console.log('🧪 Setting up test route...');
        
        try {
            // Clear existing route
            this.clearRoute();
            
            // Set start point: 38695, Dow Court, Niles Junction, Niles District, Fremont, Alameda County, California, 94536, United States
            const startAddress = "38695, Dow Court, Niles Junction, Niles District, Fremont, Alameda County, California, 94536, United States";
            await this.resolveAddress(startAddress, 'start');
            
            // Set waypoint: Vargas Regional Park
            const waypointAddress = "Vargas Regional Park, Fremont, California";
            await this.addWaypointByAddress(waypointAddress);
            
            // Set end point: 38695, Dow Court, Niles Junction, Niles District, Fremont, Alameda County, California, 94536, United States
            const endAddress = "38695, Dow Court, Niles Junction, Niles District, Fremont, Alameda County, California, 94536, United States";
            await this.resolveAddress(endAddress, 'end');
            
            // Show notification
            this.showNotification('Test route setup complete! Click "Generate Route" to see the route.', 'success');
            
        } catch (error) {
            console.error('Test route setup error:', error);
            this.showNotification('Failed to setup test route', 'error');
        }
    }
    
    async addWaypointByAddress(address) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', California')}&limit=1`);
            const results = await response.json();
            
            if (results.length > 0) {
                const result = results[0];
                const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                
                // Add waypoint at the resolved location
                const waypointId = Date.now();
                const waypoint = {
                    id: waypointId,
                    latlng: latlng,
                    marker: L.marker(latlng, { icon: this.waypointIcon, draggable: true }).addTo(this.map)
                };
                
                this.waypoints.push(waypoint);
                this.addWaypointInput(waypointId, latlng);
                this.updateWaypointCounter();
                
                // Update input with resolved address
                const waypointInput = document.getElementById(`waypointInput${waypointId}`);
                if (waypointInput) {
                    waypointInput.value = result.display_name;
                }
                
                // Show notification
                this.showNotification(`Waypoint set to: ${result.display_name}`, 'success');
                
            } else {
                this.showNotification('Address not found in California', 'error');
            }
        } catch (error) {
            console.error('Waypoint address resolution error:', error);
            this.showNotification('Failed to resolve address', 'error');
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
    
    // Add test button for specific route
    setTimeout(() => {
        const testButton = document.createElement('button');
        testButton.textContent = '🧪 Test Fremont Route';
        testButton.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        testButton.addEventListener('click', () => {
            app.setupTestRoute();
        });
        
        document.body.appendChild(testButton);
    }, 1000);
});
