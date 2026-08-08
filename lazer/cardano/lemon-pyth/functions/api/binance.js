export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const params = url.search;
  
  // 🔄 CAMBIO CLAVE: Usamos 'fapi.binance.com' (Futuros) en lugar de 'api.binance.com' (Spot)
  const binanceUrl = `https://fapi.binance.com/fapi/v1/klines${params}`;

  try {
    const response = await fetch(binanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });

    if (!response.ok) {
        return new Response(response.statusText, { status: response.status });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=60' 
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}