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
        // Get the locations query parameter
        const url = new URL(context.request.url);
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

        // Forward request to Open Elevation API
        const apiUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Bike-Route-Planner/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`Open Elevation API error: ${response.status}`);
        }

        const data = await response.json();

        // Return the elevation data with CORS headers
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error('Elevation proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch elevation data',
            message: error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
