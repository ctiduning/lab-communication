// 用 service_role key 绕过注册限制，创建/升级管理员账号
// 需要先在 Supabase 后台获取 service_role key
// Project Settings → API → service_role key (secret)

const SUPABASE_URL = 'https://qgoqhjwekairknkuqisi.supabase.co';
const ANON_KEY = 'sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni';

// 先尝试登录 duning@cti-cert.com，如果账号存在就升级为 admin
// 如果不存在，用 admin API 创建

const https = require('https');

// 查询 profiles 表里是否有 duning@cti-cert.com
function getProfile() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'qgoqhjwekairknkuqisi.supabase.co',
      path: '/rest/v1/profiles?email=eq.duning@cti-cert.com',
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

getProfile().then(profiles => {
  console.log('查询结果:', JSON.stringify(profiles, null, 2));
  if (profiles && profiles.length > 0) {
    console.log('账号已存在，ID:', profiles[0].id);
    console.log('请去 Supabase SQL Editor 执行:');
    console.log(`UPDATE profiles SET role = 'admin' WHERE email = 'duning@cti-cert.com';`);
  } else {
    console.log('账号不存在，需要先在 Supabase Auth 里创建用户');
    console.log('请去 Supabase 后台 Authentication → Users → Add User');
    console.log('Email: duning@cti-cert.com');
    console.log('Password: 你自己设一个');
    console.log('然后执行 SQL: UPDATE profiles SET role = "admin" WHERE email = "duning@cti-cert.com";');
  }
}).catch(console.error);
