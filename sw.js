const CACHE='wgym-1790881505';
const FILES=["./", "app.css", "app.js", "data.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "img/Ab_Crunch_Machine_0.jpg", "img/Ab_Crunch_Machine_1.jpg", "img/Barbell_Hip_Thrust_0.jpg", "img/Barbell_Hip_Thrust_1.jpg", "img/Butterfly_0.jpg", "img/Butterfly_1.jpg", "img/Cable_One_Arm_Tricep_Extension_0.jpg", "img/Cable_One_Arm_Tricep_Extension_1.jpg", "img/Cable_Seated_Lateral_Raise_0.jpg", "img/Cable_Seated_Lateral_Raise_1.jpg", "img/Calf_Press_On_The_Leg_Press_Machine_0.jpg", "img/Calf_Press_On_The_Leg_Press_Machine_1.jpg", "img/Hyperextensions_Back_Extensions_0.jpg", "img/Hyperextensions_Back_Extensions_1.jpg", "img/Leg_Extensions_0.jpg", "img/Leg_Extensions_1.jpg", "img/Leverage_Shoulder_Press_0.jpg", "img/Leverage_Shoulder_Press_1.jpg", "img/Lying_Leg_Curls_0.jpg", "img/Lying_Leg_Curls_1.jpg", "img/Lying_T-Bar_Row_0.jpg", "img/Lying_T-Bar_Row_1.jpg", "img/Machine_Triceps_Extension_0.jpg", "img/Machine_Triceps_Extension_1.jpg", "img/One_Arm_Dumbbell_Preacher_Curl_0.jpg", "img/One_Arm_Dumbbell_Preacher_Curl_1.jpg", "img/Seated_Leg_Curl_0.jpg", "img/Seated_Leg_Curl_1.jpg", "img/Standing_Calf_Raises_0.jpg", "img/Standing_Calf_Raises_1.jpg", "img/Thigh_Abductor_0.jpg", "img/Thigh_Abductor_1.jpg", "img/Thigh_Adductor_0.jpg", "img/Thigh_Adductor_1.jpg", "img/Wide-Grip_Lat_Pulldown_0.jpg", "img/Wide-Grip_Lat_Pulldown_1.jpg", "index.html", "manifest.webmanifest"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
