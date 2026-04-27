const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { public_ids } = JSON.parse(event.body);
    if (!public_ids || !Array.isArray(public_ids) || !public_ids.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'public_ids array required' }) };
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    let ok = 0, failed = 0;

    for (const publicId of public_ids) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signStr).digest('hex');

        const params = new URLSearchParams({
          public_id: publicId,
          timestamp: timestamp.toString(),
          api_key: apiKey,
          signature,
        });

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json();
        if (data.result === 'ok') ok++;
        else failed++;
      } catch (err) {
        failed++;
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok, failed }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
