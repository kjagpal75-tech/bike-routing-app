// Copy of working app.js with Netlify proxy integration
// This version is specifically for Netlify deployment

class BikeRoutePlanner {
    constructor() {
        this.map = null;
        this.startMarker = null;
        this.endMarker = null;
        this.routeLine = null;
        this.waypoints = [];
        this.waypointMarkers = [];
        this.currentRouteData = null;
        this.elevationData = null;
        this.userLocationMarker = null;
        this.testRouteMarkers = [];
        this.valhallaRequestBody = null;
        this.valhallaApproaches = [];
        this.currentApproach = null;
        this.orsRequestBody = null;
        
        // Initialize the app
        this.init();
    }

    init() {
        console.log('🚴 Bike Route Planner v2.2.4 - Netlify Edition initializing...');
        
        // Initialize debug panel
        this.initDebugPanel();
        
        // Initialize map
        this.initMap();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize UI
        this.initUI();
        
        // Load saved settings
        this.loadSettings();
        
        console.log('✅ Bike Route Planner initialized successfully');
    }

    initDebugPanel() {
        // Create debug panel if it doesn't exist
        if (!document.getElementById('debugPanel')) {
            const debugPanel = document.createElement('div');
            debugPanel.id = 'debugPanel';
            debugPanel.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 200px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 11px;
                z-index: 1000;
                max-height: 400px;
                overflow-y: auto;
            `;
            document.body.appendChild(debugPanel);
        }
        
        // Initialize debug values
        window.updateDebugPanel = (key, value) => {
            const panel = document.getElementById('debugPanel');
            if (panel) {
                let content = panel.innerHTML;
                const regex = new RegExp(`${key}:.*<br>`);
                if (content.match(regex)) {
                    content = content.replace(regex, `${key}: ${value}<br>`);
                } else {
                    content += `${key}: ${value}<br>`;
                }
                panel.innerHTML = content;
            }
        };
        
        // Set initial debug values
        window.updateDebugPanel('VERSION', '2.2.4-Netlify');
        window.updateDebugPanel('STATUS', 'Initializing');
    }

    initMap() {
        console.log('🗺️ Initializing map...');
        
        // Initialize map with default view (California)
        this.map = L.map('map').setView([37.5, -121.9], 10);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Add click handler for setting waypoints
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
        
        console.log('✅ Map initialized');
        window.updateDebugPanel('MAP', 'Ready');
    }

    initEventListeners() {
        console.log('🎧 Initializing event listeners...');
        
        // Route type change
        const routeTypeSelect = document.getElementById('routeType');
        if (routeTypeSelect) {
            routeTypeSelect.addEventListener('change', () => {
                this.onRouteTypeChange();
            });
        }
        
        // Routing API change
        const routingApiSelect = document.getElementById('routingApi');
        if (routingApiSelect) {
            routingApiSelect.addEventListener('change', () => {
                this.onRoutingApiChange();
            });
        }
        
        // Generate route button
        const generateBtn = document.getElementById('generateRoute');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateRoute();
            });
        }
        
        // Clear route button
        const clearBtn = document.getElementById('clearRoute');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearRoute();
            });
        }
        
        // Use current location button
        const locationBtn = document.getElementById('useCurrentLocation');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => {
                this.useCurrentLocation();
            });
        }
        
        // Address search inputs
        const startAddress = document.getElementById('startAddress');
        const endAddress = document.getElementById('endAddress');
        
        if (startAddress) {
            startAddress.addEventListener('input', () => {
                this.onAddressInput('start');
            });
        }
        
        if (endAddress) {
            endAddress.addEventListener('input', () => {
                this.onAddressInput('end');
            });
        }
        
        // Settings inputs
        const useImperialUnits = document.getElementById('useImperialUnits');
        if (useImperialUnits) {
            useImperialUnits.addEventListener('change', () => {
                this.saveSettings();
                this.updateRouteDisplay();
            });
        }
        
        console.log('✅ Event listeners initialized');
    }

    initUI() {
        console.log('🎨 Initializing UI...');
        
        // Set default values
        const routeTypeSelect = document.getElementById('routeType');
        if (routeTypeSelect) {
            routeTypeSelect.value = 'drive'; // Default to road cycling
        }
        
        const routingApiSelect = document.getElementById('routingApi');
        if (routingApiSelect) {
            routingApiSelect.value = 'valhalla'; // Default to Valhalla
        }
        
        // Update UI based on current settings
        this.updateRouteTypeDescription();
        this.updateRoutingApiDescription();
        
        console.log('✅ UI initialized');
        window.updateDebugPanel('UI', 'Ready');
    }

    // [Continue copying all the methods from the original app.js...]
    // This is a placeholder - in a real implementation, you'd copy all methods
    
    async generateRoute() {
        console.log('🛣️ Generating route...');
        window.updateDebugPanel('STATUS', 'Generating route');
        
        try {
            // Get coordinates
            const coordinates = this.getCoordinates();
            if (coordinates.length < 2) {
                this.showNotification('Please set at least 2 points (start and end)', 'error');
                return;
            }
            
            // Get route type and API
            const routeTypeSelect = document.getElementById('routeType');
            const routeType = routeTypeSelect ? routeTypeSelect.value : 'drive';
            
            const routingApiSelect = document.getElementById('routingApi');
            const routingApi = routingApiSelect ? routingApiSelect.value : 'valhalla';
            
            console.log(`🛣️ Using route type: ${routeType}`);
            console.log(`🌐 Using routing API: ${routingApi}`);
            
            // Store Valhalla profile for use in response processing
            let valhallaProfile = null;
            
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
                    
                } else if (isLocalhost) {
                    // Use direct API for localhost (no CORS issues)
                    console.log('🏠 Using direct Valhalla API for localhost');
                    
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
                    
                    apiUrl = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`;
                    
                    console.log(`🛣️ Valhalla direct API URL: ${apiUrl}`);
                    console.log(`🛣️ Using profile: ${valhallaProfile}`);
                    
                    window.updateDebugPanel('APPROACH', 'Valhalla (direct API)');
                    window.updateDebugPanel('API', 'DIRECT');
                    window.updateDebugPanel('PROFILE', valhallaProfile);
                    
                } else {
                    // Fallback to OSRM for other hosting environments
                    console.log('⚠️ Fallback to OSRM - unsupported hosting environment');
                    apiUrl = `https://router.project-osrm.org/route/v1/${routeType}/${coordinates.map(c => `${c.lng},${c.lat}`).join(';')}?overview=full&geometries=geojson&steps=true`;
                    window.updateDebugPanel('APPROACH', 'OSRM fallback');
                    window.updateDebugPanel('API', 'OSRM');
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
                
                apiUrl = `https://graphhopper.com/api/1/route?point=${coordinates[0].lat},${coordinates[0].lng}&point=${coordinates[coordinates.length-1].lat},${coordinates[coordinates.length-1].lng}&vehicle=${vehicleProfile}&key=${graphhopperToken}&points_encoded=true&instructions=true&calc_points=true`;
            } else if (routingApi === 'openrouteservice') {
                // OpenRouteService API
                const orsKey = this.getOpenRouteServiceKey();
                if (!orsKey) {
                    this.showNotification('OpenRouteService key required. Please add your OpenRouteService key in the settings.', 'error');
                    return;
                }
                
                // Map route types to OpenRouteService profiles
                const orsProfile = routeType === 'drive' ? 'driving-car' : routeType === 'cycling' ? 'cycling-regular' : 'foot-walking';
                
                if (coordinates.length === 2) {
                    // Simple A-to-B routing - use GET method
                    const startLng = typeof coordinates[0].lng === 'number' ? coordinates[0].lng : parseFloat(coordinates[0].lng);
                    const startLat = typeof coordinates[0].lat === 'number' ? coordinates[0].lat : parseFloat(coordinates[0].lat);
                    const endLng = typeof coordinates[coordinates.length-1].lng === 'number' ? coordinates[coordinates.length-1].lng : parseFloat(coordinates[coordinates.length-1].lng);
                    const endLat = typeof coordinates[coordinates.length-1].lat === 'number' ? coordinates[coordinates.length-1].lat : parseFloat(coordinates[coordinates.length-1].lat);
                    console.log(`🌍 ORS start/end formatted: start=${startLng},${startLat}, end=${endLng},${endLat}`);
                    apiUrl = `https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${orsKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
                } else {
                    // Multiple waypoints - use POST method with coordinates in body
                    const coordsArray = coordinates.map(coord => {
                        const lng = typeof coord.lng === 'number' ? coord.lng : parseFloat(coord.lng);
                        const lat = typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat);
                        return [lng, lat];
                    });
                    
                    const requestBody = {
                        coordinates: coordsArray,
                        format: 'geojson',
                        instructions: true,
                        geometry: true
                    };
                    
                    apiUrl = `https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${orsKey}`;
                    this.orsRequestBody = JSON.stringify(requestBody);
                    console.log(`🌍 ORS POST request body:`, requestBody);
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
            
            let data = await response.json();
            console.log(`🌐 API Response:`, data);
            console.log(`🌐 Response keys:`, Object.keys(data));
            
            // Process response based on API
            let route = null;
            let routePoints = [];
            let routeFound = false;
            
            if (routingApi === 'mapbox') {
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
                if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
                    console.error('❌ No trip found in Valhalla response');
                    this.showNotification('No route found with Valhalla API', 'error');
                    routeFound = false;
                } else {
                    // Valhalla API returns trip structure with legs
                    const trip = data.trip;
                    
                    // Create a consistent route structure for the app
                    route = {
                        legs: trip.legs,
                        distance: trip.summary.length * 1000, // Convert km to meters
                        duration: trip.summary.time, // Time is already in seconds
                        geometry: {
                            coordinates: trip.shape ? this.decodePolyline(trip.shape) : []
                        }
                    };
                    
                    // Decode Valhalla polyline to coordinates
                    // Shape data is in trip.legs[0].shape, not trip.shape
                    const shapeData = trip.legs && trip.legs[0] ? trip.legs[0].shape : null;
                    if (shapeData) {
                        console.log('🛣️ Decoding Valhalla polyline from trip.legs[0].shape:', shapeData.substring(0, 100) + '...');
                        routePoints = this.decodePolyline(shapeData);
                        console.log('🛣️ Decoded routePoints:', routePoints.length, 'points');
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
                    console.log('🛣️ OSRM route data extracted:', route);
                }
            } else if (routingApi === 'graphhopper') {
                // GraphHopper format
                if (!data.paths || data.paths.length === 0) {
                    console.error('❌ No paths found in GraphHopper response');
                    this.showNotification('No route found with GraphHopper API', 'error');
                    routeFound = false;
                } else {
                    route = data.paths[0];
                    if (route.points) {
                        // GraphHopper returns encoded polyline in points field
                        routePoints = this.decodePolyline(route.points);
                    } else {
                        routePoints = [];
                    }
                    routeFound = true;
                    console.log('🚴 GraphHopper route data extracted:', route);
                }
            } else if (routingApi === 'openrouteservice') {
                // OpenRouteService format
                if (!data.features || data.features.length === 0) {
                    console.error('❌ No features found in OpenRouteService response');
                    this.showNotification('No route found with OpenRouteService API', 'error');
                    routeFound = false;
                } else {
                    route = data.features[0];
                    if (route.geometry && route.geometry.coordinates) {
                        routePoints = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
                    } else {
                        routePoints = [];
                    }
                    routeFound = true;
                    console.log('🌍 OpenRouteService route data extracted:', route);
                }
            }
            
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
                
                // Display route on map
                this.displayRoute(routePoints);
                
                // Display route information
                this.displayRouteInfo(route);
                
                // Generate elevation data
                this.generateElevationData(routePoints);
                
                // Display turn-by-turn directions
                this.displayDirections(route);
                
                console.log('✅ Route generated and displayed successfully');
                window.updateDebugPanel('STATUS', 'Route displayed');
                this.showNotification('Route generated successfully!', 'success');
                
            } else {
                console.error('❌ No route found');
                window.updateDebugPanel('STATUS', 'No route found');
                this.showNotification('No route found. Please try different points or route type.', 'error');
            }
            
        } catch (error) {
            console.error('❌ Route generation error:', error);
            window.updateDebugPanel('STATUS', 'Error');
            window.updateDebugPanel('ERROR', error.message);
            this.showNotification(`Route generation error: ${error.message}`, 'error');
        }
    }

    // Add all other methods from the original app.js...
    // [This is a simplified version - you'd copy all methods]
    
    decodePolyline(encoded) {
        // Critical fix: divide by 1e6, not 1e5
        if (!encoded || encoded.length === 0) return [];
        
        let points = [];
        let index = 0;
        let lat = 0;
        let lng = 0;
        
        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            shift = 0;
            result = 0;
            
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            points.push([lat / 1e6, lng / 1e6]); // Critical: 1e6 not 1e5
        }
        
        return points.map(coord => L.latLng(coord[0], coord[1]));
    }

    displayRoute(routePoints) {
        // Clear existing route
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }
        
        // Create new route line
        this.routeLine = L.polyline(routePoints, {
            color: 'blue',
            weight: 4,
            opacity: 0.7
        }).addTo(this.map);
        
        // Fit map to route
        if (routePoints.length > 0) {
            this.map.fitBounds(this.routeLine.getBounds(), {
                padding: [50, 50]
            });
        }
        
        console.log('✅ Route displayed on map');
        window.updateDebugPanel('MAP_DISPLAY', 'SUCCESS');
    }

    displayRouteInfo(route) {
        // Calculate distance, duration, speed
        const distance = route.distance || 0;
        const duration = route.duration || 0;
        
        const speedMs = distance / duration;
        const speedKmh = speedMs * 3.6;
        const speed = this.convertSpeed(speedKmh);
        
        const distanceText = this.convertDistance(distance);
        const durationText = Math.round(duration / 60) + ' min';
        
        // Update route info display
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            routeInfo.innerHTML = `
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
                    <span class="stat-text">Avg Speed: ${speed}</span>
                </div>
            `;
        }
        
        console.log('✅ Route info displayed');
    }

    convertDistance(meters) {
        const useImperial = document.getElementById('useImperialUnits');
        const isImperial = useImperial ? useImperial.checked : false;
        
        if (isImperial) {
            const miles = meters * 0.000621371;
            return miles.toFixed(2) + ' mi';
        } else {
            const km = meters / 1000;
            return km.toFixed(2) + ' km';
        }
    }

    convertSpeed(kmh) {
        const useImperial = document.getElementById('useImperialUnits');
        const isImperial = useImperial ? useImperial.checked : false;
        
        if (isImperial) {
            const mph = kmh * 0.621371;
            return mph.toFixed(1) + ' mph';
        } else {
            return kmh.toFixed(1) + ' km/h';
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification implementation
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 4px;
                font-weight: bold;
                z-index: 10000;
                max-width: 400px;
                text-align: center;
            `;
            document.body.appendChild(notification);
        }
        
        // Set message and style based on type
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
        }
        
        // Show notification
        notification.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Placeholder methods - you'd copy all the remaining methods from app.js
    getCoordinates() { return []; }
    getMapboxToken() { return null; }
    getGraphhopperToken() { return null; }
    getOpenRouteServiceKey() { return null; }
    loadSettings() {}
    saveSettings() {}
    updateRouteDisplay() {}
    updateRouteTypeDescription() {}
    updateRoutingApiDescription() {}
    onRouteTypeChange() {}
    onRoutingApiChange() {}
    onAddressInput() {}
    handleMapClick() {}
    useCurrentLocation() {}
    clearRoute() {}
    generateElevationData() {}
    displayDirections() {}
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚴 Bike Route Planner v2.2.4-Netlify - DOM loaded, initializing...');
    window.bikeRoutePlanner = new BikeRoutePlanner();
    console.log('✅ Bike Route Planner v2.2.4-Netlify initialized');
});
