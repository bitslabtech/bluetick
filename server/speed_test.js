const http = require('http');

const testEndpoint = (path) => {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.get(`http://localhost:5000${path}`, (res) => {
            const time = Date.now() - start;
            res.on('data', () => {});
            res.on('end', () => resolve({ path, status: res.statusCode, timeMs: time }));
        });
        req.on('error', (err) => resolve({ path, error: err.message, timeMs: Date.now() - start }));
    });
};

async function run() {
    console.log("Testing backend response times...");
    // Since we don't have a token, we expect 401 Unauthorized, but the response time mapping the route is what matters.
    const res1 = await testEndpoint('/api/auth/me');
    console.log("Auth Check:", res1);
    
    // Test the IPv6 delay assumption: 127.0.0.1 vs localhost
    const start2 = Date.now();
    const req2 = http.get('http://127.0.0.1:5000/api/auth/me', (res2) => {
        const time2 = Date.now() - start2;
        console.log("127.0.0.1 Auth Check:", { status: res2.statusCode, timeMs: time2 });
    });
}
run();
