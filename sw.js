const CACHE='english-quest-v9-11-2';
const ASSETS=['./','./index.html','./app.js?v=9.11.2','./firebase-config.js','./words.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./heroine.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('english-quest-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Update metadata is always fetched from the network; never serve a stale cached version.
 if(url.pathname.endsWith('/version.json')){event.respondWith(fetch(request,{cache:'no-store'}));return}
 if(request.mode==='navigate'){
   event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)))}return response}).catch(()=>caches.match('./index.html')));
   return;
 }
 // App code must be network-first so an older service worker cannot pin an older layout.
 if(url.pathname.endsWith('/app.js')){
   event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)))}return response}).catch(()=>caches.match(request)));
   return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
