require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ACCESS_ID = process.env.ACCESS_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const TARGET_HOST = 'api.coinex.com';

if (!ACCESS_ID || !SECRET_KEY) {
    console.warn('⚠️  Warning: ACCESS_ID or SECRET_KEY not found in .env file!');
}

// Utility to sign requests on the server
function signRequest(method, path, body = '') {
    const timestamp = Date.now();
    const preparedStr = method + path + body + timestamp;
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(preparedStr)
        .digest('hex');
    
    return { timestamp, signature };
}

const server = http.createServer((req, res) => {
    // Basic CORS for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 2. Proxy API Requests
    // Frontend will call /proxy/v2/...
    if (req.url.startsWith('/proxy/')) {
        const targetPath = req.url.replace('/proxy/', '/');
        
        // console.log(`[Proxy] ${req.method} ${targetPath}`);

        // Sign the request on the server
        const { timestamp, signature } = signRequest(req.method, targetPath);

        const options = {
            hostname: TARGET_HOST,
            path: targetPath,
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'X-COINEX-KEY': ACCESS_ID,
                'X-COINEX-SIGN': signature,
                'X-COINEX-TIMESTAMP': timestamp.toString(),
                'Host': TARGET_HOST,
                'User-Agent': 'CoinEx-Dashboard-Proxy/1.0'
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            // console.log(`[Proxy] Response: ${proxyRes.statusCode}`);
            const resHeaders = { ...proxyRes.headers };
            // CORS headers are set globally now, no need to override here
            // resHeaders['Access-Control-Allow-Origin'] = '*';
            // resHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
            // resHeaders['Access-Control-Allow-Headers'] = '*';

            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => {
            console.log(`[Proxy] ${req.method} ${targetPath}`);
            console.error(e);
            res.writeHead(500);
            res.end('Proxy Error');
        });

        req.pipe(proxyReq);
        return;
    }

    // Serve static files (index.html, etc)
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`
----------------------------------------
🚀 CoinEx Dashboard Server Running!
🔗 URL: http://localhost:${PORT}/
----------------------------------------
    `);
});
