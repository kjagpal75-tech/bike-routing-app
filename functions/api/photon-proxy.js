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
        const query = url.searchParams.get('q');
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');
        const bbox = url.searchParams.get('bbox');
        const limit = url.searchParams.get('limit') || '10';

        if (!query) {
            return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // Build Photon API URL
        let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}`;
        
        // Add location bias if provided
        if (lat && lon) {
            photonUrl += `&lat=${lat}&lon=${lon}`;
        }
        
        // Add bounding box if provided
        if (bbox) {
            photonUrl += `&bbox=${bbox}`;
        }

        console.log('🔍 Photon API request:', photonUrl);

        // Forward request to Photon API
        const response = await fetch(photonUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Bike-Route-Planner/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`Photon API error: ${response.status}`);
        }

        const data = await response.json();

        // Return the POI data with CORS headers
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });

    } catch (error) {
        console.error('Photon proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch POI data',
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
