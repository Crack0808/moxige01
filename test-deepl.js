const https = require('https');

const key = 'e82bc50c-c51f-449e-910e-d75698b517e8:fx';
const text = 'Hello';
const host = 'api-free.deepl.com';
const payload = 'text=' + encodeURIComponent(text) + '&target_lang=ZH';

const opt = {
    method: 'POST',
    hostname: host,
    port: 443,
    path: '/v2/translate',
    headers: {
        'Authorization': 'DeepL-Auth-Key ' + key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
    }
};

console.log('Sending request to', host);

const req = https.request(opt, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
});

req.on('error', e => {
    console.error('Error:', e);
});

req.write(payload);
req.end();
