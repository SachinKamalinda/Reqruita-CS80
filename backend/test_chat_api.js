// test_chat_api.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chat/test-meeting',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Response is JSON:', Array.isArray(json));
      console.log('Body:', body);
      if (res.statusCode === 200 && Array.isArray(json)) {
        console.log('✅ Chat API test passed!');
      } else {
        console.log('❌ Chat API test failed!');
      }
    } catch (e) {
      console.log('❌ Response is not valid JSON!');
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
