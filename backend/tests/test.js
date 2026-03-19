const http = require("http");

console.log("Starting backend tests...");

const testEndpoint = (name, port, path, expectedStatus) => {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}${path}`, (res) => {
            if (res.statusCode === expectedStatus || expectedStatus === 'any') {
                console.log(`✅ PASS: ${name} (Status: ${res.statusCode})`);
                resolve();
            } else {
                console.error(`❌ FAIL: ${name} (Expected ${expectedStatus}, got ${res.statusCode})`);
                resolve(); // resolve to continue other tests
            }
        }).on("error", (err) => {
            console.error(`❌ FAIL: ${name} (Error: ${err.message})`);
            resolve();
        });
    });
};

async function runTests() {
    console.log("-----------------------------------------");
    console.log("Testing Desktop App Backend (Port 3001)...");
    await testEndpoint("Get Participants API", 3001, "/api/participants", 200);
    await testEndpoint("Get Chat API", 3001, "/api/chat/dummy_interview", 200);
    
    console.log("-----------------------------------------");
    console.log("Testing Dashboard App Backend (Port 3003)...");
    await testEndpoint("Me API (Should be 401 Unauthorized)", 3003, "/api/me", 401);
    await testEndpoint("Users Dashboard API (Should be 401)", 3003, "/api/dashboard/users", 401);
    
    console.log("-----------------------------------------");
    console.log("All tests finished!");
    process.exit(0);
}

runTests();
