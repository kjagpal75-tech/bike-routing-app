export async function onRequest(context) {
    // Handle CORS preflight requests
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    try {
        const url = new URL(context.request.url);
        const service = url.searchParams.get('service') || 'elevation'; // Default to elevation
        
        if (service === 'geocode') {
            // Handle Nominatim geocoding requests
            const query = url.searchParams.get('q');
            
            if (!query) {
                return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            
            console.log(`Proxy: Geocoding query: ${query}`);
            
            // Forward to Nominatim API
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
            
            const response = await fetch(nominatimUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Bike-Route-Planner/1.0',
                },
            });
            
            console.log(`Proxy: Nominatim response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Proxy: Nominatim API error: ${response.status} - ${errorText}`);
                throw new Error(`Nominatim API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log(`Proxy: Got ${data.length} geocoding results`);
            
            // Return the geocoding data with CORS headers
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                },
            });
        } else {
            // Handle elevation requests (Open Elevation API)
            const locations = url.searchParams.get('locations');
            
            if (!locations) {
                return new Response(JSON.stringify({ error: 'Missing locations parameter' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }

            // Count locations to check for API limits
            const locationCount = locations.split('|').length;
            console.log(`Proxy: Processing ${locationCount} locations`);
            
            if (locationCount > 200) {
                console.error(`Proxy: Too many locations (${locationCount}), Open Elevation API limit is ~200`);
                return new Response(JSON.stringify({ 
                    error: 'Too many locations',
                    message: `Request has ${locationCount} locations, but Open Elevation API limit is ~200. Please reduce sampling interval or use shorter routes.`,
                    locationCount: locationCount
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }

            // Forward request to Open Elevation API
            const apiUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Bike-Route-Planner/1.0',
                },
            });

            console.log(`Proxy: Open Elevation API response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Proxy: Open Elevation API error: ${response.status} - ${errorText}`);
                throw new Error(`Open Elevation API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`Proxy: Got ${data.results?.length || 0} elevation results`);

            // Return the elevation data with CORS headers
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                },
            });
        }

    } catch (error) {
        console.error('Proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch data',
            message: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
