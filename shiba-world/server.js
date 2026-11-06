// Shiba World server: serves the game (public/) and relays multiplayer over WebSocket (/ws).
// Zero dependencies - just Node 18+.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PUB=path.join(__dirname,'public'),PORT=process.env.PORT||3000,MAXR=8;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};

const server=http.createServer((req,res)=>{
  let u;try{u=decodeURIComponent((req.url||'/').split('?')[0])}catch(e){res.writeHead(400).end();return}
  if(u==='/health'){res.writeHead(200).end('ok');return}
  if(u==='/')u='/index.html';
  const f=path.normalize(path.join(PUB,u));
  if(!f.startsWith(PUB)){res.writeHead(403).end();return}
  fs.readFile(f,(e,b)=>{
    if(e){res.writeHead(404).end('not found');return}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':path.basename(f)==='sw.js'?'no-cache':'public,max-age=300'});
    res.end(b)})});

// ---- minimal WebSocket (RFC 6455) ----
const clients=new Set(),rooms=new Map();
function frame(op,p){const n=p.length;let h;if(n<126)h=Buffer.from([128|op,n]);else{h=Buffer.alloc(4);h[0]=128|op;h[1]=126;h.writeUInt16BE(n,2)}return Buffer.concat([h,p])}
const sendJ=(c,o)=>{if(!c.sock.destroyed)try{c.sock.write(frame(1,Buffer.from(JSON.stringify(o))))}catch(e){}};
function leave(c){
  clients.delete(c);
  if(!c.room)return;
  const set=rooms.get(c.room);
  if(set&&set.get(c.id)===c){set.delete(c.id);set.forEach(x=>sendJ(x,{t:'l',id:c.id}));if(!set.size)rooms.delete(c.room)}
  c.room=null}
const num=v=>typeof v==='number'&&isFinite(v)?v:null;
const clean=d=>({x:num(d.x),z:num(d.z),h:num(d.h),spd:num(d.spd),y:num(d.y),j:d.j?1:0});
function onMsg(c,s){
  let m;try{m=JSON.parse(s)}catch(e){return}
  if(m.t==='j'&&!c.room){
    const room=String(m.room||'lobby'),id=String(m.id||'').replace(/[^a-z0-9]/gi,'').slice(0,16);
    if(!/^(lobby|s-[a-z0-9]{4,8})$/.test(room)||id.length<4){c.sock.destroy();return}
    let set=rooms.get(room);if(!set)rooms.set(room,set=new Map());
    const old=set.get(id);if(old){leave(old);old.sock.destroy();set=rooms.get(room)||rooms.set(room,new Map()).get(room)}
    if(set.size>=MAXR){sendJ(c,{t:'full'});c.sock.end();return}
    c.room=room;c.id=id;
    const snap={};set.forEach((x,k)=>snap[k]=x.d);
    sendJ(c,{t:'snap',s:snap});set.set(id,c)}
  else if(m.t==='p'&&c.room&&m.d&&typeof m.d==='object'){
    c.d=clean(m.d);const set=rooms.get(c.room);
    if(set)set.forEach(x=>{if(x!==c)sendJ(x,{t:'p',id:c.id,d:c.d})})}}
function parse(c){
  for(;;){
    const b=c.buf;if(b.length<2)return;
    const op=b[0]&15,fin=b[0]&128,masked=b[1]&128;let len=b[1]&127,off=2;
    if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}else if(len===127){c.sock.destroy();return}
    if(!masked){c.sock.destroy();return}
    if(b.length<off+4+len)return;
    const mask=b.subarray(off,off+4),pl=Buffer.from(b.subarray(off+4,off+4+len));
    for(let i=0;i<len;i++)pl[i]^=mask[i&3];
    c.buf=b.subarray(off+4+len);c.alive=true;
    if(++c.n>80){c.sock.destroy();return}
    if(!fin||op===0){c.sock.destroy();return}
    if(op===8){try{c.sock.end(frame(8,Buffer.alloc(0)))}catch(e){}return}
    if(op===9){c.sock.write(frame(10,pl));continue}
    if(op===10)continue;
    if(op===1)onMsg(c,pl.toString('utf8'))}}
server.on('upgrade',(req,sock)=>{
  const key=req.headers['sec-websocket-key'];
  if((req.url||'').split('?')[0]!=='/ws'||String(req.headers.upgrade).toLowerCase()!=='websocket'||!key){sock.destroy();return}
  const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  sock.setNoDelay(true);
  const c={sock,id:null,room:null,d:{},alive:true,buf:Buffer.alloc(0),n:0};clients.add(c);
  sock.on('data',ch=>{c.buf=Buffer.concat([c.buf,ch]);if(c.buf.length>8192){sock.destroy();return}parse(c)});
  sock.on('close',()=>leave(c));sock.on('error',()=>sock.destroy())});
setInterval(()=>{for(const c of clients){c.n=0;if(!c.alive){c.sock.destroy();continue}c.alive=false;try{c.sock.write(frame(9,Buffer.alloc(0)))}catch(e){}}},25000);
if(require.main===module)server.listen(PORT,()=>console.log('Shiba World on :'+PORT));
module.exports=server;
