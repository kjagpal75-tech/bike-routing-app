const fetch = require('node-fetch');

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
    const { profile, locations } = JSON.parse(event.body);
    
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
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
