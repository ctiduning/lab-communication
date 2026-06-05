const https = require('https');

const data = JSON.stringify({
  email: 'admin@cti-cert.com',
  password: 'Admin@2026',
  data: {
    name: '管理员',
    role: 'admin',
    username: 'admin',
    employee_id: 'ADMIN001'
  }
});

const options = {
  hostname: 'qgoqhjwekairknkuqisi.supabase.co',
  path: '/auth/v1/signup',
  method: 'POST',
  headers: {
    'apikey': 'sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.user && parsed.user.id) {
        console.log('\n--- 管理员账号创建成功 ---');
        console.log('邮箱: admin@cti-cert.com');
        console.log('密码: Admin@2026');
        console.log('用户ID:', parsed.user.id);
        
        // 现在更新 profiles 表设置 role = admin
        const patchData = JSON.stringify({ role: 'admin' });
        const patchOptions = {
          hostname: 'qgoqhjwekairknkuqisi.supabase.co',
          path: '/rest/v1/profiles?email=eq.admin@cti-cert.com',
          method: 'PATCH',
          headers: {
            'apikey': 'sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'Content-Length': Buffer.byteLength(patchData)
          }
        };
        
        const patchReq = https.request(patchOptions, (patchRes) => {
          let patchBody = '';
          patchRes.on('data', (chunk) => patchBody += chunk);
          patchRes.on('end', () => {
            console.log('\n--- 更新角色为 admin ---');
            console.log('Status:', patchRes.statusCode);
            console.log(patchBody);
          });
        });
        patchReq.on('error', (e) => console.error('Patch error:', e.message));
        patchReq.write(patchData);
        patchReq.end();
      }
    } catch(e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
