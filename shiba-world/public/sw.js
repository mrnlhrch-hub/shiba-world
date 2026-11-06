const V='shiba-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['/','/manifest.webmanifest','/icon-192.png','/icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.pathname==='/ws'||u.pathname==='/health')return;
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(r);
    const net=fetch(r).then(res=>{if((res.ok||res.type==='opaque')&&(u.origin===location.origin||u.hostname==='cdnjs.cloudflare.com'))c.put(r,res.clone());return res}).catch(()=>hit);
    return hit||net}))});
