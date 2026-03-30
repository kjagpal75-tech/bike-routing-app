const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { locations } = JSON.parse(event.body);
    
    if (!locations) {
      return { statusCode: 400, body: 'Missing locations parameter' };
    }

    // Forward request to Open Elevation API
    const apiUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
    
    console.log('Elevation proxy forwarding to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BikeRoutePlanner/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Elevation API error:', response.status, response.statusText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Elevation API error', status: response.status })
      };
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Elevation proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
