const fetch = require('node-fetch'); // Next.js/Node 18+ has fetch natively, but user has Node?
// Actually let's just use http module to be safe since it's a localhost connection

const http = require('http');

// First login to get a token
const loginData = JSON.stringify({ username: 'john.doe', password: 'password123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const { token } = JSON.parse(data);
    if (!token) { console.error('No token:', data); return; }
    
    // Now get tickets to find one to update
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/tickets',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let tdata = '';
      res.on('data', chunk => tdata += chunk);
      res.on('end', () => {
        const tickets = JSON.parse(tdata);
        if (tickets.length === 0) { console.log('No tickets'); return; }
        
        const tick = tickets[0];
        const newStatus = tick.status === 'Open' ? 'In Progress' : 'Open';
        console.log(`Updating ticket ${tick.id} from ${tick.status} to ${newStatus}`);
        
        const updateData = JSON.stringify({ status: newStatus });
        const updateReq = http.request({
          hostname: 'localhost',
          port: 3000,
          path: `/api/tickets/${tick.id}`,
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': updateData.length
          }
        }, (ures) => {
          let udata = '';
          ures.on('data', chunk => udata += chunk);
          ures.on('end', () => {
            console.log('Update status:', ures.statusCode);
            console.log('Update response:', udata);
          });
        });
        updateReq.write(updateData);
        updateReq.end();
      });
    });
  });
});
req.write(loginData);
req.end();
