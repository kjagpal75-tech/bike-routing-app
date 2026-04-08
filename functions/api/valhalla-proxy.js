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
        // Get the JSON data from the request body
        const requestBody = await context.request.text();
        const requestData = JSON.parse(requestBody);
        
        // Build the Valhalla request in the correct format
        const valhallaData = {
            locations: requestData.locations,
            costing: requestData.profile,
            directions_maneuvers: true,
            units: 'kilometers'
        };
        
        // Build the Valhalla API URL
        const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`;
        
        console.log('🛣️ Valhalla proxy request:', valhallaUrl);
        
        // Make the request to Valhalla API
        const response = await fetch(valhallaUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`Valhalla API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Return the response with CORS headers
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
        
    } catch (error) {
        console.error('Valhalla proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch from Valhalla API',
            details: error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
}
