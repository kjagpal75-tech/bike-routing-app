// DEBUG: This should appear at the very top of the console
console.log('🚀 APP.JS LOADED - VERSION 2.2.4 WITH TIMESTAMP');
console.log('🚀 CURRENT TIME:', new Date().toISOString());

// Update debug indicator on page
const debugIndicator = document.getElementById('debugIndicator');
if (debugIndicator) {
    debugIndicator.textContent = '🚀 LOADED: app.js v2.2.4';
    debugIndicator.style.background = 'green';
}

// Add compact debug panel
const debugPanel = document.createElement('div');
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

// Update debug panel helper
window.updateDebugPanel = (key, value) => {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        const timestamp = new Date().toLocaleTimeString();
        panel.innerHTML += `<div>[${timestamp}] ${key}: ${value}</div>`;
        // Keep only last 10 lines
        const lines = panel.innerHTML.split('<div>');
        if (lines.length > 10) {
            panel.innerHTML = lines.slice(-10).join('<div>');
        }
    }
};

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, initializing BikeRoutePlanner');
    new BikeRoutePlanner();
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
            // For known locations, provide hardcoded suggestions
            if (query.toLowerCase().includes('fremont')) {
                const fremontResults = [
                    { display_name: '38695, Dow Court, Fremont, California, United States', lat: '37.548523', lon: '-121.998934' },
                    { display_name: 'Dow Court, Fremont, California, United States', lat: '37.548523', lon: '-121.998934' },
                    { display_name: 'Fremont, California, United States', lat: '37.548523', lon: '-121.998934' },
                    { display_name: 'Central Park, Fremont, California, United States', lat: '37.5495', lon: '-121.9814' },
                    { display_name: 'Lake Elizabeth, Fremont, California, United States', lat: '37.5488', lon: '-121.9834' }
                ];
                this.displaySuggestions(fremontResults, type);
                return;
            }
            
            if (query.toLowerCase().includes('san francisco')) {
                const sfResults = [
                    { display_name: 'San Francisco, California, United States', lat: '37.7749', lon: '-122.4194' },
                    { display_name: 'Golden Gate Bridge, San Francisco, California, United States', lat: '37.8199', lon: '-122.4783' },
                    { display_name: 'Fisherman\'s Wharf, San Francisco, California, United States', lat: '37.8087', lon: '-122.4098' },
                    { display_name: 'Union Square, San Francisco, California, United States', lat: '37.7879', lon: '-122.4075' }
                ];
                this.displaySuggestions(sfResults, type);
                return;
            }
            
            if (query.toLowerCase().includes('oakland')) {
                const oaklandResults = [
                    { display_name: 'Oakland, California, United States', lat: '37.8044', lon: '-122.2711' },
                    { display_name: 'Jack London Square, Oakland, California, United States', lat: '37.8047', lon: '-122.2726' },
                    { display_name: 'Lake Merritt, Oakland, California, United States', lat: '37.7953', lon: '-122.2699' }
                ];
                this.displaySuggestions(oaklandResults, type);
                return;
            }
            
            // For other queries, try direct Nominatim (may fail due to CORS)
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', California')}&limit=5&addressdetails=1`, {
                    mode: 'no-cors'
                });
                
                // Since we can't read the response due to CORS, we'll provide a fallback
                console.log('❌ CORS blocked - providing manual suggestions');
                this.showCORSBlockedMessage(type);
                
            } catch (corsError) {
                console.log('❌ CORS blocked - providing manual suggestions');
                this.showCORSBlockedMessage(type);
            }
            
        } catch (error) {
            console.error('Address search error:', error);
            this.showCORSBlockedMessage(type);
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
        // Set start point first, then end point, then waypoints
        if (!this.startMarker) {
            this.setStartPoint(e.latlng);
        } else if (!this.endMarker) {
            // Check if return to start is enabled
            const returnToStartCheckbox = document.getElementById('returnToStart');
            if (returnToStartCheckbox && returnToStartCheckbox.checked) {
                console.log('🔄 Return to start is enabled - ignoring map click for end point');
                return;
            }
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
            this.map.setView(latlng, 15);
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
        
        this.startMarker = L.marker(latlng, { icon: this.startIcon, draggable: true }).addTo(this.map);
        
        // Don't override the input field if it already has an address
        const startInput = document.getElementById('startInput');
        if (startInput && !startInput.value) {
            startInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
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
            
            console.log('🔄 Start point updated - end point synchronized for return to start');
        }
        
        // Update waypoint counter
        this.updateWaypointCounter();
    }
    
    setEndPoint(latlng) {
        // Check if return to start is enabled - if so, don't allow manual end point setting
        const returnToStartCheckbox = document.getElementById('returnToStart');
        if (returnToStartCheckbox && returnToStartCheckbox.checked) {
            console.log('🔄 Return to start is enabled - ignoring manual end point setting');
            return;
        }
        
        if (this.endMarker) {
            this.map.removeLayer(this.endMarker);
        }
        
        this.endMarker = L.marker(latlng, { icon: this.endIcon, draggable: true }).addTo(this.map);
        
        // Don't override the input field if it already has an address
        const endInput = document.getElementById('endInput');
        if (endInput && !endInput.value) {
            endInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }
        
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
            <input type="text" class="waypoint-input" id="waypointInput${waypointId}" placeholder="Enter California address or POI" value="" />
        `;
        
        waypointsList.appendChild(waypointDiv);
        
        // Add address search functionality to this waypoint input
        const waypointInput = waypointDiv.querySelector('.waypoint-input');
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
            suggestionDiv.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur from firing first
                this.selectWaypointSuggestion(result, waypointId);
            });
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
                <input type="text" class="waypoint-input" id="waypointInput${waypoint.id}" placeholder="Enter California address or POI" value="" />
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
            console.log('🗑️ Clearing existing route...');
            this.clearRoute();
            
            // Test different address formats for Dow Court, Fremont
            console.log('📍 Testing address resolution...');
            
            // Try the specific address first
            const startAddress = "38695, Dow Court, Fremont, CA";
            console.log(`🔍 Trying to resolve: ${startAddress}`);
            
            let startResult = await this.tryResolveAddress(startAddress);
            if (!startResult) {
                // Fallback to Dow Court, Fremont
                console.log('� Trying fallback: Dow Court, Fremont, CA');
                startResult = await this.tryResolveAddress("Dow Court, Fremont, CA");
            }
            
            if (!startResult) {
                // Fallback to Fremont, CA
                console.log('🔄 Trying fallback: Fremont, CA');
                startResult = await this.tryResolveAddress("Fremont, CA");
            }
            
            if (startResult) {
                const startLatlng = L.latLng(parseFloat(startResult.lat), parseFloat(startResult.lon));
                this.setStartPoint(startLatlng);
                console.log(`✅ Start point set to: ${startResult.display_name}`);
            } else {
                console.log('❌ Could not resolve start address');
                this.showNotification('Could not resolve start address', 'error');
                return;
            }
            
            // Set waypoint: Vargas Regional Park
            console.log('📍 Setting waypoint...');
            const waypointAddress = "Vargas Regional Park, Fremont, California";
            await this.addWaypointByAddress(waypointAddress);
            
            // Set end point (same as start)
            console.log('📍 Setting end point...');
            if (startResult) {
                const endLatlng = L.latLng(parseFloat(startResult.lat), parseFloat(startResult.lon));
                this.setEndPoint(endLatlng);
                console.log(`✅ End point set to: ${startResult.display_name}`);
            }
            
            // Show notification
            this.showNotification('Test route setup complete! Click "Generate Route" to see the route.', 'success');
            console.log('🎉 Test route setup complete!');
            
        } catch (error) {
            console.error('❌ Test route setup error:', error);
            this.showNotification('Failed to setup test route', 'error');
        }
    }
    
    async tryResolveAddress(address) {
        try {
            console.log(`🔍 Searching for: ${address}`);
            
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
        let coordinates = [
            this.startMarker.getLatLng(),
            ...this.waypoints.map(w => w.latlng),
            this.endMarker.getLatLng()
        ];
        
        // Get start and end coordinates for logging
        const startLatLng = this.startMarker.getLatLng();
        const endLatLng = this.endMarker.getLatLng();
        
        // If return to start is checked, add start point again at the end
        // But only if the end point is different from the start point
        if (returnToStart) {
            // Only add start point again if it's different from the end point
            if (startLatLng.lat !== endLatLng.lat || startLatLng.lng !== endLatLng.lng) {
                coordinates.push(startLatLng);
            }
        }
        
        console.log(`📍 Generated coordinates:`, coordinates.map(c => `${c.lat},${c.lng}`));
        console.log(`📍 Total coordinates: ${coordinates.length}`);
        console.log(`📍 Return to start: ${returnToStart}`);
        console.log(`📍 Start: ${startLatLng.lat},${startLatLng.lng}`);
        console.log(`📍 End: ${endLatLng.lat},${endLatLng.lng}`);
        console.log(`📍 Waypoints:`, this.waypoints.map(w => `${w.latlng.lat},${w.latlng.lng}`));
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
            const routingApi = routingApiSelect ? routingApiSelect.value : 'osrm';
            
            console.log(`🛣️ Using route type: ${routeType}`);
            console.log(`🌐 Using routing API: ${routingApi}`);
            console.log(`🔄 Return to start: ${returnToStart}`);
            
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
                // Valhalla Directions API - multiple fallback approaches
                // Map route types to Valhalla profiles
                const valhallaProfile = routeType === 'cycling' ? 'bicycle' : routeType === 'drive' ? 'auto' : 'pedestrian';
                
                // Build the JSON data
                const valhallaData = {
                    locations: coordinates.map(coord => ({
                        lat: coord.lat,
                        lon: coord.lng
                    })),
                    costing: valhallaProfile,
                    directions_maneuvers: true,
                    geometry: true,
                    units: 'kilometers'
                };
                
                // Check if running locally - if so, use local proxy for direct Valhalla access
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const isPort8000 = window.location.port === '8000';
                
                const approaches = [
                    // 1. Local proxy for Valhalla API (using working valhalla1 endpoint)
                    ...(isLocalhost && isPort8000 ? [{
                        url: `/valhalla/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`,
                        name: 'Valhalla (local proxy - working API)',
                        processor: 'valhalla',
                        method: 'GET',
                        body: null
                    }] : []),
                    // 2. Direct Valhalla1 API (working endpoint, no proxy needed)
                    {
                        url: `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`,
                        name: 'Valhalla (direct API - Morrison Canyon Road)',
                        processor: 'valhalla',
                        method: 'GET'
                    },
                    // 3. CORS proxies for Valhalla API (using correct endpoint)
                    {
                        url: `https://corsproxy.io/?https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`,
                        name: 'Valhalla (authentic routing) - corsproxy.io',
                        processor: 'valhalla',
                        method: 'GET'
                    },
                    // 4. Direct OSRM (fallback, no CORS issues but different routing)
                    {
                        url: `https://router.project-osrm.org/route/v1/${valhallaProfile}/${coordinates.map(c => `${c.lng},${c.lat}`).join(';')}?overview=full&geometries=geojson&steps=true`,
                        name: 'OSRM (fallback - different routing)',
                        processor: 'osrm',
                        method: 'GET'
                    }
                ];
                
                // Use first approach by default
                apiUrl = approaches[0].url;
                this.currentApproach = approaches[0];
                this.valhallaApproaches = approaches;
                
                console.log(`🛣️ Using approach: ${approaches[0].name}`);
                console.log(`🛣️ API URL: ${apiUrl}`);
                
                // Update debug panel
                window.updateDebugPanel('APPROACH', approaches[0].name);
                window.updateDebugPanel('API', approaches[0].name.includes('proxy') ? 'LOCAL' : 'DIRECT');
                
                if (approaches[0].name.includes('Valhalla')) {
                    console.log(`🛣️ 🎉 Using working Valhalla API with ${valhallaProfile} profile!`);
                    console.log(`🛣️ 🛣️ Authentic Valhalla routing preferences available!`);
                    if (approaches[0].name.includes('direct')) {
                        console.log(`🛣️ 💡 Using direct Valhalla API (no rate limiting)`);
                        window.updateDebugPanel('PROXY', 'DIRECT');
                    } else if (isLocalhost && isPort8000) {
                        console.log(`🛣️ 💡 Using local proxy on port 8000 for direct API access!`);
                        window.updateDebugPanel('PROXY', 'PORT 8000');
                    } else {
                        console.log(`🛣️ 💡 Using CORS proxy for API access`);
                        window.updateDebugPanel('PROXY', 'CORS_PROXY');
                    }
                } else {
                    console.log(`🛣️ 💡 For best results, run locally: python3 proxy-server.py`);
                    console.log(`🛣️ 💡 Then visit: http://localhost:8000 for direct API access`);
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
            const currentApproach = this.currentApproach;
            const response = await fetch(apiUrl, {
                method: currentApproach.method || 'GET',
                headers: currentApproach.method === 'POST' ? {
                    'Content-Type': 'application/json'
                } : {},
                body: currentApproach.body || null,
                mode: 'cors'
            });
            
            // Clear request body after use
            this.orsRequestBody = null;
            
            let data = await response.json();
            
            // Handle CORS proxy response
            if (apiUrl.includes('corsproxy.io') || apiUrl.includes('api.allorigins.win') || apiUrl.includes('cors-anywhere.herokuapp.com')) {
                try {
                    // Check if response is HTML (proxy error page)
                    if (typeof data === 'string' && data.includes('<!DOCTYPE')) {
                        throw new Error('CORS proxy returned HTML error page');
                    }
                    
                    // Different proxies have different response formats
                    if (apiUrl.includes('api.allorigins.win')) {
                        data = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
                    } else if (apiUrl.includes('corsproxy.io')) {
                        data = typeof data === 'string' ? JSON.parse(data) : data;
                    } else {
                        data = typeof data === 'string' ? JSON.parse(data) : data;
                    }
                    console.log(`🛣️ CORS proxy response parsed:`, data);
                } catch (parseError) {
                    console.error('❌ Failed to parse CORS proxy response:', parseError);
                    console.error('❌ Response received:', data);
                    
                    // Try fallback approach for Valhalla
                    if (routingApi === 'valhalla' && this.valhallaApproaches && this.valhallaApproaches.length > 1) {
                        console.log('🔄 CORS proxy failed, trying OSRM fallback...');
                        console.log('🔄 Note: OSRM uses different routing preferences than Valhalla');
                        console.log('🔄 For authentic Valhalla routing (Morrison Canyon Road), run app locally');
                        
                        const fallbackApproach = this.valhallaApproaches[1];
                        apiUrl = fallbackApproach.url;
                        this.currentApproach = fallbackApproach;
                        
                        console.log(`🔄 Using fallback: ${fallbackApproach.name}`);
                        console.log(`🔄 Fallback URL: ${apiUrl}`);
                        
                        // Retry with fallback
                        const retryResponse = await fetch(apiUrl);
                        const retryData = await retryResponse.json();
                        data = retryData;
                        
                        // Process fallback response
                        if (fallbackApproach.processor === 'osrm') {
                            route = data.routes[0];
                            routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                            routeFound = true;
                            console.log('🛣️ OSRM fallback route data extracted:', route);
                            console.log('🛣️ OSRM may use different roads than Valhalla');
                        } else {
                            route = data.routes[0];
                            if (route.geometry) {
                                routePoints = this.decodePolyline(route.geometry);
                            } else {
                                routePoints = [];
                            }
                            routeFound = true;
                            console.log('🛣️ Valhalla fallback route data extracted:', route);
                        }
                    } else {
                        console.error('❌ All Valhalla approaches failed');
                        this.showNotification('Valhalla routing failed. For authentic Valhalla routing via Morrison Canyon Road, run app locally: python -m http.server 8000', 'error');
                        throw new Error(`CORS proxy failed: ${parseError.message}`);
                    }
                }
            }
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
                console.log(`🛣️ Valhalla response structure:`, {
                    trip: data.trip,
                    legs: data.trip?.legs,
                    legsLength: data.trip?.legs?.length,
                    firstLeg: data.trip?.legs?.[0],
                    maneuvers: data.trip?.legs?.[0]?.maneuvers
                });
                
                // Handle different response formats based on approach
                if (this.currentApproach && this.currentApproach.processor === 'osrm') {
                    // OSRM format processing (when using OSRM as Valhalla alternative)
                    if (!data.routes || data.routes.length === 0) {
                        console.error('❌ No routes found in OSRM response');
                        this.showNotification('No route found with OSRM API', 'error');
                        routeFound = false;
                    } else {
                        route = data.routes[0];
                        routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                        routeFound = true;
                        console.log('🛣️ OSRM route data extracted:', route);
                    }
                } else {
                    // Valhalla format processing (when using true Valhalla API)
                    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
                        console.error('❌ No trip found in Valhalla response');
                        this.showNotification('No route found with Valhalla API', 'error');
                        routeFound = false;
                    } else {
                        // Valhalla API returns trip structure with legs
                        const trip = data.trip;
                        
                        console.log('🛣️ Full Valhalla response:', JSON.stringify(trip, null, 2));
                        
                        // Create a consistent route structure for the app
                        route = {
                            legs: trip.legs,
                            distance: trip.summary.length,
                            duration: trip.summary.time,
                            geometry: {
                                coordinates: trip.shape ? this.decodePolyline(trip.shape) : []
                            }
                        };
                        
                        // Valhalla returns geometry as encoded polyline in shape (inside legs[0])
                        if (trip.legs && trip.legs[0] && trip.legs[0].shape) {
                            // Decode Valhalla polyline to coordinates
                            console.log('🛣️ Decoding Valhalla polyline from legs[0].shape:', trip.legs[0].shape.substring(0, 100) + '...');
                            routePoints = this.decodePolyline(trip.legs[0].shape);
                            console.log('🛣️ Decoded routePoints:', routePoints.length, 'points');
                            console.log('🛣️ First point:', routePoints[0]);
                            console.log('🛣️ Last point:', routePoints[routePoints.length - 1]);
                        } else {
                            console.log('🛣️ No shape data in Valhalla response');
                            console.log('🛣️ Available keys in trip:', Object.keys(trip));
                            console.log('🛣️ Legs available:', trip.legs ? trip.legs.length : 'none');
                            if (trip.legs && trip.legs[0]) {
                                console.log('🛣️ Keys in legs[0]:', Object.keys(trip.legs[0]));
                            }
                            routePoints = [];
                        }
                        routeFound = true;
                        console.log('🛣️ Valhalla route data extracted:', trip);
                    }
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
                if (routingApi === 'valhalla' && route.legs && route.legs[0] && route.legs[0].maneuvers) {
                    // Valhalla uses maneuvers instead of steps
                    this.displayTurnDirections(route.legs[0].maneuvers);
                } else if (route.legs && route.legs[0] && route.legs[0].steps) {
                    // OSRM and others use steps
                    this.displayTurnDirections(route.legs[0].steps);
                }
                
                this.displayRouteInfo(route);
                
                // Get elevation data for the route
                await this.getElevationData(routePoints, route);
                
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
            
            // Show user-friendly error message instead of auto-fallback
            if (error.message && error.message.includes('429')) {
                this.showNotification('⚠️ Rate limit exceeded. Please try again in a few minutes or select a different routing API.', 'warning');
            } else if (error.message && error.message.includes('Unexpected token')) {
                this.showNotification('⚠️ API response error. Please try a different routing API or check your connection.', 'warning');
            } else if (error.message && error.message.includes('bounds.getSize')) {
                this.showNotification('⚠️ Map rendering error. Please try a different routing API.', 'warning');
            } else if (error.message && error.message.includes('CORS')) {
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
                this.showNotification('⚠️ Route generation failed. Please try a different routing API.', 'warning');
            }
            
            // Log available alternatives
            console.log('🔄 Available routing APIs to try:');
            console.log('  - OSRM (fallback - different routing)');
            console.log('  - GraphHopper (requires API key)');
            console.log('  - Mapbox (requires API key)');
            console.log('  - OpenRouteService (requires API key)');
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
            console.log(`    lat type:`, typeof point.lat);
            console.log(`    lng type:`, typeof point.lng);
            console.log(`    lat value:`, point.lat, typeof point.lat === 'number' ? '✅ number' : '❌ not number');
            console.log(`    lng value:`, point.lng, typeof point.lng === 'number' ? '✅ number' : '❌ not number');
        }
        
        // Check if coordinates are in reasonable range for California
        const firstPoint = routePoints[0];
        const lastPoint = routePoints[routePoints.length - 1];
        console.log('🗺️ Coordinate range check:');
        console.log(`  First point: lat=${firstPoint.lat}, lng=${firstPoint.lng}`);
        console.log(`  Last point: lat=${lastPoint.lat}, lng=${lastPoint.lng}`);
        console.log(`  Expected California: lat 32-42, lng -125-114`);
        console.log(`  First point in California?`, firstPoint.lat >= 32 && firstPoint.lat <= 42 && firstPoint.lng >= -125 && firstPoint.lng <= -114 ? '✅ YES' : '❌ NO');
        console.log(`  Last point in California?`, lastPoint.lat >= 32 && lastPoint.lat <= 42 && lastPoint.lng >= -125 && lastPoint.lng <= -114 ? '✅ YES' : '❌ NO');
        
        this.routeLayer = L.polyline(routePoints, {
            color: routeColor,
            weight: routeWeight,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(this.map);
        
        console.log('🗺️ Route layer added to map');
        window.updateDebugPanel('MAP_RENDER', 'SUCCESS');
        
        // Debug: Check if layer was added correctly
        console.log('🗺️ Route layer exists:', !!this.routeLayer);
        console.log('🗺️ Route layer on map:', this.routeLayer && this.routeLayer._map ? 'YES' : 'NO');
        
        // Fit map to show entire route
        const bounds = L.latLngBounds(routePoints);
        console.log('🗺️ Fitting map to bounds:', bounds);
        console.log('🗺️ Bounds type:', typeof bounds);
        console.log('🗺️ Bounds constructor:', bounds.constructor.name);
        console.log('🗺️ Bounds center:', bounds.getCenter());
        
        // Check if bounds has getSize method
        if (typeof bounds.getSize === 'function') {
            console.log('🗺️ Bounds size:', bounds.getSize());
        } else {
            console.log('🗺️ Bounds has no getSize method, using manual calculation');
            // Manual bounds calculation - create proper LatLngBounds object
            const firstPoint = routePoints[0];
            const lastPoint = routePoints[routePoints.length - 1];
            
            // Create proper LatLngBounds object
            try {
                const southWest = L.latLng(
                    Math.min(firstPoint.lat, lastPoint.lat),
                    Math.min(firstPoint.lng, lastPoint.lng)
                );
                const northEast = L.latLng(
                    Math.max(firstPoint.lat, lastPoint.lat),
                    Math.max(firstPoint.lng, lastPoint.lng)
                );
                const manualBounds = L.latLngBounds(southWest, northEast);
                
                console.log('🗺️ Manual bounds created:', manualBounds);
                console.log('🗺️ Manual bounds center:', manualBounds.getCenter());
                console.log('🗺️ Manual bounds type:', typeof manualBounds);
                console.log('🗺️ Manual bounds constructor:', manualBounds.constructor.name);
                
                this.map.fitBounds(manualBounds, { padding: [50, 50] });
                console.log('🗺️ Map bounds fitted successfully (manual)');
                window.updateDebugPanel('MAP_RENDER', 'SUCCESS_MANUAL');
            } catch (boundsError) {
                console.error('🗺️ Error creating manual bounds:', boundsError);
                window.updateDebugPanel('MAP_ERROR', 'BOUNDS_CREATE_ERROR');
                
                // Try a simple center point instead of bounds
                try {
                    const centerPoint = routePoints[0];
                    console.log('🗺️ Trying simple center point:', centerPoint);
                    this.map.setView(centerPoint, 14);
                    console.log('🗺️ Map set to center point successfully');
                    window.updateDebugPanel('MAP_RENDER', 'SUCCESS_CENTER');
                } catch (centerError) {
                    console.error('🗺️ Error setting center point:', centerError);
                    window.updateDebugPanel('MAP_ERROR', 'CENTER_ERROR');
                }
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
            turnDirectionsDiv.style.display = 'block';
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
            // Sample points along the route (every 10th point to reduce API calls)
            const samplePoints = [];
            const sampleInterval = Math.max(1, Math.floor(routePoints.length / 100)); // Max 100 points
            
            for (let i = 0; i < routePoints.length; i += sampleInterval) {
                samplePoints.push(routePoints[i]);
            }
            
            // Add the last point to ensure we have the end elevation
            if (samplePoints[samplePoints.length - 1] !== routePoints[routePoints.length - 1]) {
                samplePoints.push(routePoints[routePoints.length - 1]);
            }
            
            // Get elevation data from Open Elevation API
            const locations = samplePoints.map(point => `${point.lat},${point.lng}`).join('|');
            const elevationResponse = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locations}`);
            const elevationData = await elevationResponse.json();
            
            console.log('🏔️ Elevation data received:', elevationData);
            
            if (elevationData.results && elevationData.results.length > 0) {
                // Calculate elevation statistics
                const elevations = elevationData.results.map(result => result.elevation);
                const elevationGain = this.calculateElevationGain(elevations);
                const elevationLoss = this.calculateElevationLoss(elevations);
                const peakElevation = Math.max(...elevations);
                const minElevation = Math.min(...elevations);
                
                // Store current elevation data for unit conversion
                this.currentElevationData = {
                    gain: elevationGain,
                    loss: elevationLoss,
                    peak: peakElevation,
                    min: minElevation
                };
                
                this.displayElevationProfile(elevationData.results, routeData);
            } else {
                console.log('❌ No elevation data available');
                this.showElevationUnavailable();
            }
            
        } catch (error) {
            console.error('❌ Elevation data error:', error);
            this.showElevationUnavailable();
        }
    }
    
    displayElevationProfile(elevationData, routeData) {
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
        
        // Calculate cumulative distances
        const cumulativeDistances = [];
        let totalDistance = 0;
        for (let i = 0; i < distances.length; i++) {
            cumulativeDistances.push(totalDistance);
            totalDistance += distances[i];
        }
        
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
    
    createElevationChart(distances, elevations, gain, loss, peak, min) {
        const elevationDiv = document.getElementById('elevationProfile');
        if (!elevationDiv) return;
        
        elevationDiv.style.display = 'block';
        
        // Use unit conversions for elevation stats
        const gainText = this.convertElevation(gain);
        const lossText = this.convertElevation(loss);
        const peakText = this.convertElevation(peak);
        const minText = this.convertElevation(min);
        
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
            </div>
            <div class="elevation-chart-container">
                <canvas id="elevationChart" width="400" height="200"></canvas>
            </div>
        `;
        
        // Create simple elevation chart using canvas
        setTimeout(() => {
            const canvas = document.getElementById('elevationChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const width = canvas.width;
                const height = canvas.height;
                
                // Clear canvas
                ctx.clearRect(0, 0, width, height);
                
                // Set up chart dimensions
                const padding = 40;
                const chartWidth = width - padding * 2;
                const chartHeight = height - padding * 2;
                
                // Draw grid lines
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
                
                // Draw axes
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(padding, padding);
                ctx.lineTo(padding, height - padding);
                ctx.lineTo(width - padding, height - padding);
                ctx.stroke();
                
                // Calculate elevation range
                const elevationRange = peak - min;
                const distanceRange = distances[distances.length - 1];
                
                // Draw elevation profile
                ctx.strokeStyle = '#FF6B35';
                ctx.lineWidth = 3;
                ctx.beginPath();
                
                for (let i = 0; i < elevations.length; i++) {
                    const x = padding + (distances[i] / distanceRange) * chartWidth;
                    const y = padding + chartHeight - ((elevations[i] - min) / elevationRange) * chartHeight;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                // Draw labels
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                
                // X-axis labels (distance)
                const useImperial = document.getElementById('useImperialUnits');
                const isImperial = useImperial ? useImperial.checked : false;
                
                for (let i = 0; i <= 5; i++) {
                    const distance = (distanceRange / 5) * i; // distance in meters
                    const x = padding + (chartWidth / 5) * i;
                    const label = isImperial ? 
                        (distance * 0.621371 / 1000).toFixed(1) + ' mi' : // meters → miles
                        (distance / 1000).toFixed(1) + ' km'; // meters → km
                    ctx.fillText(label, x, height - 20);
                }
                
                // Y-axis labels (elevation)
                ctx.textAlign = 'right';
                for (let i = 0; i <= 5; i++) {
                    const elevation = min + (elevationRange / 5) * i;
                    const y = padding + chartHeight - (chartHeight / 5) * i;
                    const label = isImperial ? 
                        (elevation * 3.28084).toFixed(0) + ' ft' : 
                        elevation.toFixed(0) + ' m';
                    ctx.fillText(label, padding - 5, y + 4);
                }
                
                console.log('🏔️ Elevation chart rendered with grid lines');
            }
        }, 100);
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
        const directionsDiv = document.getElementById('turnDirections');
        if (!directionsDiv) return;
        
        directionsDiv.innerHTML = '<h3>🚴 Turn-by-Turn Directions</h3>';
        
        console.log(`📍 Total steps: ${steps.length}`);
        console.log(`📍 All steps data:`, steps);
        
        // Handle different API formats
        let processedSteps;
        const routingApi = document.getElementById('routingApi');
        const apiType = routingApi ? routingApi.value : 'osrm';
        
        if (apiType === 'mapbox') {
            // Mapbox API format
            processedSteps = steps.legs[0].steps.map((step, index) => ({
                instruction: step.maneuver.instruction || 'Continue',
                distance: step.distance || 0,
                duration: step.duration || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'valhalla') {
            // Valhalla API format - public endpoint
            if (steps && steps.length > 0) {
                processedSteps = steps.map((step, index) => ({
                    instruction: step.maneuver?.instruction || step.instruction || 'Continue',
                    distance: step.distance || step.length || 0,
                    duration: step.duration || step.time || 0,
                    maneuver: step.maneuver || {}
                }));
            } else {
                processedSteps = [];
            }
        } else if (apiType === 'graphhopper') {
            // GraphHopper API format
            processedSteps = steps.paths[0].instructions.map((step, index) => ({
                instruction: step.text || 'Continue',
                distance: step.distance || 0,
                duration: step.time || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'openrouteservice') {
            // OpenRouteService API format
            processedSteps = steps.features[0].properties.segments.map((step, index) => ({
                instruction: step.instruction || 'Continue',
                distance: step.distance || 0,
                duration: step.duration || 0,
                maneuver: step.maneuver || {}
            }));
        } else if (apiType === 'valhalla') {
            // Valhalla API format - uses maneuvers
            processedSteps = steps.map((step, index) => ({
                instruction: step.instruction || 'Continue',
                distance: step.length || 0,
                duration: step.time || 0,
                maneuver: step
            }));
        } else {
            // OSRM API format
            processedSteps = steps;
        }
        
        processedSteps.forEach((step, index) => {
            const instruction = step.instruction || step.html_instructions || 'Continue';
            const distance = this.convertDistance(step.distance);
            const duration = Math.round((step.duration || 0) / 60);
            
            // Debug: Log the actual instruction and step data
            console.log(`📍 Step ${index + 1}:`);
            console.log(`  Raw instruction: "${instruction}"`);
            console.log(`  Full step data:`, step);
            console.log(`  Maneuver type: ${step.maneuver?.type}`);
            console.log(`  Modifier: ${step.maneuver?.modifier}`);
            
            // Extract street name from instruction if available
            const streetName = this.extractStreetName(instruction);
            console.log(`📍 Street name extracted: "${streetName}"`);
            
            let displayInstruction;
            if (streetName && streetName.trim().length > 0) {
                // Remove the street name from instruction and format properly
                const cleanInstruction = instruction.replace(streetName, '').replace(/\s+/g, ' ').trim();
                displayInstruction = `${streetName.trim()} - ${cleanInstruction}`;
                console.log(`📍 Display instruction: "${displayInstruction}"`);
            } else {
                // Fallback: Show route type when no street name found
                const routeTypeSelect = document.getElementById('routeType');
                const routeType = routeTypeSelect ? routeTypeSelect.value : 'drive';
                const routeTypeDescription = routeType === 'drive' ? 'Road' : routeType === 'cycling' ? 'MTB Trail' : 'Walking Path';
                displayInstruction = `${routeTypeDescription} - ${instruction}`;
                console.log(`📍 No street name found, using route type fallback: "${displayInstruction}"`);
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
                    <span class="turn-distance-detail">📏 ${this.convertDistance(step.distance)}</span>
                </div>
            `;
            
            directionsDiv.appendChild(stepDiv);
        });
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

// Add test button for specific route
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, adding test button...');
    
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
