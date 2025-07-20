const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const API_KEY = envVars.RECRAFT_API_KEY;
const API_URL = 'external.api.recraft.ai';
const API_PATH = '/v1/images/generations';

if (!API_KEY) {
  console.error('Error: RECRAFT_API_KEY not found in .env file');
  process.exit(1);
}

const postData = JSON.stringify({
  prompt: 'Two men are fishing above a data center, they are fishing for data.',
  style: 'digital_illustration',
  model: 'recraftv3',
  width: 1024,
  height: 1024,
  n: 1,
  response_format: 'url'
});

const options = {
  hostname: API_URL,
  path: API_PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  timeout: 30000 // 30 second timeout
};

console.log('Sending request to Recraft.ai API...');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
