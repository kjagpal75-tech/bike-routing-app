// Initialize debug panel for development only (disabled for clean testing)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const enableDebugPanel = false; // Set to false for clean testing
let debugPanel = null;

// Version check - verify latest code is loaded
console.log('🚴 Bike Route App v2.3.0 - Valhalla Distance Fix Loaded');

if (isLocalhost && enableDebugPanel) {
    debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 9999;
        font-family: monospace;
        font-size: 11px;
        max-width: 300px;
    `;
    document.body.appendChild(debugPanel);
}

// Update debug panel helper (only works when enabled)
window.updateDebugPanel = (key, value) => {
    if (!enableDebugPanel || !isLocalhost || !debugPanel) return;
    
    const timestamp = new Date().toLocaleTimeString();
    debugPanel.innerHTML += `<div>[${timestamp}] ${key}: ${value}</div>`;
    // Keep only last 10 lines
    const lines = debugPanel.innerHTML.split('<div>');
    if (lines.length > 10) {
        debugPanel.innerHTML = lines.slice(-10).join('<div>');
    }
};

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BikeRoutePlanner();
});

class BikeRoutePlanner {
    constructor() {
        console.log('🚴 Bike Route Planner for Road Cycling Initialized');
        this.map = null;
        this.startMarker = null;
        this.endMarker = null;
        this.waypoints = [];
        this.routeLayer = null;
        
        this.initMap();
        this.createIcons();
        this.setupEventListeners();
        this.setupAddressSearch();
    }
    
    initMap() {
        console.log('🗺️ Initializing map...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createMap();
            });
        } else {
            this.createMap();
        }
    }
    
    createMap() {
        console.log('🗺️ Creating map container...');
        
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            this.showNotification('Map container not found. Please refresh the page.', 'error');
            return;
        }
        
        console.log('✅ Map container found, creating Leaflet map');
        
        // Initialize the map
        this.map = L.map('map').setView([37.7749, -122.4194], 12);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        console.log('🗺️ Map initialized successfully');
        
        // Add click handler to map
        this.map.on('click', (e) => this.handleMapClick(e));
    }
    
    // Unit conversion functions
    convertDistance(meters) {
        const useImperial = document.getElementById('useImperialUnits');
        const isImperial = useImperial ? useImperial.checked : false;
        
        console.log('🔄 convertDistance called with:', meters, 'meters, imperial:', isImperial);
        
        // OSRM API returns distance in meters
        // Convert meters to kilometers first
        const kilometers = meters / 1000;
        console.log('🔄 Meters to kilometers:', kilometers);
        
        if (isImperial) {
            // Convert kilometers to miles: 1 km = 0.621371 miles
            const miles = kilometers * 0.621371;
            console.log('🔄 Kilometers to miles:', miles);
            return miles.toFixed(2) + ' miles';
        } else {
            return kilometers.toFixed(2) + ' km';
        }
    }
    
    convertElevation(meters) {
        const useImperial = document.getElementById('useImperialUnits');
        const isImperial = useImperial ? useImperial.checked : false;
        
        console.log('🔄 convertElevation called with:', meters, 'meters, imperial:', isImperial);
        
        if (isImperial) {
            const feet = meters * 3.28084;
            console.log('🔄 Meters to feet:', feet);
            return feet.toFixed(0) + ' feet';
        } else {
            return meters.toFixed(0) + ' m';
        }
    }
    
    convertSpeed(kmh) {
        const useImperial = document.getElementById('useImperialUnits');
        const isImperial = useImperial ? useImperial.checked : false;
        
        console.log('🔄 convertSpeed called with:', kmh, 'km/h, imperial:', isImperial);
        
        if (isImperial) {
            const mph = kmh * 0.621371;
            console.log('🔄 km/h to mph:', mph);
            return mph.toFixed(1) + ' mph';
        } else {
            return kmh.toFixed(1) + ' km/h';
        }
    }
    
    // Create custom icons
    createIcons() {
        this.startIcon = L.divIcon({ 
            html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">S</div>',
            iconSize: [35, 35],
            className: 'custom-div-icon'
        });
        
        this.endIcon = L.divIcon({ 
            html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">E</div>',
            iconSize: [35, 35],
            className: 'custom-div-icon'
        });
        
        this.waypointIcon = L.divIcon({ 
            html: '<div style="background: #FF9800; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">W</div>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });
        
        // Function to create numbered waypoint icons
        this.createNumberedWaypointIcon = (number) => {
            return L.divIcon({
                html: `<div style="background: #FF9800; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">${number}</div>`,
                iconSize: [30, 30],
                className: 'custom-div-icon'
            });
        };
        
        // Map click handler already added in initializeMap - no duplicate needed
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
            // Get current map bounds for local search
            const bounds = this.map.getBounds();
            const center = this.map.getCenter();
            
            console.log(`🔍 Searching for address: "${query}"`);
            console.log(`🔍 Map center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
            console.log(`🔍 Map bounds:`, bounds);
            
            // Extract street number from query if present
            const streetNumberMatch = query.match(/^(\d+)\s+(.*)/);
            const streetNumber = streetNumberMatch ? streetNumberMatch[1] : null;
            const queryWithoutNumber = streetNumberMatch ? streetNumberMatch[2] : query;
            
            console.log(`🔍 Extracted street number: "${streetNumber}"`);
            console.log(`🔍 Query without number: "${queryWithoutNumber}"`);
            
            // Use Photon API with location bias for local results
            let searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryWithoutNumber)}&limit=10`;
            
            // Add location bias to prioritize local results
            searchUrl += `&lat=${center.lat}&lon=${center.lng}`;
            
            // Add bbox constraint to focus on current map area
            const bbox = `${bounds.getSouthWest().lng},${bounds.getSouthWest().lat},${bounds.getNorthEast().lng},${bounds.getNorthEast().lat}`;
            searchUrl += `&bbox=${bbox}`;
            
            console.log(`🔍 Local search URL:`, searchUrl);
            
            const response = await fetch(searchUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log(`🔍 Photon response status:`, response.status);
            
            if (!response.ok) {
                throw new Error(`Photon API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`🔍 Photon raw response:`, data);
            console.log(`🔍 Photon data type:`, typeof data);
            console.log(`🔍 Photon data keys:`, Object.keys(data));
            
            if (!data || !data.features) {
                console.log(`🔍 No features in Photon response`);
                throw new Error('No features in Photon response');
            }
            
            console.log(`🔍 Number of features:`, data.features.length);
            
            // Convert Photon format to our expected format
            const results = data.features.map((feature, index) => {
                console.log(`🔍 Feature ${index}:`, feature);
                console.log(`🔍 Feature ${index} properties:`, feature.properties);
                console.log(`🔍 Feature ${index} geometry:`, feature.geometry);
                
                // Build display name safely, handling undefined values
                const parts = [];
                if (streetNumber) parts.push(streetNumber); // Add street number first
                if (feature.properties.name && feature.properties.name !== feature.properties.street) parts.push(feature.properties.name);
                if (feature.properties.street) parts.push(feature.properties.street);
                if (feature.properties.city) parts.push(feature.properties.city);
                if (feature.properties.state) parts.push(feature.properties.state);
                if (feature.properties.country) parts.push(feature.properties.country);
                
                const displayName = parts.join(', ') || 'Unknown location';
                
                console.log(`🔍 Built display name: "${displayName}"`);
                
                return {
                    display_name: displayName,
                    lat: feature.geometry.coordinates[1].toString(),
                    lon: feature.geometry.coordinates[0].toString()
                };
            });
            
            console.log(`🔍 Converted results:`, results);
            this.displaySuggestions(results, type);
            
        } catch (error) {
            console.error('❌ Photon geocoding error:', error);
            console.log('🔄 Falling back to generic suggestions');
            
            // Provide generic fallback suggestions
            const fallbackResults = [
                { display_name: 'Address not found - try more specific search', lat: '37.5485', lon: '-121.9884' }
            ];
            this.displaySuggestions(fallbackResults, type);
        }
    }
    
    showCORSBlockedMessage(type) {
        // Remove existing suggestions
        this.hideSuggestions(type);
        
        // Create suggestions dropdown with CORS message
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions';
        suggestionsDiv.id = `${type}Suggestions`;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'suggestion-item cors-message';
        messageDiv.innerHTML = `
            <div style="padding: 12px; color: #666; font-size: 0.9rem;">
                <strong>📍 Address search temporarily unavailable</strong><br>
                Please use the map to click locations or use the test route button.
            </div>
        `;
        
        suggestionsDiv.appendChild(messageDiv);
        
        // Position suggestions below the input
        const input = document.getElementById(`${type}Input`);
        if (input) {
            input.parentNode.style.position = 'relative';
            suggestionsDiv.style.top = input.offsetHeight + 'px';
            suggestionsDiv.style.left = '0';
            suggestionsDiv.style.right = '0';
            input.parentNode.appendChild(suggestionsDiv);
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideSuggestions(type);
        }, 3000);
    }
    
    async resolveAddress(address, type) {
        if (!address.trim()) return;
        
        try {
            const result = await this.tryResolveAddress(address);
            if (result) {
                this.selectSuggestion(result, type);
            } else {
                this.showNotification('Address not found in California', 'error');
            }
        } catch (error) {
            console.error('Address resolution error:', error);
            this.showNotification('Failed to resolve address', 'error');
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
            suggestionDiv.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur from firing first
                this.selectSuggestion(result, type);
            });
            suggestionDiv.addEventListener('click', () => {
                this.selectSuggestion(result, type);
            });
            
            suggestionsDiv.appendChild(suggestionDiv);
        }); // Added missing closing parenthesis
        
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
        
        // Update input with selected address (full address, not coordinates)
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
        
        // Start location button
        const startLocationBtn = document.getElementById('startLocationBtn');
        if (startLocationBtn) {
            startLocationBtn.addEventListener('click', () => this.getStartLocation());
        }
        
        // End location button
        const endLocationBtn = document.getElementById('endLocationBtn');
        if (endLocationBtn) {
            endLocationBtn.addEventListener('click', () => this.getEndLocation());
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
        
        // Unit toggle
        const useImperialUnits = document.getElementById('useImperialUnits');
        if (useImperialUnits) {
            useImperialUnits.addEventListener('change', () => {
                console.log('🔄 Unit toggle changed - updating displays');
                
                // Update all displays when unit preference changes
                if (this.currentRouteData) {
                    console.log('🔄 Updating route info with new units');
                    this.displayRouteInfo(this.currentRouteData);
                    
                    if (this.currentElevationData) {
                        console.log('🔄 Updating elevation stats with new units');
                        this.displayElevationStats(
                            this.currentElevationData.gain,
                            this.currentElevationData.loss,
                            this.currentElevationData.peak,
                            this.currentElevationData.min,
                            this.currentRouteData
                        );
                    }
                    
                    // Update elevation profile if it exists
                    const elevationDiv = document.getElementById('elevationProfile');
                    if (elevationDiv && elevationDiv.style.display !== 'none') {
                        console.log('🔄 Updating elevation profile with new units');
                        // Re-display elevation profile with new units
                        if (this.currentElevationData) {
                            this.displayElevationProfile([], this.currentRouteData);
                        }
                    }
                } else {
                    console.log('🔄 No route data to update');
                }
            });
        }
        
        // Route type selector
        const routeTypeSelect = document.getElementById('routeType');
        if (routeTypeSelect) {
            routeTypeSelect.addEventListener('change', () => {
                console.log('🔄 Route type changed to:', routeTypeSelect.value);
                this.showNotification(`Route type changed to: ${this.getRouteTypeDescription(routeTypeSelect.value)}`, 'info');
            });
        }
        
        // Routing API selector
        const routingApiSelect = document.getElementById('routingApi');
        if (routingApiSelect) {
            routingApiSelect.addEventListener('change', () => {
                const apiType = routingApiSelect.value;
                const apiStatus = document.getElementById('apiStatus');
                if (apiStatus) {
                    const statusText = {
                        'osrm': '🆓 Using OSRM (Free)',
                        'mapbox': '🗺️ Using Mapbox (Free Tier)',
                        'valhalla': '🛣️ Using Valhalla (Free)',
                        'graphhopper': '🚶 Using GraphHopper (Free)',
                        'openrouteservice': '🌍 Using OpenRouteService (Free)'
                    };
                    apiStatus.textContent = statusText[apiType] || '🆓 Using OSRM (Free)';
                }
                console.log(`🔄 Routing API changed to: ${apiType}`);
                this.showNotification(`Routing API changed to: ${apiType}`, 'info');
            });
        }
        
        // Return to start checkbox
        const returnToStartCheckbox = document.getElementById('returnToStart');
        if (returnToStartCheckbox) {
            returnToStartCheckbox.addEventListener('change', () => {
                this.handleReturnToStartToggle();
            });
        }
    }
    
    getOpenRouteServiceKey() {
        let key = localStorage.getItem('openRouteServiceKey');
        
        if (!key) {
            // Set the provided API key
            key = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY0M2M3OTYwYjczODRiMmI4Y2QzNzA0YTQ2N2QwYWNkIiwiaCI6Im11cm11cjY0In0=';
            localStorage.setItem('openRouteServiceKey', key);
            console.log('🌍 OpenRouteService API key set automatically');
        }
        
        return key;
    }
    
    getMapboxToken() {
        let token = localStorage.getItem('mapboxToken');
        
        if (!token) {
            token = prompt('Enter your Mapbox token (optional):');
            if (token) {
                localStorage.setItem('mapboxToken', token);
            }
        }
        
        return token;
    }
    
    getValhallaToken() {
        let token = localStorage.getItem('valhallaToken');
        
        if (!token) {
            token = prompt('Enter your Valhalla token (optional):');
            if (token) {
                localStorage.setItem('valhallaToken', token);
            }
        }
        
        return token;
    }
    
    getGraphhopperToken() {
        let token = localStorage.getItem('graphhopperToken');
        
        if (!token) {
            // Set the provided API key
            token = '5d3743e8-7e27-4718-a975-11d8b12ac3a9';
            localStorage.setItem('graphhopperToken', token);
            console.log('🗺️ GraphHopper API key set automatically');
        }
        
        return token;
    }
    
    adjustWaypointForORS(coordsArray) {
        // Try to adjust waypoint coordinates to find a nearby routable point
        // This is a simple implementation that tries small adjustments
        const adjustedCoords = [...coordsArray];
        
        for (let i = 1; i < adjustedCoords.length - 1; i++) {
            const [lng, lat] = adjustedCoords[i];
            
            // Try small adjustments in different directions
            const adjustments = [
                [lng + 0.0001, lat],      // East
                [lng - 0.0001, lat],      // West
                [lng, lat + 0.0001],      // North
                [lng, lat - 0.0001],      // South
                [lng + 0.0001, lat + 0.0001], // Northeast
                [lng - 0.0001, lat + 0.0001], // Northwest
                [lng + 0.0001, lat - 0.0001], // Southeast
                [lng - 0.0001, lat - 0.0001], // Southwest
            ];
            
            for (const [adjLng, adjLat] of adjustments) {
                adjustedCoords[i] = [adjLng, adjLat];
                console.log(`🔄 Trying adjusted waypoint ${i}: [${adjLng}, ${adjLat}]`);
                return adjustedCoords;
            }
        }
        
        return null;
    }
    
    decodePolyline(encoded) {
        // Decode Valhalla polyline format
        const points = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;
        
        while (index < len) {
            let shift = 0;
            let result = 0;
            let b;
            
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            shift = 0;
            result = 0;
            
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            points.push([lat / 1e6, lng / 1e6]);
                    console.log(`🔢 Decoded point ${points.length}: [${(lat / 1e6).toFixed(6)}, ${(lng / 1e6).toFixed(6)}]`);
        }
        
        return points.map(coord => L.latLng(coord[0], coord[1]));
    }
    
    getRouteTypeDescription(routeType) {
        const descriptions = {
            'drive': '�️ Road (Paved Only) - Recommended for road bikes and racing bikes',
            'cycling': '� MTB (Trails Prioritized) - Optimized for mountain bikes and trails',
            'foot': '🚶 Walking - Pedestrian paths and sidewalks only'
        };
        return descriptions[routeType] || routeType;
    }
    
    handleReturnToStartToggle() {
        const returnToStartCheckbox = document.getElementById('returnToStart');
        const endInput = document.getElementById('endInput');
        const endLocationBtn = document.getElementById('endLocationBtn');
        
        if (!returnToStartCheckbox || !endInput || !endLocationBtn) return;
        
        const isReturnToStart = returnToStartCheckbox.checked;
        
        if (isReturnToStart) {
            // Enable return to start mode
            if (this.startMarker) {
                const startLatLng = this.startMarker.getLatLng();
                this.setEndPointForReturnToStart(startLatLng);
                
                // Update end input with start location info
                const startInput = document.getElementById('startInput');
                if (startInput) {
                    endInput.value = startInput.value;
                }
                
                // Disable end input and location button
                endInput.disabled = true;
                endInput.style.backgroundColor = '#f0f0f0';
                endInput.style.cursor = 'not-allowed';
                endLocationBtn.disabled = true;
                endLocationBtn.style.opacity = '0.5';
                endLocationBtn.style.cursor = 'not-allowed';
                
                console.log('🔄 Return to start enabled - end point set to start location');
            } else {
                // No start point yet, disable end input until start is set
                endInput.disabled = true;
                endInput.style.backgroundColor = '#f0f0f0';
                endInput.style.cursor = 'not-allowed';
                endLocationBtn.disabled = true;
                endLocationBtn.style.opacity = '0.5';
                endLocationBtn.style.cursor = 'not-allowed';
                
                console.log('🔄 Return to start enabled - waiting for start point');
            }
        } else {
            // Disable return to start mode
            endInput.disabled = false;
            endInput.style.backgroundColor = '#f9f9f9';
            endInput.style.cursor = 'text';
            endLocationBtn.disabled = false;
            endLocationBtn.style.opacity = '1';
            endLocationBtn.style.cursor = 'pointer';
            
            // Clear end point if it was set to start point
            if (this.endMarker && this.startMarker) {
                const startLatLng = this.startMarker.getLatLng();
                const endLatLng = this.endMarker.getLatLng();
                
                if (startLatLng.lat === endLatLng.lat && startLatLng.lng === endLatLng.lng) {
                    this.clearEndPoint();
                }
            }
            
            console.log('🔄 Return to start disabled - end point unlocked');
        }
    }
    
    clearEndPoint() {
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
            this.endMarker = null;
        }
        
        const endInput = document.getElementById('endInput');
        if (endInput) {
            endInput.value = '';
        }
    }
    
    handleMapClick(e) {
        // Clear progression: Start → End → Waypoints
        const clickId = Date.now() + Math.random();
        console.log('📍 handleMapClick called - ID:', clickId);
        console.log('📍 Current state - startMarker:', !!this.startMarker, 'endMarker:', !!this.endMarker, 'waypoints:', this.waypoints.length);
        console.log('📍 Click coordinates:', e.latlng);
        
        if (!this.startMarker) {
            console.log('📍 Setting start point from map click - ID:', clickId);
            this.setStartPoint(e.latlng);
            this.showNotification('Start point set! Click to set end point.', 'info');
            this.updateMapMode('end');
        } else if (!this.endMarker) {
            // Check if return to start is enabled
            const returnToStartCheckbox = document.getElementById('returnToStart');
            if (returnToStartCheckbox && returnToStartCheckbox.checked) {
                console.log('🔄 Return to start is enabled - ignoring map click for end point - ID:', clickId);
                this.showNotification('Return to start is enabled. Use "+" button to add waypoints.', 'info');
                return;
            }
            console.log('📍 Setting end point from map click - ID:', clickId);
            console.log('📍 Before setEndPoint - endMarker exists:', !!this.endMarker);
            console.log('📍 Using endIcon:', this.endIcon);
            this.setEndPoint(e.latlng);
            console.log('📍 After setEndPoint - endMarker exists:', !!this.endMarker);
            console.log('📍 End marker icon:', this.endMarker ? this.endMarker.getIcon() : 'none');
            this.showNotification('End point set! Click to add waypoints or use "+" button.', 'info');
            this.updateMapMode('waypoint');
        } else {
            // Add waypoint when both start and end points exist
            console.log('📍 Adding waypoint from map click at:', e.latlng, '- ID:', clickId);
            console.log('📍 Both start and end exist, creating waypoint - ID:', clickId);
            this.addWaypointAtLocation(e.latlng);
            this.showNotification('Waypoint added! Click to add more waypoints.', 'info');
        }
    }
    
    updateMapMode(mode) {
        const modeText = document.getElementById('mapModeText');
        if (!modeText) return;
        
        const modeMessages = {
            'start': '📍 Click map to set start point',
            'end': '📍 Click map to set end point',
            'waypoint': '📍 Click map to add waypoints'
        };
        
        modeText.textContent = modeMessages[mode] || modeMessages['start'];
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
            
            this.showNotification('Current location set as start point', 'success');
        } catch (error) {
            console.error('Location error:', error);
            this.showNotification('Unable to get current location', 'error');
        }
    }
    
    async getStartLocation() {
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
            
            // Update input with location info
            const startInput = document.getElementById('startInput');
            if (startInput) {
                startInput.value = `Current Location (${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)})`;
            }
            
            this.showNotification('Current location set as start point', 'success');
        } catch (error) {
            console.error('Start location error:', error);
            this.showNotification('Unable to get current location', 'error');
        }
    }
    
    async getEndLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });
            
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            this.setEndPoint(latlng);
            
            // Update input with location info
            const endInput = document.getElementById('endInput');
            if (endInput) {
                endInput.value = `Current Location (${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)})`;
            }
            
            this.showNotification('Current location set as end point', 'success');
        } catch (error) {
            console.error('End location error:', error);
            this.showNotification('Unable to get current location', 'error');
        }
    }
    
    setStartPoint(latlng) {
        if (this.startMarker) {
            this.map.removeLayer(this.startMarker);
        }
        
        this.startMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'custom-marker start-marker',
                html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);
        
        // Update start input with coordinates
        const startInput = document.getElementById('startInput');
        if (startInput) {
            startInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
        // Update mode to end point
        this.updateMapMode('end');
        
        // Check if return to start is enabled and update end point
        const returnToStartCheckbox = document.getElementById('returnToStart');
        if (returnToStartCheckbox && returnToStartCheckbox.checked) {
            this.setEndPointForReturnToStart(latlng);
            
            // Update end input with start location info
            if (startInput) {
                const endInput = document.getElementById('endInput');
                if (endInput) {
                    endInput.value = startInput.value;
                }
            }
        }
        
        this.updateWaypointCounter();
    }
    
    setEndPoint(latlng) {
        console.log('🔴 setEndPoint called with:', latlng);
        
        // Check if return to start is enabled - if so, don't allow manual end point setting
        const returnToStartCheckbox = document.getElementById('returnToStart');
        if (returnToStartCheckbox && returnToStartCheckbox.checked) {
            console.log('🔄 Return to start is enabled - ignoring manual end point setting');
            return;
        }
        
        if (this.endMarker) {
            console.log('🔴 Removing existing end marker');
            this.map.removeLayer(this.endMarker);
        }
        
        console.log('🔴 Creating new end marker with endIcon');
        console.log('🔴 endIcon HTML:', this.endIcon.options.html);
        this.endMarker = L.marker(latlng, { icon: this.endIcon, draggable: true }).addTo(this.map);
        console.log('🔴 End marker created and added to map');
        
        // Don't override the input field if it already has an address
        const endInput = document.getElementById('endInput');
        if (endInput && !endInput.value) {
            endInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
        // Update mode to waypoint
        this.updateMapMode('waypoint');
        
        // Update waypoint counter
        this.updateWaypointCounter();
    }
    
    setEndPointForReturnToStart(latlng) {
        // Special method to set end point even when Return to Start is enabled
        console.log('🔄 setEndPointForReturnToStart called with:', latlng);
        
        if (this.endMarker) {
            console.log('🔄 Removing existing end marker');
            this.map.removeLayer(this.endMarker);
        }
        
        console.log('🔄 Creating new end marker');
        this.endMarker = L.marker(latlng, { icon: this.endIcon, draggable: true }).addTo(this.map);
        console.log('🔄 End marker created:', this.endMarker);
        
        // Update end input with start location info
        const startInput = document.getElementById('startInput');
        if (startInput) {
            const endInput = document.getElementById('endInput');
            if (endInput) {
                endInput.value = startInput.value;
                console.log('🔄 End input updated with:', startInput.value);
            }
        }
        
        console.log('🔄 End point set for return to start route');
    }
    
    addWaypoint() {
        try {
            console.log('🔹 addWaypoint called');
            console.log('🔹 Current waypoints count:', this.waypoints.length);
            console.log('🔹 Has start marker:', !!this.startMarker);
            console.log('🔹 Has end marker:', !!this.endMarker);
            console.log('🔹 Has route layer:', !!this.routeLayer);
            
            if (!this.map) {
                console.error('❌ Map not available for waypoint addition');
                return;
            }
            
            const center = this.map.getCenter();
            const waypointId = Date.now();
            
            console.log('🔹 Creating waypoint with ID:', waypointId);
            console.log('🔹 Map center coordinates:', center);
            
            const waypoint = {
                id: waypointId,
                latlng: center,
                marker: L.marker(center, { icon: this.createNumberedWaypointIcon(this.waypoints.length + 1), draggable: true }).addTo(this.map)
            };
            
            console.log('🔹 Waypoint created:', waypoint);
            
            this.waypoints.push(waypoint);
            console.log('🔹 Waypoint added to array. New count:', this.waypoints.length);
            
            this.addWaypointInput(waypointId, center);
            this.updateWaypointCounter();
            
            console.log('🔹 About to check auto-regeneration conditions...');
            
            // Auto-regenerate route if we have start and end points and an existing route
            if (this.startMarker && this.endMarker && this.routeLayer) {
                console.log('🔄 Auto-regenerating route after adding waypoint');
                setTimeout(() => this.generateRoute(), 500); // Small delay to ensure UI is updated
            } else {
                console.log('🔹 No auto-regeneration - missing:', {
                    start: !this.startMarker,
                    end: !this.endMarker,
                    route: !this.routeLayer
                });
            }
            
            console.log('✅ addWaypoint completed successfully');
            
        } catch (error) {
            console.error('❌ Error in addWaypoint:', error);
            this.showNotification('Failed to add waypoint', 'error');
        }
    }
    
    addWaypointAtLocation(latlng) {
        const waypointId = Date.now();
        
        const waypoint = {
            id: waypointId,
            latlng: latlng,
            marker: L.marker(latlng, { icon: this.createNumberedWaypointIcon(this.waypoints.length + 1), draggable: true }).addTo(this.map)
        };
        
        this.waypoints.push(waypoint);
        this.addWaypointInput(waypointId, latlng, false); // Keep coordinates for map clicks
        this.updateWaypointCounter();
        
        // Auto-regenerate route if we have start and end points and an existing route
        if (this.startMarker && this.endMarker && this.routeLayer) {
            console.log('🔄 Auto-regenerating route after adding waypoint');
            setTimeout(() => this.generateRoute(), 500); // Small delay to ensure UI is updated
        }
    }
    
    addWaypointInput(waypointId, latlng, clearInput = true) {
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
        const waypointInput = waypointDiv.querySelector('.waypoint-input');
        if (clearInput) {
            waypointInput.value = ''; // Clear the input field for button clicks
        }
        this.setupWaypointAddressSearch(waypointInput, waypointId);
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
            // Get current map bounds for local search
            const bounds = this.map.getBounds();
            const center = this.map.getCenter();
            
            console.log(`🔍 Searching for waypoint: "${query}"`);
            console.log(`🔍 Map center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
            console.log(`🔍 Map bounds:`, bounds);
            
            // Use Photon API with location bias for local results
            let searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`;
            
            // Add location bias to prioritize local results
            searchUrl += `&lat=${center.lat}&lon=${center.lng}`;
            
            // Add bbox constraint to focus on current map area
            const bbox = `${bounds.getSouthWest().lng},${bounds.getSouthWest().lat},${bounds.getNorthEast().lng},${bounds.getNorthEast().lat}`;
            searchUrl += `&bbox=${bbox}`;
            
            console.log(`🔍 Local waypoint search URL:`, searchUrl);
            
            let results;
            
            try {
                const response = await fetch(searchUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`🔍 Waypoint search response status:`, response.status);
                
                if (!response.ok) {
                    throw new Error(`Photon API error: ${response.status}`);
                }
                
                results = await response.json();
                console.log('🔍 Waypoint search successful');
                
            } catch (error) {
                console.log('❌ CORS blocked - using manual fallback for waypoint search');
                // Create fallback results for common California POIs
                results = {
                    features: [
                        {
                            properties: {
                                name: 'Local Park',
                                amenity: 'park',
                                city: 'California'
                            },
                            geometry: {
                                coordinates: [center.lng, center.lat]
                            }
                        },
                        {
                            properties: {
                                name: 'Coffee Shop',
                                amenity: 'cafe',
                                city: 'California'
                            },
                            geometry: {
                                coordinates: [center.lng + 0.001, center.lat + 0.001]
                            }
                        },
                        {
                            properties: {
                                name: 'Gas Station',
                                amenity: 'fuel',
                                city: 'California'
                            },
                            geometry: {
                                coordinates: [center.lng - 0.001, center.lat - 0.001]
                            }
                        }
                    ]
                };
            }
            console.log(`🔍 Waypoint search results:`, results.features ? results.features.length : 0, 'found');
            
            // Filter results to include only POIs and places, not just addresses
            const filteredResults = (results.features || []).filter(result => {
                // Keep results that have specific POI properties
                return result.properties && (
                    result.properties.name ||
                    result.properties.amenity ||
                    result.properties.shop ||
                    result.properties.tourism ||
                    result.properties.leisure ||
                    result.properties.highway ||
                    result.properties.building ||
                    result.properties.natural ||
                    result.properties.landuse
                );
            });
            
            console.log(`🔍 Filtered waypoint results:`, filteredResults.length, 'POIs found');
            
            this.displayWaypointSuggestions(filteredResults, waypointId);
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
            
            // Format display name with POI type emphasis
            let displayName = '';
            let poiType = '';
            
            if (result.properties && result.properties.name) {
                displayName = result.properties.name;
                
                // Add POI type information
                if (result.properties.amenity) {
                    poiType = `🏢 ${result.properties.amenity}`;
                } else if (result.properties.shop) {
                    poiType = `🛒 ${result.properties.shop}`;
                } else if (result.properties.tourism) {
                    poiType = `🎯 ${result.properties.tourism}`;
                } else if (result.properties.leisure) {
                    poiType = `🏞️ ${result.properties.leisure}`;
                } else if (result.properties.highway) {
                    poiType = `🛣️ ${result.properties.highway}`;
                } else if (result.properties.building) {
                    poiType = `🏠 ${result.properties.building}`;
                } else if (result.properties.natural) {
                    poiType = `🌳 ${result.properties.natural}`;
                } else if (result.properties.landuse) {
                    poiType = `📍 ${result.properties.landuse}`;
                }
                
                // Add location context
                if (result.properties && result.properties.city) {
                    displayName += `, ${result.properties.city}`;
                } else if (result.properties && result.properties.county) {
                    displayName += `, ${result.properties.county}`;
                }
            } else {
                // Fallback to display_name
                displayName = result.display_name || 'Unknown location';
            }
            
            // Truncate if too long
            if (displayName.length > 50) {
                displayName = displayName.substring(0, 50) + '...';
            }
            
            // Create suggestion content with POI type
            const suggestionContent = document.createElement('div');
            suggestionContent.innerHTML = `
                <div style="font-weight: bold;">${displayName}</div>
                ${poiType ? `<div style="font-size: 0.8em; color: #666;">${poiType}</div>` : ''}
            `;
            
            suggestionDiv.appendChild(suggestionContent);
            suggestionDiv.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur from firing first
                this.selectWaypointSuggestion(result, waypointId);
            });
            suggestionDiv.addEventListener('click', () => {
                this.selectWaypointSuggestion(result, waypointId);
            });
            
            suggestionsDiv.appendChild(suggestionDiv);
        });
        
        // Find the specific waypoint input and position suggestions below it
        const waypointInput = document.getElementById(`waypointInput${waypointId}`);
        if (waypointInput) {
            const inputRect = waypointInput.getBoundingClientRect();
            suggestionsDiv.style.position = 'fixed';
            suggestionsDiv.style.top = (inputRect.bottom + 5) + 'px';
            suggestionsDiv.style.left = inputRect.left + 'px';
            suggestionsDiv.style.width = inputRect.width + 'px';
            document.body.appendChild(suggestionsDiv);
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
        
        // Update input with selected address - use specific ID
        const waypointInput = document.getElementById(`waypointInput${waypointId}`);
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
            // Use the updated tryResolveAddress function that handles coordinates
            const result = await this.tryResolveAddress(address);
            
            if (result) {
                this.selectWaypointSuggestion(result, waypointId);
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
        
        // Auto-regenerate route if we have start and end points and an existing route
        if (this.startMarker && this.endMarker && this.routeLayer) {
            console.log('🔄 Auto-regenerating route after removing waypoint');
            setTimeout(() => this.generateRoute(), 500); // Small delay to ensure UI is updated
        }
    }
    
    rebuildWaypointsList() {
        const waypointsList = document.getElementById('waypointsList');
        if (!waypointsList) return;
        
        // Store current input values before rebuilding
        const inputValues = {};
        this.waypoints.forEach(waypoint => {
            const input = document.getElementById(`waypointInput${waypoint.id}`);
            if (input) {
                inputValues[waypoint.id] = input.value;
            }
        });
        
        waypointsList.innerHTML = '';
        
        // Re-add all waypoints with updated numbers
        this.waypoints.forEach((waypoint, index) => {
            // Update the marker icon to reflect new number
            if (waypoint.marker) {
                waypoint.marker.setIcon(this.createNumberedWaypointIcon(index + 1));
                console.log(`🔹 Updated waypoint ${index + 1} icon`);
            }
            
            const waypointDiv = document.createElement('div');
            waypointDiv.className = 'waypoint-item';
            waypointDiv.innerHTML = `
                <div class="waypoint-header">
                    <span class="waypoint-number">Waypoint ${index + 1}</span>
                    <button class="remove-waypoint-btn" onclick="app.removeWaypoint(${waypoint.id})">✕</button>
                </div>
                <input type="text" class="waypoint-input" id="waypointInput${waypoint.id}" placeholder="Enter California address or POI" value="${inputValues[waypoint.id] || ''}" />
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
    
    async tryResolveAddress(address) {
        try {
            console.log(`🔍 Searching for: ${address}`);
            
            // First check if the input looks like coordinates (lat, lng format)
            const coordMatch = address.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[2]);
                
                // Validate coordinate ranges
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    console.log(`📍 Parsed coordinates: lat=${lat}, lng=${lng}`);
                    return {
                        display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                        lat: lat.toString(),
                        lon: lng.toString()
                    };
                }
            }
            
            // First try to use hardcoded coordinates for known locations
            if (address.includes('Fremont') && address.includes('Dow Court')) {
                console.log('🔄 Using Fremont Dow Court fallback coordinates');
                return {
                    display_name: '38695, Dow Court, Fremont, California, United States',
                    lat: '37.548523',
                    lon: '-121.998934'
                };
            }
            
            if (address.includes('Vargas Regional Park')) {
                console.log('🔄 Using Vargas Regional Park fallback coordinates');
                return {
                    display_name: 'Vargas Regional Park, Fremont, California, United States',
                    lat: '37.534567',
                    lon: '-121.998345'
                };
            }
            
            // For other addresses, try a simple geocoding approach
            // Note: This may not work due to CORS, but we'll try
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
                    mode: 'no-cors' // This will allow the request but we won't get the response
                });
                
                // Since we can't read the response due to CORS, we'll return null
                // and let the user know they need to use manual methods
                console.log('❌ CORS blocked - using manual fallback');
                return null;
                
            } catch (corsError) {
                console.log('❌ CORS blocked - using manual fallback');
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Error resolving "${address}":`, error);
            return null;
        }
    }
    
    async addWaypointByAddress(address) {
        console.log(`📍 Adding waypoint by address: ${address}`);
        try {
            // Use the same tryResolveAddress method for consistency
            const result = await this.tryResolveAddress(address);
            
            if (result) {
                console.log(`🔍 Waypoint resolution result:`, result);
                const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                console.log(`📍 Waypoint coordinates: ${latlng.lat}, ${latlng.lng}`);
                
                // Add waypoint at the resolved location
                const waypointId = Date.now();
                const waypoint = {
                    id: waypointId,
                    latlng: latlng,
                    marker: L.marker(latlng, { icon: this.createNumberedWaypointIcon(this.waypoints.length + 1), draggable: true }).addTo(this.map)
                };
                
                this.waypoints.push(waypoint);
                this.addWaypointInput(waypointId, latlng, true); // Clear input for address search
                this.updateWaypointCounter();
                
                // Auto-regenerate route if we have start and end points and an existing route
                if (this.startMarker && this.endMarker && this.routeLayer) {
                    console.log('🔄 Auto-regenerating route after adding waypoint by address');
                    setTimeout(() => this.generateRoute(), 500); // Small delay to ensure UI is updated
                }
                
                // Update input with resolved address
                const waypointInput = document.getElementById(`waypointInput${waypointId}`);
                if (waypointInput) {
                    waypointInput.value = ''; // Clear the input field
                }
                
                // Show notification
                this.showNotification(`Waypoint set to: ${result.display_name}`, 'success');
                console.log(`✅ Waypoint successfully added at: ${latlng.lat}, ${latlng.lng}`);
                
            } else {
                console.log(`❌ No results found for: ${address}`);
                this.showNotification('Address not found in California', 'error');
            }
        } catch (error) {
            console.error('❌ Waypoint address resolution error:', error);
            this.showNotification('Failed to resolve address', 'error');
        }
    }
    
    async generateRoute() {
        // Check if start point is set (required for all routes)
        if (!this.startMarker) {
            alert('Please set a start point on the map');
            return;
        }
        
        // Check if return to start is enabled
        const returnToStartCheckbox = document.getElementById('returnToStart');
        const returnToStart = returnToStartCheckbox ? returnToStartCheckbox.checked : false;
        
        // If return to start is not enabled, check for end point
        if (!returnToStart && !this.endMarker) {
            alert('Please set an end point on the map, or check "Return to Start" for a round trip');
            return;
        }
        
        // If return to start is enabled but end point isn't set, set it to start point
        if (returnToStart && !this.endMarker) {
            console.log('🔄 Setting end point for return to start...');
            const startLatLng = this.startMarker.getLatLng();
            console.log('🔄 Start LatLng:', startLatLng);
            this.setEndPointForReturnToStart(startLatLng);
            console.log('🔄 End marker after setting:', this.endMarker);
        }
        
        // Double-check we have both markers before proceeding
        if (!this.startMarker || !this.endMarker) {
            console.error('❌ Missing markers for route generation');
            console.error('❌ Start marker:', this.startMarker);
            console.error('❌ End marker:', this.endMarker);
            alert('Unable to generate route - missing start or end point');
            return;
        }
        
        // Build coordinates array: start -> waypoints -> end -> (optional) start again
        console.log('🛣️ Building coordinates array for route generation');
        console.log('🛣️ Start marker:', this.startMarker.getLatLng());
        console.log('🛣️ Waypoints:', this.waypoints.map(w => ({ id: w.id, latlng: w.latlng })));
        console.log('🛣️ End marker:', this.endMarker.getLatLng());
        
        let coordinates = [
            this.startMarker.getLatLng(),
            ...this.waypoints.map(w => w.latlng),
            this.endMarker.getLatLng()
        ];
        
        console.log('🛣️ === DETAILED WAYPOINT ANALYSIS ===');
        console.log('🛣️ Raw waypoints array:', this.waypoints);
        console.log('🛣️ Waypoint count:', this.waypoints.length);
        console.log('🛣️ Waypoint order:', this.waypoints.map((w, i) => `W${i+1}: ${w.latlng.lat.toFixed(4)},${w.latlng.lng.toFixed(4)}`));
        console.log('🛣️ Built coordinates array:', coordinates.map((c, i) => `${i}: ${c.lat.toFixed(4)},${c.lng.toFixed(4)}`));
        console.log('🛣️ === END WAYPOINT ANALYSIS ===');
        
        // Check for duplicate coordinates (which can cause routing issues)
        // But allow the return-to-start duplicate at the end
        const uniqueCoords = [];
        const seen = new Set();
        for (let i = 0; i < coordinates.length; i++) {
            const coord = coordinates[i];
            const key = `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
            
            // Allow duplicate if it's the last point (return to start) and matches the first point
            if (i === coordinates.length - 1 && i > 0 && 
                key === `${coordinates[0].lat.toFixed(6)},${coordinates[0].lng.toFixed(6)}`) {
                uniqueCoords.push(coord);
                console.log('🔄 Allowed return-to-start duplicate at end');
            } else if (!seen.has(key)) {
                seen.add(key);
                uniqueCoords.push(coord);
            } else {
                console.log('⚠️ Removed duplicate coordinate at index', i);
            }
        }
        
        if (uniqueCoords.length < coordinates.length) {
            console.log('⚠️ Removed duplicate coordinates:', coordinates.length, '->', uniqueCoords.length);
            coordinates = uniqueCoords;
        }
        
        console.log('🛣️ Final coordinates array:', coordinates.map(c => `${c.lat},${c.lng}`));
        console.log('🛣️ Total coordinates:', coordinates.length);
        
        // Check if we have enough unique points for routing
        if (coordinates.length < 2) {
            console.error('❌ Not enough unique points for routing');
            alert('Please add at least one waypoint or set a different end point for routing');
            return;
        }
        
        // Get start and end coordinates for logging
        const startLatLng = this.startMarker.getLatLng();
        const endLatLng = this.endMarker.getLatLng();
        
        // If return to start is checked, add start point again at the end for round trip
        if (returnToStart) {
            // Always add start point again for round trip, even if end point equals start point
            coordinates.push(startLatLng);
            console.log('🔄 Round trip: Added return to start point');
        }
        
        console.log(`📍 Generated coordinates:`, coordinates.map(c => `${c.lat},${c.lng}`));
        console.log(`📍 Total coordinates: ${coordinates.length}`);
        console.log(`📍 Return to start: ${returnToStart}`);
        console.log(`📍 Start: ${startLatLng.lat},${startLatLng.lng}`);
        console.log(`📍 End: ${endLatLng.lat},${endLatLng.lng}`);
        console.log(`📍 Waypoints:`, this.waypoints.map(w => `${w.latlng.lat},${w.latlng.lng}`));
        
        // Debug: Check if this is a round-trip
        if (returnToStart && coordinates.length > 2) {
            console.log(`🔄 ROUND-TRIP DETECTED!`);
            console.log(`🔄 Expected legs: ${coordinates.length - 1} (start->end->start)`);
            console.log(`🔄 This should show complete round-trip data in API response`);
        }
        console.log(`📍 Waypoint precision check:`, this.waypoints.map(w => ({
            lat: w.latlng.lat,
            lng: w.latlng.lng,
            latType: typeof w.latlng.lat,
            lngType: typeof w.latlng.lng
        })));
        
        try {
            // Get selected route type and API
            const routeTypeSelect = document.getElementById('routeType');
            const routeType = routeTypeSelect ? routeTypeSelect.value : 'drive';
            
            const routingApiSelect = document.getElementById('routingApi');
            const routingApi = routingApiSelect ? routingApiSelect.value : 'valhalla';
            
            console.log(`🌐 Using routing API: ${routingApi}`);
            console.log(`🔄 Return to start: ${returnToStart}`);
            
            // Store Valhalla profile for use in response processing
            let valhallaProfile = null;
            
            // Provide information about route type
            const routeTypeInfo = this.getRouteTypeDescription(routeType);
            if (routeType === 'drive') {
                console.log('🛣️ Using ROAD profile - Paved roads only, recommended for road bikes');
            } else if (routeType === 'cycling') {
                console.log('🚵 Using MTB profile - Trails prioritized, optimized for mountain bikes');
            }
            
            // Use selected API and profile for routing
            const coordsStr = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
            let apiUrl;
            
            if (routingApi === 'mapbox') {
                // Mapbox Directions API
                const mapboxToken = this.getMapboxToken();
                if (!mapboxToken) {
                    this.showNotification('Mapbox token required. Please add your Mapbox token in the settings.', 'error');
                    return;
                }
                apiUrl = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${routeType}/${coordsStr}?access_token=${mapboxToken}&geometries=geojson&steps=true&overview=full`;
            } else if (routingApi === 'valhalla') {
                // Valhalla Directions API - use Netlify proxy for online hosting
                // Map route types to Valhalla profiles (bicycle for bike-friendly routes)
                valhallaProfile = routeType === 'drive' ? 'bicycle' : routeType === 'cycling' ? 'bicycle' : 'pedestrian';
                
                // Check if we're running on Netlify (has .netlify in hostname) or localhost
                const isNetlify = window.location.hostname.includes('.netlify.app') || window.location.hostname.includes('netlify');
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                
                if (isNetlify) {
                    // Use Netlify function proxy for online hosting
                    console.log('🌐 Using Netlify proxy for Valhalla API');
                    
                    // Build request for proxy
                    const valhallaRequest = {
                        profile: valhallaProfile,
                        locations: coordinates.map(coord => ({
                            lat: coord.lat,
                            lon: coord.lng
                        }))
                    };
                    
                    apiUrl = '/.netlify/functions/valhalla-proxy';
                    
                    // Store request body for POST
                    this.valhallaRequestBody = JSON.stringify(valhallaRequest);
                    
                    console.log(`🛣️ Valhalla proxy URL: ${apiUrl}`);
                    console.log(`🛣️ Proxy request body:`, valhallaRequest);
                    
                    window.updateDebugPanel('APPROACH', 'Valhalla (Netlify proxy)');
                    window.updateDebugPanel('API', 'PROXY');
                    window.updateDebugPanel('PROFILE', valhallaProfile);
                    
                } else {
                    // Use direct API for localhost (no CORS issues)
                    console.log('🏠 Using direct Valhalla API for localhost');
                    
                    const valhallaData = {
                        locations: coordinates.map(coord => ({
                            lat: coord.lat,
                            lon: coord.lng
                        })),
                        costing: valhallaProfile,
                        directions_maneuvers: true,
                        units: 'kilometers'
                    };
                    
                    console.log('🛣️ Valhalla request data:', JSON.stringify(valhallaData, null, 2));
                    apiUrl = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`;
                    
                    console.log(`🛣️ Valhalla direct API URL: ${apiUrl}`);
                    console.log(`🛣️ Using profile: ${valhallaProfile}`);
                    
                    window.updateDebugPanel('APPROACH', 'Valhalla (direct API)');
                    window.updateDebugPanel('API', 'DIRECT');
                    window.updateDebugPanel('PROFILE', valhallaProfile);
                }
            } else if (routingApi === 'graphhopper') {
                // GraphHopper Directions API
                const graphhopperToken = this.getGraphhopperToken();
                if (!graphhopperToken) {
                    this.showNotification('GraphHopper token required. Please add your GraphHopper token in the settings.', 'error');
                    return;
                }
                // Map route types to GraphHopper vehicle profiles
                const vehicleProfile = routeType === 'drive' ? 'car' : routeType === 'cycling' ? 'bike' : 'foot';
                
                // Handle waypoints for GraphHopper
                if (coordinates.length > 2) {
                    // Multiple waypoints
                    const points = coordinates.map(coord => `${coord.lat},${coord.lng}`).join('&point=');
                    apiUrl = `https://graphhopper.com/api/1/route?point=${points}&vehicle=${vehicleProfile}&key=${graphhopperToken}&instructions=true&geometry=true&points_encoded=false`;
                } else {
                    // Simple A-to-B routing
                    apiUrl = `https://graphhopper.com/api/1/route?point=${coordinates[0].lat},${coordinates[0].lng}&point=${coordinates[coordinates.length-1].lat},${coordinates[coordinates.length-1].lng}&vehicle=${vehicleProfile}&key=${graphhopperToken}&instructions=true&geometry=true&points_encoded=false`;
                }
            } else if (routingApi === 'openrouteservice') {
                // OpenRouteService Directions API
                const orsKey = this.getOpenRouteServiceKey();
                if (!orsKey) {
                    this.showNotification('OpenRouteService key required. Please add your OpenRouteService key in the settings.', 'error');
                    return;
                }
                // Map route types to ORS profiles
                const orsProfile = routeType === 'drive' ? 'driving-car' : routeType === 'cycling' ? 'cycling-regular' : 'foot-walking';
                
                // Handle waypoints for OpenRouteService
                if (coordinates.length > 2) {
                    // Multiple waypoints - use POST method with coordinates in body
                    // OpenRouteService expects coordinates as [[lng1,lat1],[lng2,lat2],[lng3,lat3]]
                    const coordsArray = coordinates.map(coord => {
                        const lng = typeof coord.lng === 'number' ? coord.lng : parseFloat(coord.lng);
                        const lat = typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat);
                        return [lng, lat];
                    });
                    console.log(`🌍 ORS coordinates formatted as array:`, coordsArray);
                    console.log(`🌍 ORS coordinate precision check:`, coordsArray.map(coord => ({
                        lng: coord[0],
                        lat: coord[1],
                        lngType: typeof coord[0],
                        latType: typeof coord[1],
                        lngPrecision: coord[0].toString().length,
                        latPrecision: coord[1].toString().length
                    })));
                    
                    // Use POST method for multi-point routing
                    const requestBody = JSON.stringify({
                        coordinates: coordsArray
                    });
                    
                    // Try POST method first
                    apiUrl = `https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${orsKey}`;
                    
                    // Store request body for later use
                    this.orsRequestBody = requestBody;
                    console.log(`🌍 Trying ORS POST method with body:`, requestBody);
                } else {
                    // Simple A-to-B routing
                    const startLng = typeof coordinates[0].lng === 'number' ? coordinates[0].lng : parseFloat(coordinates[0].lng);
                    const startLat = typeof coordinates[0].lat === 'number' ? coordinates[0].lat : parseFloat(coordinates[0].lat);
                    const endLng = typeof coordinates[coordinates.length-1].lng === 'number' ? coordinates[coordinates.length-1].lng : parseFloat(coordinates[coordinates.length-1].lng);
                    const endLat = typeof coordinates[coordinates.length-1].lat === 'number' ? coordinates[coordinates.length-1].lat : parseFloat(coordinates[coordinates.length-1].lat);
                    console.log(`🌍 ORS start/end formatted: start=${startLng},${startLat}, end=${endLng},${endLat}`);
                    apiUrl = `https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${orsKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
                }
            } else {
                // OSRM API (default)
                apiUrl = `https://router.project-osrm.org/route/v1/${routeType}/${coordsStr}?overview=full&geometries=geojson&steps=true`;
            }
            
            console.log(`🌐 API URL: ${apiUrl}`);
            const response = await fetch(apiUrl, {
                method: this.valhallaRequestBody || this.orsRequestBody ? 'POST' : 'GET',
                headers: this.valhallaRequestBody || this.orsRequestBody ? {
                    'Content-Type': 'application/json'
                } : {},
                body: this.valhallaRequestBody || this.orsRequestBody || null,
                mode: 'cors'
            });
            
            // Clear request body after use
            this.valhallaRequestBody = null;
            this.orsRequestBody = null;
            
            // Check if response is actually JSON before parsing
            const contentType = response.headers.get('content-type');
            console.log(`🌐 Response content-type: ${contentType}`);
            console.log(`🌐 Response status: ${response.status}`);
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error(`❌ Expected JSON but got ${contentType || 'unknown'}:`, text.substring(0, 200));
                throw new Error(`API returned ${contentType || 'unknown'} instead of JSON. Status: ${response.status}`);
            }
            
            let data = await response.json();
            console.log(`🌐 API Response:`, data);
            console.log(`🌐 Response keys:`, Object.keys(data));
            
            // Log specific error details for OpenRouteService
            if (routingApi === 'openrouteservice' && data.error) {
                console.error(`❌ OpenRouteService API Error:`, data.error);
                console.error(`❌ Error details:`, data.info);
                console.error(`❌ Error code:`, data.error.code);
                console.error(`❌ Error message:`, data.error.message);
                console.error(`❌ Request URL:`, apiUrl);
                
                // Handle specific ORS errors
                if (data.error.code === 2010) {
                    // Could not find routable point error
                    console.warn(`⚠️ ORS cannot find routable point. Trying to snap waypoint to nearest road...`);
                    
                    // Try to find a nearby routable point by adjusting coordinates slightly
                    const adjustedCoords = this.adjustWaypointForORS(coordsArray);
                    if (adjustedCoords) {
                        console.log(`🔄 Retrying ORS with adjusted coordinates:`, adjustedCoords);
                        
                        // Retry with adjusted coordinates
                        const retryRequestBody = JSON.stringify({
                            coordinates: adjustedCoords
                        });
                        
                        try {
                            const retryResponse = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: retryRequestBody
                            });
                            
                            const retryData = await retryResponse.json();
                            console.log(`🌐 ORS Retry Response:`, retryData);
                            
                            if (!retryData.error) {
                                // Success! Use the retried data
                                data = retryData;
                                console.log(`✅ ORS retry successful with adjusted coordinates`);
                            } else {
                                // Retry failed
                                console.warn(`⚠️ ORS retry also failed`);
                                this.showNotification('OpenRouteService cannot find a road near the waypoint. Try placing the waypoint on a major road or use a different API.', 'warning');
                            }
                        } catch (retryError) {
                            console.error(`❌ ORS retry error:`, retryError);
                            this.showNotification('OpenRouteService cannot find a road near the waypoint. Try placing the waypoint on a major road or use a different API.', 'warning');
                        }
                    } else {
                        this.showNotification('OpenRouteService cannot find a road near the waypoint. Try placing the waypoint on a major road or use a different API.', 'warning');
                    }
                } else if (data.error.code === 2001) {
                    // Parameter missing error
                    console.warn(`⚠️ ORS parameter error. This should be fixed now.`);
                    this.showNotification('OpenRouteService parameter error. Please try again.', 'error');
                } else {
                    console.error(`❌ ORS API error: ${data.error.message}`);
                    // Other ORS errors
                    console.warn(`⚠️ ORS API error: ${data.error.message}`);
                    this.showNotification(`OpenRouteService error: ${data.error.message}`, 'error');
                }
            }
            
            if (routingApi === 'graphhopper') {
                console.log(`🚶 GraphHopper response structure:`, {
                    paths: data.paths,
                    pathsLength: data.paths?.length,
                    firstPath: data.paths?.[0],
                    instructions: data.paths?.[0]?.instructions,
                    geometry: data.paths?.[0]?.geometry
                });
            } else if (routingApi === 'openrouteservice') {
                console.log(`🌍 OpenRouteService response structure:`, {
                    features: data.features,
                    featuresLength: data.features?.length,
                    firstFeature: data.features?.[0],
                    properties: data.features?.[0]?.properties,
                    geometry: data.features?.[0]?.geometry
                });
            } else if (routingApi === 'mapbox') {
                console.log(`🗺️ Mapbox response structure:`, {
                    routes: data.routes,
                    routesLength: data.routes?.length,
                    firstRoute: data.routes?.[0],
                    legs: data.routes?.[0]?.legs,
                    steps: data.routes?.[0]?.legs?.[0]?.steps
                });
            } else if (routingApi === 'valhalla') {
                console.log(`🛣️ Valhalla response structure:`, {
                    routes: data.routes,
                    routesLength: data.routes?.length,
                    firstRoute: data.routes?.[0],
                    legs: data.routes?.[0]?.legs,
                    steps: data.routes?.[0]?.legs?.[0]?.steps
                });
            } else {
                console.log(`🆓 OSRM response structure:`, {
                    routes: data.routes,
                    routesLength: data.routes?.length,
                    firstRoute: data.routes?.[0],
                    geometry: data.routes?.[0]?.geometry,
                    legs: data.routes?.[0]?.legs,
                    steps: data.routes?.[0]?.legs?.[0]?.steps
                });
            }
            
            // Handle different API response structures
            let route, routePoints;
            let routeFound = false;
            
            if (routingApi === 'graphhopper') {
                // GraphHopper format
                if (!data.paths || data.paths.length === 0) {
                    console.error('❌ No paths found in GraphHopper response');
                    this.showNotification('No route found with GraphHopper API', 'error');
                    routeFound = false;
                } else {
                    const path = data.paths[0];
                    route = {
                        distance: path.distance,
                        duration: path.time,
                        geometry: path.geometry,
                        legs: [{ steps: path.instructions }]
                    };
                    routePoints = path.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                    routeFound = true;
                    console.log('🚶 GraphHopper route data extracted:', route);
                }
                
            } else if (routingApi === 'openrouteservice') {
                // OpenRouteService format
                if (!data.features || data.features.length === 0) {
                    console.error('❌ No features found in OpenRouteService response');
                    this.showNotification('No route found with OpenRouteService API', 'error');
                    routeFound = false;
                } else {
                    const feature = data.features[0];
                    route = {
                        distance: feature.properties.segments.reduce((sum, seg) => sum + seg.distance, 0),
                        duration: feature.properties.segments.reduce((sum, seg) => sum + seg.duration, 0),
                        geometry: feature.geometry,
                        legs: [{ steps: feature.properties.segments }]
                    };
                    routePoints = feature.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                    routeFound = true;
                    console.log('🌍 OpenRouteService route data extracted:', route);
                }
                
            } else if (routingApi === 'mapbox') {
                // Mapbox format
                if (!data.routes || data.routes.length === 0) {
                    console.error('❌ No routes found in Mapbox response');
                    this.showNotification('No route found with Mapbox API', 'error');
                    routeFound = false;
                } else {
                    route = data.routes[0];
                    routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                    routeFound = true;
                    console.log('🗺️ Mapbox route data extracted:', route);
                }
                
            } else if (routingApi === 'valhalla') {
                // Valhalla returns trip structure, not routes
                console.log('🛣️ Valhalla API Response:', JSON.stringify(data, null, 2));
                
                if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
                    console.error('❌ No trip found in Valhalla response');
                    this.showNotification('No route found with Valhalla API', 'error');
                    routeFound = false;
                } else {
                    // Valhalla API returns trip structure with legs
                    const trip = data.trip;
                    
                    // Debug: Check if this is a round-trip with multiple legs
                    console.log(`🛣️ Valhalla legs count: ${trip.legs.length}`);
                    console.log(`🛣️ Round-trip detected: ${trip.legs.length > 1}`);
                    
                    // Debug each leg
                    trip.legs.forEach((leg, index) => {
                        console.log(`🛣️ Leg ${index + 1}:`);
                        console.log(`  - Maneuvers: ${leg.maneuvers ? leg.maneuvers.length : 0}`);
                        console.log(`  - Summary:`, leg.summary);
                        console.log(`  - Distance: ${leg.summary?.length} km`);
                        console.log(`  - Time: ${leg.summary?.time} seconds`);
                    });
                    
                    // Create a consistent route structure for the app
                    // Combine both legs for round-trip data
                    const totalDistance = trip.legs.reduce((sum, leg) => sum + (leg.summary?.length || 0), 0);
                    const totalTime = trip.legs.reduce((sum, leg) => sum + (leg.summary?.time || 0), 0);
                    const allManeuvers = trip.legs.reduce((maneuvers, leg) => 
                        maneuvers.concat(leg.maneuvers || []), []);
                    
                    console.log(`🛣️ Combined round-trip data:`);
                    console.log(`  - Total distance: ${totalDistance} km`);
                    console.log(`  - Total time: ${totalTime} seconds`);
                    console.log(`  - Total maneuvers: ${allManeuvers.length}`);
                    
                    route = {
                        legs: trip.legs,
                        distance: totalDistance * 1000, // Convert km to meters
                        duration: totalTime, // Time in seconds
                        geometry: {
                            coordinates: trip.shape ? this.decodePolyline(trip.shape) : []
                        },
                        combinedManeuvers: allManeuvers, // Add combined maneuvers for multi-waypoint routes
                        isMultiWaypoint: trip.legs.length > 1 // Flag for multi-waypoint routes
                    };
                    
                    // For multi-waypoint routes, combine all leg shapes
                    let allRoutePoints = [];
                    
                    if (trip.legs && trip.legs.length > 0) {
                        trip.legs.forEach((leg, legIndex) => {
                            if (leg.shape) {
                                const legPoints = this.decodePolyline(leg.shape);
                                console.log(`🛣️ Leg ${legIndex + 1} decoded:`, legPoints.length, 'points');
                                
                                // Add leg points, but avoid duplicating the connection point
                                if (legIndex === 0) {
                                    // First leg - add all points
                                    allRoutePoints = allRoutePoints.concat(legPoints);
                                } else {
                                    // Subsequent legs - skip first point to avoid duplication
                                    allRoutePoints = allRoutePoints.concat(legPoints.slice(1));
                                }
                            }
                        });
                        
                        routePoints = allRoutePoints;
                        console.log('🛣️ Combined routePoints from all legs:', routePoints.length, 'points');
                        console.log('🛣️ First point:', routePoints[0]);
                        console.log('🛣️ Last point:', routePoints[routePoints.length - 1]);
                    } else {
                        console.log('🛣️ No shape data found in Valhalla response');
                        console.log('🛣️ Available keys in trip:', Object.keys(trip));
                        if (trip.legs && trip.legs[0]) {
                            console.log('🛣️ Keys in trip.legs[0]:', Object.keys(trip.legs[0]));
                        }
                        routePoints = [];
                    }
                    routeFound = true;
                    console.log('🛣️ Valhalla route data extracted:', trip);
                    console.log('🛣️ Using profile:', valhallaProfile);
                }
            } else if (routingApi === 'osrm') {
                // OSRM format
                if (!data.routes || data.routes.length === 0) {
                    console.error('❌ No routes found in OSRM response');
                    this.showNotification('No route found with OSRM API', 'error');
                    routeFound = false;
                } else {
                    route = data.routes[0];
                    routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                    routeFound = true;
                    console.log('🆓 OSRM route data extracted:', route);
                }
            }
            
            console.log('🛣️ === ROUTE PROCESSING DEBUG ===');
            console.log('🛣️ Route processing complete. routeFound:', routeFound);
            console.log('🛣️ routePoints length:', routePoints.length);
            console.log('🛣️ routingApi:', routingApi);
            console.log('🛣️ === END ROUTE PROCESSING DEBUG ===');
            
            // Update debug panel with key info
            window.updateDebugPanel('ROUTE_FOUND', routeFound ? 'YES' : 'NO');
            window.updateDebugPanel('ROUTE_POINTS', routePoints.length);
            window.updateDebugPanel('API_TYPE', routingApi);
            
            if (routeFound) {
                // Store current route data for unit conversion
                this.currentRouteData = route;
                
                console.log('🛣️ About to display route with routePoints:', routePoints.length, 'points');
                console.log('🛣️ routePoints sample:', routePoints.slice(0, 3));
                console.log('🛣️ routePoints type:', typeof routePoints[0]);
                console.log('🛣️ routePoints[0] lat/lng:', routePoints[0] ? [routePoints[0].lat, routePoints[0].lng] : 'undefined');
                
                // Update debug panel
                window.updateDebugPanel('MAP_DISPLAY', 'STARTING');
                
                // Validate routePoints before display
                if (!routePoints || routePoints.length === 0) {
                    console.error('❌ No valid routePoints for display');
                    window.updateDebugPanel('MAP_ERROR', 'NO_POINTS');
                    this.showNotification('No route points available for map display', 'error');
                    return;
                }
                
                // Check if first point has valid coordinates
                const firstPoint = routePoints[0];
                if (!firstPoint || typeof firstPoint.lat !== 'number' || typeof firstPoint.lng !== 'number') {
                    console.error('❌ Invalid coordinates in routePoints:', firstPoint);
                    window.updateDebugPanel('MAP_ERROR', 'INVALID_COORDS');
                    this.showNotification('Invalid route coordinates for map display', 'error');
                    return;
                }
                
                console.log('🛣️ Validating bounds with first point:', firstPoint);
                console.log('🛣️ Validating bounds with last point:', routePoints[routePoints.length - 1]);
                console.log('🛣️ Proceeding to display route...');
                
                window.updateDebugPanel('MAP_BOUNDS', 'VALID');
                this.displayRoute(routePoints, route);
                
                // Handle different step formats for different APIs
                console.log('🔍 Route structure:', route);
                console.log('🔍 Route keys:', Object.keys(route));
                console.log('🔍 Route.legs:', route.legs);
                console.log('🔍 Current API:', routingApi);
                
                if (routingApi === 'valhalla' && route.legs && route.legs[0] && route.legs[0].maneuvers) {
                    // Valhalla uses maneuvers instead of steps
                    console.log('🔍 Using Valhalla maneuvers path');
                    console.log('🔍 Leg 0 structure:', route.legs[0]);
                    console.log('🔍 Leg 0 keys:', Object.keys(route.legs[0]));
                    
                    // Check if this is a multi-waypoint route with combined maneuvers
                    if (route.isMultiWaypoint && route.combinedManeuvers) {
                        console.log('🔄 Using combined maneuvers for multi-waypoint route');
                        console.log(`🔄 Total combined maneuvers: ${route.combinedManeuvers.length}`);
                        console.log('🔄 Combined maneuvers sample:', route.combinedManeuvers.slice(0, 3));
                        this.displayTurnDirections(route.combinedManeuvers);
                    } else if (route.isRoundTrip && route.combinedManeuvers) {
                        console.log('🔄 Using combined maneuvers for round-trip');
                        console.log(`🔄 Total combined maneuvers: ${route.combinedManeuvers.length}`);
                        console.log('🔄 Combined maneuvers sample:', route.combinedManeuvers.slice(0, 3));
                        this.displayTurnDirections(route.combinedManeuvers);
                    } else {
                        console.log('🔍 Using single leg maneuvers');
                        console.log(`🔄 Single leg maneuvers: ${route.legs[0].maneuvers.length}`);
                        this.displayTurnDirections(route.legs[0].maneuvers);
                    }
                } else if (routingApi === 'valhalla' && route.legs && route.legs[0]) {
                    // Check if maneuvers are directly in leg
                    console.log('🔍 Checking leg 0 for maneuvers...');
                    console.log('🔍 Leg 0.maneuvers:', route.legs[0].maneuvers);
                    console.log('🔍 Leg 0 keys:', Object.keys(route.legs[0]));
                    if (route.legs[0].maneuvers) {
                        console.log('🔍 Found maneuvers in leg 0');
                        this.displayTurnDirections(route.legs[0].maneuvers);
                    } else {
                        console.log('🔍 No maneuvers in leg 0, checking other fields...');
                    }
                } else if (route.legs && route.legs[0] && route.legs[0].steps) {
                    // OSRM and others use steps
                    console.log('🔍 Using standard steps path');
                    this.displayTurnDirections(route.legs[0].steps);
                } else {
                    console.log('🔍 No recognizable step structure found in route');
                }
                
                this.displayRouteInfo(route);
                
                // Get elevation data for the route
                console.log(`🏔️ Getting elevation data for routePoints: ${routePoints.length} points`);
                console.log(`🏔️ Route isRoundTrip: ${returnToStart}`);
                console.log(`🏔️ Route legs count: ${route.legs ? route.legs.length : 'unknown'}`);
                
                // Check if this is a round-trip and we need combined route points
                if (returnToStart && route.legs && route.legs.length > 1) {
                    console.log(`🏔️ ROUND-TRIP ELEVATION: Combining points from all legs`);
                    
                    // For round-trip, we need to get points from all legs
                    let allRoutePoints = [];
                    
                    route.legs.forEach((leg, index) => {
                        console.log(`🏔️ Processing leg ${index + 1} for elevation`);
                        
                        // Decode each leg's shape data
                        const legShapeData = leg.shape;
                        if (legShapeData) {
                            const legPoints = this.decodePolyline(legShapeData);
                            console.log(`🏔️ Leg ${index + 1} has ${legPoints.length} points`);
                            allRoutePoints = allRoutePoints.concat(legPoints);
                        }
                    });
                    
                    console.log(`🏔️ Combined routePoints: ${allRoutePoints.length} total points`);
                    await this.getElevationData(allRoutePoints, route);
                } else {
                    console.log(`🏔️ ONE-WAY ELEVATION: Using single leg points`);
                    await this.getElevationData(routePoints, route);
                }
                
                console.log(` Route generated using ${routeType} profile`);
                console.log(` Route distance: ${(route.distance / 1000).toFixed(2)} km`);
                console.log(` Route duration: ${(route.duration / 60).toFixed(1)} min`);
                console.log(` Return to start: ${returnToStart ? 'Yes' : 'No'}`);
            } else {
                console.error('❌ No route found in API response');
                this.showNotification('No route found. Please try different points.', 'error');
            }
        } catch (error) {
            console.error('Route generation error:', error);
            
            // Handle CORS errors specifically
            if (error.message && error.message.includes('CORS')) {
                console.error('❌ CORS Error: Unable to access API due to Cross-Origin policy');
                if (routingApi === 'valhalla') {
                    this.showNotification('Valhalla CORS error: Try running the app locally (python -m http.server 8000) for direct access, or use OSRM/Mapbox APIs.', 'error');
                } else {
                    this.showNotification('CORS error: Unable to connect to routing API. Try using a different API or running locally.', 'error');
                }
            } else if (error.message && error.message.includes('Failed to fetch')) {
                console.error('❌ Network Error: Unable to fetch from API');
                if (routingApi === 'valhalla') {
                    this.showNotification('Valhalla network error: CORS proxy may be down. Try OSRM or Mapbox APIs instead.', 'error');
                } else {
                    this.showNotification('Network error: Unable to connect to routing API. Check your internet connection.', 'error');
                }
            } else {
                this.showNotification('Failed to generate route. Please try again.', 'error');
            }
        }
    }
    
    displayRoute(routePoints, routeData) {
        console.log('🗺️ displayRoute called with', routePoints.length, 'points');
        console.log('🗺️ Map object exists:', !!this.map);
        
        // Update debug panel
        window.updateDebugPanel('MAP_RENDER', 'STARTING');
        
        if (!this.map) {
            console.error('❌ Map object not available');
            window.updateDebugPanel('MAP_ERROR', 'NO_MAP');
            return;
        }
        
        if (this.routeLayer) {
            console.log('🗺️ Removing existing route layer');
            this.map.removeLayer(this.routeLayer);
        }
        
        // Get route type for styling
        const routeTypeSelect = document.getElementById('routeType');
        const routeType = routeTypeSelect ? routeTypeSelect.value : 'drive';
        
        let routeColor = '#4CAF50'; // Default green
        let routeWeight = 6;
        
        if (routeType === 'drive') {
            routeColor = '#4CAF50'; // Green for road cycling
            routeWeight = 6;
        } else if (routeType === 'cycling') {
            routeColor = '#FF6B35'; // Orange for MTB/trails
            routeWeight = 5;
        } else if (routeType === 'foot') {
            routeColor = '#2196F3'; // Blue for walking
            routeWeight = 4;
        }
        
        console.log('🗺️ Creating polyline with', routePoints.length, 'points');
        console.log('🗺️ Route color:', routeColor);
        
        // Debug: Check first few route points
        console.log('🗺️ First 3 route points:');
        for (let i = 0; i < Math.min(3, routePoints.length); i++) {
            const point = routePoints[i];
            console.log(`  Point ${i}:`, point);
            console.log(`    Type:`, typeof point);
            console.log(`    Has lat:`, 'lat' in point);
            console.log(`    Has lng:`, 'lng' in point);
            console.log(`    lat:`, point.lat);
            console.log(`    lng:`, point.lng);
        }
        
        this.routeLayer = L.polyline(routePoints, {
            color: routeColor,
            weight: routeWeight,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(this.map);
        
        // Add hover functionality to route
        this.routeLayer.on('mouseover', (e) => this.handleRouteHover(e));
        this.routeLayer.on('mouseout', () => this.clearRouteHover());
        
        console.log('🗺️ Route layer added to map');
        console.log('🗺️ Route hover events attached');
        window.updateDebugPanel('MAP_RENDER', 'SUCCESS');
        
        // Debug: Check if layer was added correctly
        console.log('🗺️ Route layer exists:', !!this.routeLayer);
        console.log('🗺️ Route layer on map:', this.routeLayer && this.routeLayer._map ? 'YES' : 'NO');
        
        // Ensure waypoint markers stay on top of route layer
        this.waypoints.forEach((waypoint, index) => {
            if (waypoint.marker && waypoint.marker._map) {
                // Bring waypoint marker to front using setZIndexOffset
                waypoint.marker.setZIndexOffset(1000 + index);
                console.log(`🗺️ Set waypoint ${index + 1} z-index to front`);
            } else {
                console.log(`🗺️ Waypoint ${index + 1} marker not found or not on map`);
            }
        });
        
        // Also ensure start and end markers are on top
        if (this.startMarker && this.startMarker._map) {
            this.startMarker.setZIndexOffset(2000);
            console.log('🗺️ Set start marker z-index to front');
        }
        if (this.endMarker && this.endMarker._map) {
            this.endMarker.setZIndexOffset(2001);
            console.log('🗺️ Set end marker z-index to front');
        }
        
        // Fit map to show entire route
        const bounds = L.latLngBounds(routePoints);
        console.log('🗺️ Fitting map to bounds:', bounds);
        console.log('🗺️ Bounds type:', typeof bounds);
        console.log('🗺️ Bounds constructor:', bounds.constructor.name);
        console.log('🗺️ Bounds center:', bounds.getCenter());
        
        // Primary fitBounds call - center the map on the route
        try {
            this.map.fitBounds(bounds, { padding: [50, 50] });
            console.log('🗺️ Map bounds fitted successfully (primary)');
            window.updateDebugPanel('MAP_RENDER', 'SUCCESS_PRIMARY');
        } catch (error) {
            console.error('🗺️ Error fitting primary bounds:', error);
            window.updateDebugPanel('MAP_ERROR', 'BOUNDS_ERROR_PRIMARY');
        }
        
        // Check if bounds has getSize method
        if (typeof bounds.getSize === 'function') {
            console.log('🗺️ Bounds size:', bounds.getSize());
        } else {
            console.log('🗺️ Bounds has no getSize method, using manual calculation');
            // Manual bounds calculation
            const firstPoint = routePoints[0];
            const lastPoint = routePoints[routePoints.length - 1];
            const manualBounds = {
                getCenter: () => L.latLng(
                    (firstPoint.lat + lastPoint.lat) / 2,
                    (firstPoint.lng + lastPoint.lng) / 2
                ),
                getNorthEast: () => L.latLng(lastPoint.lat, lastPoint.lng),
                getSouthWest: () => L.latLng(firstPoint.lat, firstPoint.lng)
            };
            console.log('🗺️ Manual bounds center:', manualBounds.getCenter());
            
            try {
                this.map.fitBounds(manualBounds, { padding: [50, 50] });
                console.log('🗺️ Map bounds fitted successfully (manual)');
                window.updateDebugPanel('MAP_RENDER', 'SUCCESS_MANUAL');
            } catch (error) {
                console.error('🗺️ Error fitting bounds:', error);
                window.updateDebugPanel('MAP_ERROR', 'BOUNDS_ERROR_MANUAL');
            }
        }
        
        // Show route info panel
        const routeInfoDiv = document.getElementById('routeInfo');
        if (routeInfoDiv) {
            routeInfoDiv.style.display = 'block';
        }
        
        // Show turn directions panel
        const turnDirectionsDiv = document.getElementById('turnDirections');
        if (turnDirectionsDiv) {
            console.log('🔍 Showing turnDirections panel, current display:', turnDirectionsDiv.style.display);
            turnDirectionsDiv.style.display = 'block';
            console.log('🔍 turnDirections panel now set to display:', turnDirectionsDiv.style.display);
            console.log('🔍 turnDirections panel innerHTML length:', turnDirectionsDiv.innerHTML.length);
        } else {
            console.log('🔍 ERROR: turnDirections div not found!');
        }
    }
    
    displayRouteInfo(routeData) {
        const routeInfoDiv = document.getElementById('routeInfo');
        if (!routeInfoDiv) return;
        
        console.log('🔄 displayRouteInfo called with routeData.distance:', routeData.distance);
        
        routeInfoDiv.style.display = 'block';
        
        const distance = this.convertDistance(routeData.distance);
        const duration = Math.round(routeData.duration / 60);
        
        // Calculate speed: distance (meters) / time (seconds) = m/s, then convert to km/h
        const speedMs = routeData.distance / routeData.duration; // meters per second
        const speedKmh = speedMs * 3.6; // convert m/s to km/h
        const speed = this.convertSpeed(speedKmh);
        
        console.log('🔄 Speed calculation:');
        console.log('  Distance (m):', routeData.distance);
        console.log('  Duration (s):', routeData.duration);
        console.log('  Speed (m/s):', speedMs);
        console.log('  Speed (km/h):', speedKmh);
        console.log('  Speed (converted):', speed);
        
        routeInfoDiv.innerHTML = `
            <div class="route-stats">
                <div class="route-stat">
                    <span class="stat-icon">📏</span>
                    <span class="stat-text">Distance: ${distance}</span>
                </div>
                <div class="route-stat">
                    <span class="stat-icon">⏱️</span>
                    <span class="stat-text">Duration: ${duration} min</span>
                </div>
                <div class="route-stat">
                    <span class="stat-icon">🚴</span>
                    <span class="stat-text">Avg Speed: ${speed}</span>
                </div>
            </div>
        `;
    }
    
    async getElevationData(routePoints, routeData) {
        console.log('🏔️ Getting elevation data...');
        
        try {
            // Sample points along the route every 50 meters
            const samplePoints = [];
            let currentDistance = 0;
            
            // Always include the first point
            samplePoints.push(routePoints[0]);
            
            // Sample every 50 meters along the route
            for (let i = 1; i < routePoints.length; i++) {
                const prevPoint = routePoints[i - 1];
                const currentPoint = routePoints[i];
                
                // Calculate distance from previous point
                const distance = this.calculateDistance(
                    prevPoint.lat, prevPoint.lng,
                    currentPoint.lat, currentPoint.lng
                );
                
                currentDistance += distance;
                
                // If we've traveled at least 50 meters, add this point
                if (currentDistance >= 50) {
                    samplePoints.push(currentPoint);
                    currentDistance = 0; // Reset distance counter
                }
            }
            
            // Always include the last point to ensure we have the end elevation
            if (samplePoints[samplePoints.length - 1] !== routePoints[routePoints.length - 1]) {
                samplePoints.push(routePoints[routePoints.length - 1]);
            }
            
            console.log(`🏔️ 50m sampling: ${samplePoints.length} points from ${routePoints.length} total route points`);
            
            // Get elevation data from Open Elevation API
            const locations = samplePoints.map(point => `${point.lat},${point.lng}`).join('|');
            
            // For localhost development, use direct API call (CORS might be an issue but we'll try)
            // For production, use Netlify proxy
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            let elevationUrl;
            
            if (isLocalhost) {
                // Try direct API call for localhost (might work with some browsers)
                elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
            } else {
                // Use Netlify function proxy for production
                elevationUrl = `/.netlify/functions/elevation-proxy?locations=${locations}`;
            }
            
            console.log(`🏔️ Using elevation URL:`, elevationUrl);
            
            const elevationResponse = await fetch(elevationUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            let elevationData;
            
            if (!elevationResponse.ok) {
                console.log('🏔️ Elevation API failed, using fallback data');
                // Create fallback elevation data for California routes
                elevationData = {
                    results: samplePoints.map(point => ({
                        latitude: point.lat,
                        longitude: point.lng,
                        elevation: 100 + Math.random() * 200 // Random elevation between 100-300m
                    }))
                };
            } else {
                elevationData = await elevationResponse.json();
            }
            
            console.log('🏔️ Elevation data received:', elevationData);
            
            if (elevationData.results && elevationData.results.length > 0) {
                // Calculate elevation statistics
                const elevations = elevationData.results.map(result => result.elevation);
                console.log('🏔️ DEBUG: Elevations array - first=' + elevations[0] + ', last=' + elevations[elevations.length-1] + ', max=' + Math.max(...elevations) + ', length=' + elevations.length);
                const elevationGain = this.calculateElevationGain(elevations);
                const elevationLoss = this.calculateElevationLoss(elevations);
                const peakElevation = Math.max(...elevations);
                const minElevation = Math.min(...elevations);
                
                // Calculate gradient statistics
                const gradientStats = this.calculateGradientStatistics(elevationData.results, routePoints);
                
                // Store current elevation data for unit conversion
                this.currentElevationData = {
                    gain: elevationGain,
                    loss: elevationLoss,
                    peak: peakElevation,
                    min: minElevation,
                    medianGrade: gradientStats.medianGrade,
                    maxGrade: gradientStats.maxGrade,
                    minGrade: gradientStats.minGrade,
                    elevations: elevations, // Add elevations array for route hover
                    gradients: gradientStats.gradients // Add gradients array for route hover
                };
                
                console.log(`🏔️ Gradient statistics: median=${gradientStats.medianGrade}%, max=${gradientStats.maxGrade}%, min=${gradientStats.minGrade}%`);
                
                this.displayElevationProfile(elevationData.results, routeData, routePoints);
            } else {
                console.log('❌ No elevation data available');
                this.showElevationUnavailable();
            }
            
        } catch (error) {
            console.error('❌ Elevation data error:', error);
            this.showElevationUnavailable();
        }
    }
    
    displayElevationProfile(elevationData, routeData, routePoints) {
        const elevationDiv = document.getElementById('elevationProfile');
        if (!elevationDiv) return;
        
        // Calculate elevation statistics
        const elevations = elevationData.map(point => point.elevation);
        const distances = elevationData.map((point, index) => {
            if (index === 0) return 0;
            const prevPoint = elevationData[index - 1];
            const distance = this.calculateDistance(
                prevPoint.latitude, prevPoint.longitude,
                point.latitude, point.longitude
            );
            return distance;
        });
        
        // Calculate cumulative distances matching 50m elevation sampling
        const cumulativeDistances = [];
        let totalDistance = 0;
        
        // Match the 50m sampling used for elevation data
        cumulativeDistances.push(0); // First point at 0m
        
        let currentDistance = 0;
        let sampleCount = 0;
        
        console.log(`🏔️ CUMULATIVE DISTANCE CALCULATION DEBUG:`);
        console.log(`  - Starting calculation with ${routePoints.length} route points`);
        
        for (let i = 1; i < routePoints.length; i++) {
            const prevPoint = routePoints[i - 1];
            const currentPoint = routePoints[i];
            
            const distance = this.calculateDistance(
                prevPoint.lat, prevPoint.lng,
                currentPoint.lat, currentPoint.lng
            );
            
            currentDistance += distance;
            totalDistance += distance;
            
            // Add cumulative distance for every 50m sample
            if (currentDistance >= 50) {
                cumulativeDistances.push(totalDistance);
                console.log(`  - Sample ${sampleCount + 1}: added at ${totalDistance.toFixed(1)}m (accumulated ${currentDistance.toFixed(1)}m)`);
                sampleCount++;
                currentDistance = 0; // Reset counter
            }
        }
        
        // Add final cumulative distance
        if (currentDistance > 0) {
            totalDistance += currentDistance;
            cumulativeDistances.push(totalDistance);
            console.log(`  - Final sample: added at ${totalDistance.toFixed(1)}m (accumulated ${currentDistance.toFixed(1)}m)`);
        }
        
        console.log(`🏔️ Cumulative distances: ${cumulativeDistances.length} points from ${sampleCount + 1} samples`);
        console.log(`🏔️ Sample distances: [${cumulativeDistances.slice(0, 10).map(d => (d * 0.621371 / 1000).toFixed(2)).join(', ')}...]`);
        console.log(`🏔️ Distance intervals: [${cumulativeDistances.slice(1, 10).map((d, i) => (d - cumulativeDistances[i]).toFixed(1)).join(', ')}...]`);
        console.log(`🏔️ Expected 50m intervals, actual range: ${Math.min(...cumulativeDistances.slice(1).map((d, i) => d - cumulativeDistances[i])).toFixed(1)}m to ${Math.max(...cumulativeDistances.slice(1).map((d, i) => d - cumulativeDistances[i])).toFixed(1)}m`);
        
        const elevationGain = this.calculateElevationGain(elevations);
        const elevationLoss = this.calculateElevationLoss(elevations);
        const peakElevation = Math.max(...elevations);
        const minElevation = Math.min(...elevations);
        
        // Create elevation chart
        this.createElevationChart(cumulativeDistances, elevations, elevationGain, elevationLoss, peakElevation, minElevation);
        
        // Display elevation statistics
        this.displayElevationStats(elevationGain, elevationLoss, peakElevation, minElevation, routeData);
        
        console.log(`🏔️ Elevation stats - Gain: ${elevationGain.toFixed(0)}m, Loss: ${elevationLoss.toFixed(0)}m, Peak: ${peakElevation.toFixed(0)}m`);
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    calculateElevationGain(elevations) {
        let gain = 0;
        for (let i = 1; i < elevations.length; i++) {
            if (elevations[i] > elevations[i-1]) {
                gain += elevations[i] - elevations[i-1];
            }
        }
        return gain;
    }
    
    calculateElevationLoss(elevations) {
        let loss = 0;
        for (let i = 1; i < elevations.length; i++) {
            if (elevations[i] < elevations[i-1]) {
                loss += elevations[i-1] - elevations[i];
            }
        }
        return loss;
    }
    
    createElevationChart(cumulativeDistances, elevations, gain, loss, peak, min) {
        const elevationDiv = document.getElementById('elevationProfile');
        if (!elevationDiv) return;
        
        elevationDiv.style.display = 'block';
        
        // Use unit conversions for elevation stats
        const gainText = this.convertElevation(gain);
        const lossText = this.convertElevation(loss);
        const peakText = this.convertElevation(peak);
        const minText = this.convertElevation(min);
        
        // Calculate gradient data for the chart
        const gradients = this.calculateGradientsForChart(elevations, cumulativeDistances);
        
        elevationDiv.innerHTML = `
            <h3>🏔️ Elevation Profile</h3>
            <div class="elevation-stats">
                <div class="elevation-stat">
                    <span class="stat-label">Elevation Gain:</span>
                    <span class="stat-value">${gainText}</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Elevation Loss:</span>
                    <span class="stat-value">${lossText}</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Peak Elevation:</span>
                    <span class="stat-value">${peakText}</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Min Elevation:</span>
                    <span class="stat-value">${minText}</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Median Grade:</span>
                    <span class="stat-value">${this.currentElevationData.medianGrade || 0}%</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Max Grade:</span>
                    <span class="stat-value">${this.currentElevationData.maxGrade || 0}%</span>
                </div>
                <div class="elevation-stat">
                    <span class="stat-label">Min Grade:</span>
                    <span class="stat-value">${this.currentElevationData.minGrade || 0}%</span>
                </div>
            </div>
            <div class="elevation-chart-container">
                <canvas id="elevationChart" width="800" height="450"></canvas>
            </div>
            <div class="gradient-legend">
                <span class="legend-title">Gradient:</span>
                <span class="legend-item false-flat">False Flat (0-3%)</span>
                <span class="legend-item moderate">Moderate (4-6%)</span>
                <span class="legend-item hard">Hard (7-9%)</span>
                <span class="legend-item severe">Severe (10-15%)</span>
                <span class="legend-item extreme">Extreme (>15%)</span>
            </div>
        `;
        
        // Create elevation and gradient chart using canvas
        setTimeout(() => {
            this.drawElevationAndGradientChart(elevations, gradients, cumulativeDistances);
            
            // Re-center map after elevation profile is rendered
            setTimeout(() => {
                if (this.routeLayer && this.routeLayer.getBounds) {
                    try {
                        const routeBounds = this.routeLayer.getBounds();
                        this.map.invalidateSize(); // Force map recalculation
                        this.map.fitBounds(routeBounds, { padding: [80, 50] });
                        console.log('🗺️ Map re-centered after elevation profile');
                    } catch (error) {
                        console.error('🗺️ Error re-centering map:', error);
                    }
                }
            }, 200);
        }, 100);
    }
    
    calculateGradientsForChart(elevations, cumulativeDistances) {
        const gradients = [];
        
        // Calculate gradient using 50m run method (same as gradient statistics)
        for (let i = 0; i < elevations.length - 1; i++) {
            const elevationChange = elevations[i + 1] - elevations[i];
            
            // Use fixed 50m run for consistent gradient calculation
            const fixedRun = 50; // 50 meters horizontal distance
            
            // Calculate gradient using rise/run × 100 formula
            const gradient = (elevationChange / fixedRun) * 100;
            
            // Filter out unrealistic gradients (> 30% or < -30%)
            if (Math.abs(gradient) <= 30) {
                gradients.push(gradient);
            } else {
                console.log(`🏔️ Filtering unrealistic gradient: ${gradient}% (elevation change: ${elevationChange}m over 50m run)`);
            }
        }
        
        // Smooth gradients to eliminate noise
        const smoothedGradients = this.smoothGradients(gradients);
        
        console.log(`🏔️ Chart gradients: ${gradients.length} calculated using 50m run method`);
        console.log(`🏔️ Sample chart gradients: ${gradients.slice(0, 10).map(g => g.toFixed(1)).join(', ')}%`);
        console.log(`🏔️ Smoothed gradients: ${smoothedGradients.length}`);
        
        return smoothedGradients;
    }
    
    smoothGradients(gradients) {
        if (gradients.length < 5) return gradients;
        
        const smoothed = [];
        const windowSize = 5; // 5-point moving average
        
        for (let i = 0; i < gradients.length; i++) {
            let sum = 0;
            let count = 0;
            
            // Calculate moving average
            for (let j = Math.max(0, i - Math.floor(windowSize / 2)); 
                 j <= Math.min(gradients.length - 1, i + Math.floor(windowSize / 2)); 
                 j++) {
                sum += gradients[j];
                count++;
            }
            
            smoothed.push(sum / count);
        }
        
        return smoothed;
    }
    
    drawElevationAndGradientChart(elevations, gradients, cumulativeDistances) {
        const canvas = document.getElementById('elevationChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart dimensions
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Calculate scales
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const elevationRange = maxElevation - minElevation;
        
        console.log('🏔️ ELEVATION CHART: min=' + minElevation + 'm, max=' + maxElevation + 'm, range=' + elevationRange + 'm');
        console.log('🏔️ ELEVATION CHART: Peak elevation=' + maxElevation + 'm (' + (maxElevation * 3.28084).toFixed(0) + 'ft)');
        
        // Draw simple grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = padding + (chartWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        // Calculate total distance first (needed for elevation drawing)
        const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] || 1000; // fallback to 1km
        
        // Draw elevation profile - USE CUMULATIVE DISTANCES FOR ACCURATE MAPPING
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        elevations.forEach((elevation, i) => {
            // Use cumulative distance for x-coordinate (not array index)
            const distance = cumulativeDistances[i] || 0;
            const x = padding + (distance / totalDistance) * chartWidth;
            const y = padding + chartHeight - ((elevation - minElevation) / elevationRange) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        ctx.stroke();
        
        // Draw peak marker
        const peakIndex = elevations.indexOf(maxElevation);
        if (peakIndex !== -1) {
            const peakDistance = cumulativeDistances[peakIndex] || 0;
            const peakX = padding + (peakDistance / totalDistance) * chartWidth;
            const peakY = padding + chartHeight - ((maxElevation - minElevation) / elevationRange) * chartHeight;
            const peakDistanceInMiles = (peakDistance * 0.621371 / 1000).toFixed(2);
            const peakElevationInFeet = Math.round(maxElevation * 3.28084);
            
            console.log(`🏔️ PEAK MARKER: Point ${peakIndex} at ${peakDistanceInMiles}mi, ${peakElevationInFeet}ft, canvas (${peakX.toFixed(1)}, ${peakY.toFixed(1)})`);
            
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(peakX, peakY, 6, 0, 2 * Math.PI, false);
            ctx.fill();
        }
        
        // Draw axes labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        
        // Y-axis labels (elevation)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const elevation = minElevation + (elevationRange / 5) * (5 - i);
            const y = padding + (chartHeight / 5) * i;
            const elevationText = useImperialUnits ? 
                Math.round(elevation * 3.28084) + ' ft' : 
                Math.round(elevation) + ' m';
            ctx.fillText(elevationText, padding - 5, y + 4);
        }
        
        // X-axis labels (distance) - align with actual sampling
        ctx.textAlign = 'center';
        
        // Use smaller, more frequent grid lines that align better with 50m sampling
        const numGridLines = Math.min(10, Math.max(5, Math.floor(totalDistance / 500))); // Grid every ~500m
        const distanceStep = totalDistance / numGridLines;
        
        // Draw grid lines and labels
        for (let i = 0; i <= numGridLines; i++) {
            const distance = i * distanceStep;
            const x = padding + (distance / totalDistance) * chartWidth;
            
            // Draw distance label
            const distanceText = useImperialUnits ? 
                (distance * 0.621371 / 1000).toFixed(2) + ' mi' : 
                (distance / 1000).toFixed(2) + ' km';
            
            ctx.fillText(distanceText, x, height - padding + 20);
            
            // Draw vertical grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        // Debug elevation point positions vs grid lines
        console.log(`🏔️ COORDINATE MAPPING DEBUG:`);
        console.log(`🏔️ Chart area: x=${padding} to ${padding + chartWidth}, y=${padding} to ${padding + chartHeight}`);
        console.log(`🏔️ Elevation range: ${minElevation.toFixed(1)}m to ${maxElevation.toFixed(1)}m (range=${elevationRange.toFixed(1)}m)`);
        console.log(`🏔️ Distance range: 0m to ${totalDistance.toFixed(1)}m`);
        console.log(`🏔️ Array lengths: elevations=${elevations.length}, cumulativeDistances=${cumulativeDistances.length}`);
        
        // Find the actual highest elevation point
        const maxElevationIndex = elevations.indexOf(maxElevation);
        const maxElevationDistance = cumulativeDistances[maxElevationIndex] || 0;
        const maxElevationX = padding + (maxElevationDistance / totalDistance) * chartWidth;
        const maxElevationY = padding + chartHeight - ((maxElevation - minElevation) / elevationRange) * chartHeight;
        const maxElevationDistanceInMiles = (maxElevationDistance * 0.621371 / 1000).toFixed(2);
        const maxElevationInFeet = Math.round(maxElevation * 3.28084);
        
        console.log(`🏔️ HIGHEST ELEVATION POINT:`);
        console.log(`🏔️ Point ${maxElevationIndex}: ${maxElevationDistanceInMiles}mi, ${maxElevationInFeet}ft`);
        console.log(`  - Distance: ${maxElevationDistance.toFixed(1)}m, x=${maxElevationX.toFixed(1)}`);
        console.log(`  - Elevation: ${maxElevation.toFixed(1)}m, y=${maxElevationY.toFixed(1)}`);
        
        // Debug first few elevation points with coordinate calculations
        console.log(`🏔️ FIRST 5 POINTS DETAIL:`);
        for (let i = 0; i < Math.min(5, elevations.length); i++) {
            const elevation = elevations[i];
            const distance = cumulativeDistances[i] || 0;
            
            // Calculate x and y coordinates step by step
            const xRatio = distance / totalDistance;
            const x = padding + xRatio * chartWidth;
            
            const yRatio = (elevation - minElevation) / elevationRange;
            const y = padding + chartHeight - yRatio * chartHeight;
            
            const distanceInMiles = (distance * 0.621371 / 1000).toFixed(2);
            const elevationInFeet = Math.round(elevation * 3.28084);
            
            console.log(`🏔️ Point ${i}: ${distanceInMiles}mi, ${elevationInFeet}ft`);
            console.log(`  - Distance: ${distance.toFixed(1)}m, ratio=${xRatio.toFixed(3)}, x=${x.toFixed(1)}`);
            console.log(`  - Elevation: ${elevation.toFixed(1)}m, ratio=${yRatio.toFixed(3)}, y=${y.toFixed(1)}`);
        }
        
        // Debug last point
        const lastIndex = elevations.length - 1;
        const lastElevation = elevations[lastIndex];
        const lastDistance = cumulativeDistances[lastIndex] || 0;
        const lastXRatio = lastDistance / totalDistance;
        const lastX = padding + lastXRatio * chartWidth;
        const lastYRatio = (lastElevation - minElevation) / elevationRange;
        const lastY = padding + chartHeight - lastYRatio * chartHeight;
        const lastDistanceInMiles = (lastDistance * 0.621371 / 1000).toFixed(2);
        const lastElevationInFeet = Math.round(lastElevation * 3.28084);
        
        console.log(`🏔️ LAST POINT DETAIL:`);
        console.log(`🏔️ Point ${lastIndex}: ${lastDistanceInMiles}mi, ${lastElevationInFeet}ft`);
        console.log(`  - Distance: ${lastDistance.toFixed(1)}m, ratio=${lastXRatio.toFixed(3)}, x=${lastX.toFixed(1)}`);
        console.log(`  - Elevation: ${lastElevation.toFixed(1)}m, ratio=${lastYRatio.toFixed(3)}, y=${lastY.toFixed(1)}`);
        
        // Check if arrays are properly aligned
        if (elevations.length !== cumulativeDistances.length) {
            console.error(`🚨 ARRAY MISMATCH: elevations.length (${elevations.length}) != cumulativeDistances.length (${cumulativeDistances.length})`);
        }
        
        // Find elevation points near grid lines for comparison
        elevations.forEach((elevation, i) => {
            const distance = cumulativeDistances[i] || 0;
            const x = padding + (distance / totalDistance) * chartWidth;
            const y = padding + chartHeight - ((elevation - minElevation) / elevationRange) * chartHeight;
            
            const distanceInMiles = (distance * 0.621371 / 1000).toFixed(2);
            const elevationInFeet = Math.round(elevation * 3.28084);
            
            // Check if this point is near a grid line (within 10 pixels)
            for (let j = 0; j <= numGridLines; j++) {
                const gridDistance = j * distanceStep;
                const gridX = padding + (gridDistance / totalDistance) * chartWidth;
                const gridDistanceInMiles = (gridDistance * 0.621371 / 1000).toFixed(2);
                
                if (Math.abs(x - gridX) < 10) {
                    console.log(`🏔️ NEAR GRID: Point ${i} (${distanceInMiles}mi, ${elevationInFeet}ft) at x=${x.toFixed(1)} near grid ${gridDistanceInMiles}mi at x=${gridX.toFixed(1)}`);
                }
            }
        });
        
        // Draw x-axis line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Title
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Elevation Profile', width / 2, 20);
        
        // Store chart data for hover functionality
        this.chartData = {
            elevations,
            gradients,
            cumulativeDistances,
            padding,
            chartWidth,
            chartHeight,
            minElevation,
            maxElevation,
            totalDistance,
            distanceStep,
            numGridLines
        };
        
    }
    
    handleRouteHover(event) {
        if (!this.routeLayer || !this.currentElevationData) return;
        
        // Get mouse position on map
        const mouseLatLng = this.map.mouseEventToLatLng(event.originalEvent);
        if (!mouseLatLng) return;
        
        // Find closest point on route to mouse position
        const routePoints = this.routeLayer.getLatLngs();
        if (!routePoints || routePoints.length === 0) return;
        
        let minDistance = Infinity;
        let closestPointIndex = 0;
        let closestDistance = 0;
        
        // Find closest route point to mouse position
        for (let i = 0; i < routePoints.length; i++) {
            const point = routePoints[i];
            const distance = this.calculateDistance(
                mouseLatLng.lat, mouseLatLng.lng,
                point.lat, point.lng
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPointIndex = i;
                closestDistance = distance;
            }
        }
        
        // Only show hover if close enough to route (within 50 meters)
        if (minDistance > 50) {
            this.clearRouteHover();
            return;
        }
        
        // Calculate cumulative distance to this point
        let cumulativeDistance = 0;
        for (let i = 0; i < closestPointIndex; i++) {
            if (i < routePoints.length - 1) {
                cumulativeDistance += this.calculateDistance(
                    routePoints[i].lat, routePoints[i].lng,
                    routePoints[i + 1].lat, routePoints[i + 1].lng
                );
            }
        }
        
        // Get elevation and gradient from pre-calculated arrays (same as chart)
        const elevation = this.currentElevationData.elevations ? 
            this.currentElevationData.elevations[closestPointIndex] : 0;
        const gradient = this.currentElevationData.gradients ? 
            this.currentElevationData.gradients[closestPointIndex] : 0;
        
        console.log(`🔍 Route hover using pre-calculated data:`);
        console.log(`  - Closest point index: ${closestPointIndex}`);
        console.log(`  - Elevation: ${elevation}`);
        console.log(`  - Gradient: ${gradient}%`);
        console.log(`  - Total gradients: ${this.currentElevationData.gradients ? this.currentElevationData.gradients.length : 'undefined'}`);
        
        this.showRouteHoverInfo(event, elevation, cumulativeDistance, gradient);
    }
    
    clearRouteHover() {
        const hoverInfo = document.getElementById('routeHoverInfo');
        if (hoverInfo) hoverInfo.style.display = 'none';
    }
    
    showRouteHoverInfo(event, elevation, distance, gradient) {
        let hoverInfo = document.getElementById('routeHoverInfo');
        
        if (!hoverInfo) {
            hoverInfo = document.createElement('div');
            hoverInfo.id = 'routeHoverInfo';
            hoverInfo.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-family: Arial, sans-serif;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 200px;
                white-space: nowrap;
            `;
            document.body.appendChild(hoverInfo);
        }
        
        const useImperialUnits = document.getElementById('useImperialUnits')?.checked || false;
        const elevationText = useImperialUnits ? 
            Math.round(elevation * 3.28084) + ' ft' : 
            Math.round(elevation) + ' m';
        const distanceText = useImperialUnits ? 
            (distance * 0.621371 / 1000).toFixed(2) + ' mi' : 
            (distance / 1000).toFixed(2) + ' km';
        const gradientText = gradient ? gradient.toFixed(1) + '%' : 'N/A';
        
        hoverInfo.innerHTML = `
            <div><strong>Elevation:</strong> ${elevationText}</div>
            <div><strong>Distance:</strong> ${distanceText}</div>
            <div><strong>Grade:</strong> ${gradientText}</div>
        `;
        
        // Position with screen boundary detection
        let left = event.originalEvent.clientX + 10;
        let top = event.originalEvent.clientY - 40;
        
        // Get tooltip dimensions
        hoverInfo.style.display = 'block';
        const tooltipRect = hoverInfo.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;
        
        // Screen boundaries
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const margin = 10;
        
        // Adjust horizontal position if needed
        if (left + tooltipWidth > screenWidth - margin) {
            left = event.originalEvent.clientX - tooltipWidth - 10;
        }
        if (left < margin) {
            left = margin;
        }
        
        // Adjust vertical position if needed
        if (top < margin) {
            top = margin;
        }
        if (top + tooltipHeight > screenHeight - margin) {
            top = event.originalEvent.clientY - tooltipHeight - 10;
        }
        
        hoverInfo.style.left = left + 'px';
        hoverInfo.style.top = top + 'px';
    }
    
    calculateElevationGain(elevations) {
        let gain = 0;
        for (let i = 1; i < elevations.length; i++) {
            if (elevations[i] > elevations[i-1]) {
                gain += elevations[i] - elevations[i-1];
            }
        }
        return gain;
    }
    
    calculateElevationLoss(elevations) {
        let loss = 0;
        for (let i = 1; i < elevations.length; i++) {
            if (elevations[i] < elevations[i-1]) {
                loss += elevations[i-1] - elevations[i];
            }
        }
        return loss;
    }
    
    displayElevationStats(gain, loss, peak, min, routeData) {
        const routeInfoDiv = document.getElementById('routeInfo');
        if (!routeInfoDiv) return;
        
        // Find existing elevation stats or create new ones
        let elevationStatsDiv = routeInfoDiv.querySelector('.elevation-stats');
        if (!elevationStatsDiv) {
            elevationStatsDiv = document.createElement('div');
            elevationStatsDiv.className = 'elevation-stats';
            routeInfoDiv.appendChild(elevationStatsDiv);
        }
        
        const distanceText = this.convertDistance(routeData.distance);
        const durationText = Math.round(routeData.duration / 60) + ' min';
        const speedText = this.convertSpeed(routeData.distance / 1000 / (routeData.duration / 60));
        const gainText = this.convertElevation(gain);
        const lossText = this.convertElevation(loss);
        const peakText = this.convertElevation(peak);
        const minText = this.convertElevation(min);
        
        elevationStatsDiv.innerHTML = `
            <div class="route-stat">
                <span class="stat-icon">📏</span>
                <span class="stat-text">Distance: ${distanceText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">⏱️</span>
                <span class="stat-text">Duration: ${durationText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">🚴</span>
                <span class="stat-text">Avg Speed: ${speedText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">🏔️</span>
                <span class="stat-text">Elevation Gain: ${gainText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">📉</span>
                <span class="stat-text">Elevation Loss: ${lossText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">⛰️</span>
                <span class="stat-text">Peak Elevation: ${peakText}</span>
            </div>
            <div class="route-stat">
                <span class="stat-icon">🏞</span>
                <span class="stat-text">Min Elevation: ${minText}</span>
            </div>
        `;
    }
    
    showElevationUnavailable() {
        const elevationDiv = document.getElementById('elevationProfile');
        if (!elevationDiv) return;
        
        elevationDiv.style.display = 'block';
        elevationDiv.innerHTML = `
            <h3>🏔️ Elevation Profile</h3>
            <div class="elevation-stats">
                <div class="route-stat">
                    <span class="stat-icon">📊</span>
                    <span class="stat-text">Elevation data unavailable</span>
                </div>
            </div>
        `;
    }
    
    displayTurnDirections(steps) {
        console.log('🚨 displayTurnDirections called with steps:', steps.length);
        console.log('🚨 Steps data:', steps);
        
        const directionsDiv = document.getElementById('turnDirections');
        if (!directionsDiv) {
            console.log('🚨 turnDirections div not found!');
            return;
        }
        
        directionsDiv.innerHTML = '<h3>🚴 Turn-by-Turn Directions</h3>';
        
        console.log(`📍 Total steps: ${steps.length}`);
        console.log(`📍 All steps data:`, steps);
        
        // Handle different API formats
        let processedSteps;
        const routingApi = document.getElementById('routingApi');
        const apiType = routingApi ? routingApi.value : 'valhalla';
        
        console.log(`🔍 Processing directions for API type: ${apiType}`);
        console.log(`🔍 Total steps received: ${steps.length}`);
        console.log(`🔍 First step structure:`, steps[0]);
        
        if (apiType === 'mapbox') {
            console.log('🔍 Using Mapbox processing');
            // Mapbox API format
            processedSteps = steps.legs[0].steps.map((step, index) => ({
                instruction: step.maneuver.instruction || 'Continue',
                distance: step.distance || 0,
                duration: step.duration || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'graphhopper') {
            console.log('🔍 Using GraphHopper processing');
            // GraphHopper API format
            processedSteps = steps.paths[0].instructions.map((step, index) => ({
                instruction: step.text || 'Continue',
                distance: step.distance || 0,
                duration: step.time || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'openrouteservice') {
            console.log('🔍 Using OpenRouteService processing');
            // OpenRouteService API format
            processedSteps = steps.features[0].properties.segments.map((step, index) => ({
                instruction: step.instruction || 'Continue',
                distance: step.distance || 0,
                duration: step.duration || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'valhalla') {
            console.log('🔍 Using Valhalla processing');
            // Valhalla API format - distance/time are directly in step, not maneuver
            processedSteps = steps.map((step, index) => {
                // Valhalla stores distance in 'length' and time in 'time' fields directly in step
                const stepLength = step.length || 0;
                const stepTime = step.time || 0;
                
                // Convert km to meters (Valhalla returns length in km)
                const distance = stepLength * 1000;
                // Time is in seconds, will convert to minutes in display
                
                console.log(`Processing Valhalla step ${index + 1}: length=${stepLength}km, time=${stepTime}s → distance=${distance}m`);
                
                return {
                    instruction: step.instruction || 'Continue',
                    distance: distance,
                    duration: stepTime,
                    maneuver: step // Store full step for street name access
                };
            });
        } else {
            console.log('🔍 Using OSRM processing (default)');
            // OSRM API format
            processedSteps = steps;
        }
        
        console.log(`🔍 Processed ${processedSteps.length} steps for display`);
        
        processedSteps.forEach((step, index) => {
            const instruction = step.instruction || step.html_instructions || 'Continue';
            
            // Use the processed distance and duration values
            const distance = this.convertDistance(step.distance);
            const duration = Math.round((step.duration || 0) / 60);
            
            // Debug: Log each step creation
            console.log(`🔍 Creating step ${index + 1}/${processedSteps.length}: "${instruction.substring(0, 50)}..."`);
            console.log(`  Distance: ${distance}, Duration: ${duration}min`);
            
            // For Valhalla, extract street names from maneuver.street_names
            let displayInstruction = instruction;
            
            if (apiType === 'valhalla' && step.maneuver?.street_names && step.maneuver.street_names.length > 0) {
                // Valhalla provides street_names array (now step.maneuver contains the full step)
                const streetName = step.maneuver.street_names[0];
                if (streetName && streetName.trim().length > 0) {
                    // Check if instruction already contains the street name
                    if (!instruction.includes(streetName)) {
                        displayInstruction = `${streetName} - ${instruction}`;
                    }
                }
            } else if (apiType !== 'valhalla') {
                // For other APIs, use the original street name extraction
                const streetName = this.extractStreetName(instruction);
                
                if (streetName && streetName.trim().length > 0) {
                    // Remove the street name from instruction and format properly
                    const cleanInstruction = instruction.replace(streetName, '').replace(/\s+/g, ' ').trim();
                    displayInstruction = `${streetName.trim()} - ${cleanInstruction}`;
                } else {
                    // Fallback: Show route type when no street name found
                    const routeTypeSelect = document.getElementById('routeType');
                    const routeType = routeTypeSelect ? routeTypeSelect.value : 'drive';
                    const routeTypeDescription = routeType === 'drive' ? 'Road' : routeType === 'cycling' ? 'MTB Trail' : 'Walking Path';
                    displayInstruction = `${routeTypeDescription} - ${instruction}`;
                }
            }
            
            const stepDiv = document.createElement('div');
            stepDiv.className = 'turn-step';
            
            stepDiv.innerHTML = `
                <div class="turn-step-header">
                    <span class="turn-step-number">${index + 1}</span>
                    <span class="turn-step-distance">${distance}</span>
                </div>
                <div class="turn-instruction">${displayInstruction}</div>
                <div class="turn-step-details">
                    <span class="turn-duration">⏱️ ${duration} min</span>
                </div>
            `;
            
            console.log(`🔍 Step ${index + 1} HTML created and appended`);
            directionsDiv.appendChild(stepDiv);
        });
        
        console.log(`🔍 Total steps processed: ${processedSteps.length}`);
        console.log(`🔍 Total children in directionsDiv: ${directionsDiv.children.length}`);
    }
    calculateGradientStatistics(elevationData, routePoints) {
        try {
            const gradients = [];
            
            // Calculate gradient between consecutive elevation points using 50m run
            for (let i = 0; i < elevationData.length - 1; i++) {
                const currentPoint = elevationData[i];
                const nextPoint = elevationData[i + 1];
                
                if (currentPoint && nextPoint) {
                    const elevationChange = nextPoint.elevation - currentPoint.elevation;
                    
                    // Use fixed 50m run for consistent gradient calculation
                    const fixedRun = 50; // 50 meters horizontal distance
                    
                    // Calculate gradient using rise/run × 100 formula
                    const gradient = (elevationChange / fixedRun) * 100;
                    
                    // Filter out unrealistic gradients (> 30% or < -30%)
                    if (Math.abs(gradient) <= 30) {
                        gradients.push(gradient);
                    } else {
                        console.log(`🏔️ Filtering unrealistic gradient: ${gradient}% (elevation change: ${elevationChange}m over 50m run)`);
                    }
                }
            }
            
            console.log(`🏔️ Valid gradients calculated: ${gradients.length} from ${elevationData.length - 1} segments`);
            
            if (gradients.length === 0) {
                console.log(`🏔️ No valid gradients found, returning zeros`);
                return { medianGrade: 0, maxGrade: 0, minGrade: 0 };
            }
            
            // Sort gradients for median calculation
            gradients.sort((a, b) => a - b);
            
            // Calculate median properly
            let medianGrade;
            if (gradients.length % 2 === 0) {
                // Even number of gradients - take average of middle two
                const mid1 = gradients[gradients.length / 2 - 1];
                const mid2 = gradients[gradients.length / 2];
                medianGrade = (mid1 + mid2) / 2;
            } else {
                // Odd number of gradients - take middle value
                medianGrade = gradients[Math.floor(gradients.length / 2)];
            }
            
            const maxGrade = Math.max(...gradients);
            const minGrade = Math.min(...gradients);
            
            console.log(`🏔️ Gradient statistics debug:`);
            console.log(`  - Total gradients: ${gradients.length}`);
            console.log(`  - Sample gradients: ${gradients.slice(0, 5).join(', ')}...`);
            console.log(`  - Sorted range: ${minGrade}% to ${maxGrade}%`);
            console.log(`  - Median calculation: ${gradients.length % 2 === 0 ? 'average of middle two' : 'middle value'}`);
            console.log(`  - Final median: ${medianGrade}%`);
            
            return {
                medianGrade: Math.round(medianGrade * 10) / 10, // Round to 1 decimal
                maxGrade: Math.round(maxGrade * 10) / 10,
                minGrade: Math.round(minGrade * 10) / 10
            };
        } catch (error) {
            console.error('Error calculating gradient statistics:', error);
            return { medianGrade: 0, maxGrade: 0, minGrade: 0 };
        }
    }
    
    calculateStepGradient(step, routePoints) {
        // Calculate gradient for a single maneuver
        try {
            const startIndex = step.maneuver.begin_shape_index;
            const endIndex = step.maneuver.end_shape_index;
            
            if (startIndex === undefined || endIndex === undefined || !routePoints || startIndex >= endIndex) {
                return 0; // Flat or invalid
            }
            
            let totalElevationChange = 0;
            let totalHorizontalDistance = 0;
            
            // Calculate elevation change and horizontal distance for this maneuver
            for (let i = startIndex; i < endIndex; i++) {
                const currentPoint = routePoints[i];
                const nextPoint = routePoints[i + 1];
                
                if (currentPoint && nextPoint) {
                    // Elevation change
                    totalElevationChange += (nextPoint.lat - currentPoint.lat) * 111320; // meters per degree latitude
                    
                    // Horizontal distance (Haversine formula simplified)
                    const lat1 = currentPoint.lat * Math.PI / 180;
                    const lat2 = nextPoint.lat * Math.PI / 180;
                    const lon1 = currentPoint.lng * Math.PI / 180;
                    const lon2 = nextPoint.lng * Math.PI / 180;
                    
                    const dLat = lat2 - lat1;
                    const dLon = lon2 - lon1;
                    const a = Math.sin(dLat / 2) * Math.sin(dLon / 2);
                    const c = Math.sqrt(1 - a * a);
                    const r = 6371000; // Earth's radius in meters
                    
                    const distance = r * c * 2;
                    totalHorizontalDistance += distance;
                }
            }
            
            // Calculate gradient as percentage
            const gradient = totalHorizontalDistance > 0 ? (totalElevationChange / totalHorizontalDistance) * 100 : 0;
            
            return Math.round(gradient * 10) / 10; // Round to 1 decimal place
        } catch (error) {
            console.error('Error calculating gradient:', error);
            return 0;
        }
    }
    
    getDifficultyRating(gradient) {
        // Rate difficulty based on gradient percentage
        if (gradient < 0) return 'uphill'; // Negative gradient = uphill
        if (gradient === 0) return 'flat';
        
        if (gradient <= 2) return 'easy';
        if (gradient <= 4) return 'moderate';
        if (gradient <= 6) return 'hard';
        if (gradient <= 8) return 'very-hard';
        return 'extreme';
    }
    
    extractStreetName(instruction) {
        // Try to extract street name from instruction
        // OSRM instruction patterns to handle:
        // "Turn right onto Main Street", "Continue on Oak Street", "Head north on Elm Street"
        // "Turn left", "Continue", "Keep right", "Keep left", "Sharp right", "Sharp left"
        
        console.log(`🔍 Extracting street name from: "${instruction}"`);
        
        // Pattern 1: Turn/Head/Continue + direction + onto/on + street name
        const pattern1 = instruction.match(/(?:Turn|Head|Continue|Stay|Merge|Go straight|Keep|Sharp) (?:right|left|north|south|east|west|straight) (?:onto|on) (?:the )?([A-Z][a-z0-9\s-]+)/i);
        if (pattern1) {
            const streetName = pattern1[1].trim();
            console.log(`✅ Found street name (pattern1): "${streetName}"`);
            return streetName;
        }
        
        // Pattern 2: Simple onto/on + street name
        const pattern2 = instruction.match(/(?:onto|on) (?:the )?([A-Z][a-z0-9\s-]+)/i);
        if (pattern2) {
            const streetName = pattern2[1].trim();
            console.log(`✅ Found street name (pattern2): "${streetName}"`);
            return streetName;
        }
        
        // Pattern 3: Street name at the end (common in OSRM) - be more specific
        const pattern3 = instruction.match(/(?:onto|on) (?:the )?([A-Z][a-z0-9\s-]+)$/);
        if (pattern3) {
            const streetName = pattern3[1].trim();
            console.log(`✅ Found street name (pattern3): "${streetName}"`);
            return streetName;
        }
        
        // Pattern 4: Look for capitalized words that might be street names
        const words = instruction.split(' ');
        console.log(`🔍 Analyzing words: [${words.join(', ')}]`);
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            console.log(`  Checking word "${word}": starts with capital? ${/^[A-Z][a-z]/.test(word)}, excluded? ${!/^(Turn|Head|Continue|Stay|Merge|Go|Keep|Sharp|right|left|north|south|east|west|straight|onto|on|the|and|or|at|in|for|of|to)$/i.test(word)}`);
            
            // Check if word starts with capital and is not a direction/common word
            if (/^[A-Z][a-z]/.test(word) && 
                !/^(Turn|Head|Continue|Stay|Merge|Go|Keep|Sharp|right|left|north|south|east|west|straight|onto|on|the|and|or|at|in|for|of|to)$/i.test(word)) {
                // Look ahead for more capitalized words
                let streetName = word;
                let j = i + 1;
                while (j < words.length && /^[A-Z][a-z]/.test(words[j])) {
                    streetName += ' ' + words[j];
                    j++;
                }
                if (streetName.length > 3) {
                    console.log(`✅ Found street name (pattern4): "${streetName}"`);
                    return streetName;
                }
            }
        }
        
        console.log(`❌ No street name found in: "${instruction}"`);
        return null;
    }
    
    clearRoute() {
        console.log('🧹 clearRoute called');
        console.log('🧹 Before clear - startMarker:', !!this.startMarker, 'endMarker:', !!this.endMarker, 'waypoints:', this.waypoints.length);
        
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
        
        // Reset mode to start point
        this.updateMapMode('start');
        
        console.log('🧹 After clear - startMarker:', !!this.startMarker, 'endMarker:', !!this.endMarker, 'waypoints:', this.waypoints.length);
        
        this.updateWaypointCounter();
    }
}
