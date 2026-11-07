const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const CHARACTER_DISPLAY_SCALE=.30;


export function targetVelocity(g,renderScale=1){
 const magnitude=clamp((Math.abs(g)-.12)/(9.81-.12),0,1);
 
 
 const steep=clamp((magnitude-.5)/.5,0,1),boost=180*steep*steep*(3-2*steep);
 return Math.sign(g)*(360*Math.pow(magnitude,.85)+boost)/renderScale;
}
export function advanceVelocity(body,gx,gy,dt,renderScale=1){
 const ease=1-Math.exp(-Math.max(0,dt)/170);
 body.vx+=(targetVelocity(-gx,renderScale)-body.vx)*ease;
 body.vy+=(targetVelocity(gy,renderScale)-body.vy)*ease;
 return Math.hypot(body.vx,body.vy);
}


export function advanceRollingMotion(body,gx,gy,dt,renderScale=1){
 const ms=Math.max(0,dt),ease=-Math.expm1(-ms/170);
 const tx=targetVelocity(-gx,renderScale),ty=targetVelocity(gy,renderScale);
 const dx=body.vx-tx,dy=body.vy-ty;
 body.x+=(tx*ms+dx*170*ease)/1000;
 body.y+=(ty*ms+dy*170*ease)/1000;
 body.vx+=-dx*ease;body.vy+=-dy*ease;
 return Math.hypot(body.vx,body.vy);
}
export function rollRate(speed,renderScale=1){return clamp(speed*renderScale/110,0,4);}
export function inwardGravity(mode,gx,gy){
 return mode==='wall-left'?gx:mode==='wall-right'?-gx:mode==='wall-top'?-gy:gy;
}
export function makeWallClock(now){return {elapsed:0,at:now,attached:true};}
export function advanceWallClock(clock,now,inward){
 const dt=Math.max(0,Math.min(40,now-clock.at));clock.at=now;
 if(clock.attached){
  if(inward>.16)return 0;
  clock.attached=false;
 }
 clock.elapsed+=dt;return clock.elapsed;
}
