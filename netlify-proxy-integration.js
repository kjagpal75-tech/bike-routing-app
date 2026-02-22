// Add this to your app.js file to support Netlify proxy hosting

// In the Valhalla API section, replace the direct API call with:
if (routingApi === 'valhalla') {
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
}

// Then in the fetch section, modify to handle POST for proxy:
const response = await fetch(apiUrl, {
    method: this.valhallaRequestBody ? 'POST' : 'GET',
    headers: this.valhallaRequestBody ? {
        'Content-Type': 'application/json'
    } : {},
    body: this.valhallaRequestBody || null,
    mode: 'cors'
});

// Clear request body after use
this.valhallaRequestBody = null;
