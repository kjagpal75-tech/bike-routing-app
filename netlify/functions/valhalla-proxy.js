exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Received request body:', event.body);
    
    const { profile, locations } = JSON.parse(event.body);
    
    console.log('Parsed request - profile:', profile, 'locations:', locations);
    
    // Validate input
    if (!profile || !locations || !Array.isArray(locations) || locations.length < 2) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid request: profile and locations (min 2) required' })
      };
    }
    
    // Build Valhalla request
    const valhallaData = {
      locations: locations,
      costing: profile,
      directions_maneuvers: true,
      geometry: true,
      units: 'kilometers'
    };
    
    const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(valhallaData))}`;
    
    console.log('Proxying to Valhalla:', valhallaUrl);
    
    const response = await fetch(valhallaUrl);
    
    if (!response.ok) {
      throw new Error(`Valhalla API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('Valhalla response received, keys:', Object.keys(data));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Proxy error details:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
