import {CheekDragModel} from './m0.mjs';
import {drawWholePose,drawPearl} from './m1.mjs';
import {createSceneRenderer} from './m4.mjs';
import {locateFrame} from './m3.mjs';
import {wallPose} from './m7.mjs';
import {wallRimOpacity} from './m5.mjs';
import {CHARACTER_DISPLAY_SCALE,inwardGravity,makeWallClock,advanceWallClock} from './m2.mjs';
import {Clock,physicalPoint,opaqueRectangles,rotateVector} from './m8.mjs';
import {PoseHitCache,drawingGuard} from './m10.mjs';
import {advanceRollingFrame,rollingPhaseIncrement} from './m11.mjs';
const clock=new Clock();let epoch=0;
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlay=typeof location!=='undefined'&&new URL(location.href).searchParams.has('overlay');
if(overlay){document.body.classList.add('overlay');document.documentElement.style.background='transparent';}
let lastBounds=-Infinity,boundsSent=0;const poseHits=new PoseHitCache();
let gravity={x:0,y:0,z:9.81,at:0},zero={x:0,y:0},samples=0,basis=0;
window.receiveGravity=(x,y,z,at)=>{gravity={x,y,z,at};samples++;};
const data=await (await fetch('state.json')).json(),images={};
await Promise.all(Object.entries(data.sheets).map(async([key,s])=>{const image=new Image();image.src=s.file;await image.decode();images[key]=image;}));
const canvas=$('pet'),ctx=canvas.getContext('2d'),renderer=createSceneRenderer(data,images);
const m=new CheekDragModel(data),p={x:230,y:220,vx:0,vy:0};let wall=null,last=null,cooldown=0,viewScale=1;let sized=false;const hitCanvas=document.createElement('canvas');let lastTargets=[];
function resize(){
 const box=canvas.getBoundingClientRect();if(box.width<1||box.height<1)return;
 const dpr=devicePixelRatio||1,oldWidth=m.width,oldHeight=m.height,oldScale=viewScale;
 if(m.pointer)m.release(m.pointer.id,clock.now(),{cancel:true});clock.set('contact',false);
 const head=sized?m.world(m.view,m.head(m.view.frame)):null,oldFloor=m.floor;
 viewScale=CHARACTER_DISPLAY_SCALE*Math.min(1,box.height/440,box.width/300);
 canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);m.width=box.width/viewScale;m.height=box.height/viewScale;
 if(head){const next={x:clamp(head.x/oldWidth*m.width,98,m.width-98),y:clamp(head.y/oldHeight*m.height,90,m.height-100)},dx=next.x-head.x,dy=next.y-head.y;
  for(const key of ['anchor','dropHead','previewFrom','previewTarget'])if(m[key]){m[key].x+=dx;m[key].y+=dy;}
  for(const key of ['frozen','view'])if(m[key]){m[key].left+=dx;m[key].top+=dy;}
  if(Number.isFinite(m.landX))m.landX=clamp(m.landX+dx,115,m.width-115);m.x=clamp(m.x+dx,110,m.width-110);
  m.floor=['drop','fall'].includes(m.phase)?Math.min(m.height-22,oldFloor+dy):m.height-22;
  p.x=next.x;p.y=next.y;p.vx*=oldScale/viewScale;p.vy*=oldScale/viewScale;
  if(wall){const g=wallGeometry(wall.mode);Object.assign(wall,{x:g.x,y:g.y,facing:g.facing,contactX:g.headX,contactY:g.headY});m.view=placement(wall.frame,wall);}
  else if(m.phase==='rolling')m.view=m.byHead(m.view.frame,next);
 }else{m.floor=m.height-22;p.x=clamp(p.x,98,m.width-98);p.y=clamp(p.y,90,m.height-100);}
 ctx.setTransform(dpr*viewScale,0,0,dpr*viewScale,0,0);lastBounds=-Infinity;sized=true;
}
new ResizeObserver(resize).observe($('board'));resize();
function reset(){wall=null;m.reset();m.paused=true;p.x=m.width/2;p.y=Math.max(115,Math.min(m.height/2,m.height-120));p.vx=p.vy=0;m.view=m.byHead(data.sequences.rolling[0],p);}
reset();
function placement(f,{x=0,y=0,width=460,floor=309,facing='left'}={}){
 const sheet=data.sheets[f.sheet],a=sheet.frames[f.index],[sx,sy,w,h]=a.rect,s=a.scale??sheet.scale,mirror=facing!==(a.baseFacing||sheet.baseFacing||'left');
 let left=width/2-(a.center_x??w/2)*s+(f.shiftX||0);
 if(sheet.scene==='wall-embedded'){const inset=data.side_wall_inset??52;left=(a.wall_side==='wall-left'?inset:width-inset)-a.wall_axis_x*s;}
 if(f.headX!==undefined)left=(mirror?width-f.headX:f.headX)-(a.center_x??w/2)*s;
 let top=floor-a.floor*s-(f.lift||0);
 if(sheet.scene==='ceiling')top=floor-(309-sheet.screenCeilingY)-a.ceiling_axis_y*s;
 if(sheet.scene==='ground')top=floor-a.ground_axis_y*s;
 if(f.headTop!==undefined)top=floor+f.headTop-309-a.head_bbox[1]*s;
 if(sheet.scene==='wall-embedded')top=floor+a.screenTop-309;
 return {frame:f,left:x+(mirror?width-left-w*s:left),top:y+top,mirror};
}
function wallGeometry(mode){
 const facing=mode==='wall-left'?'right':mode==='wall-right'?'left':m.direction;
 const probe=placement(data.sequences[mode][0],{facing}),contactHead=m.world(probe,m.head(probe.frame));
 let x=p.x-contactHead.x,y=p.y-contactHead.y;
 if(mode==='wall-left')x=-52;if(mode==='wall-right')x=m.width-408;
 if(mode==='wall-top')y=-22;if(mode==='wall-bottom')y=m.height-309;
 return {x,y,facing,headX:x+contactHead.x,headY:y+contactHead.y};
}
function startWall(mode,now){
 const {x,y,facing}=wallGeometry(mode);
 wall={mode,start:now,x,y,facing,frame:data.sequences[mode][0],opacity:1,clock:makeWallClock(now),contactX:p.x,contactY:p.y};p.vx=p.vy=0;m.pointer=null;m.virtual=false;m.direction=facing;m.phase='wall';
 m.view=placement(wall.frame,wall);
 void 0;
}
const point=e=>{const box=canvas.getBoundingClientRect();return {x:(e.clientX-box.x)/viewScale,y:(e.clientY-box.y)/viewScale};};
function pointer(type,rawX,rawY,id,nativeWidth,nativeHeight){
 const pt=physicalPoint(rawX,rawY,nativeWidth,nativeHeight,m.width,m.height),now=clock.now();
 if(type==='down'){clock.set('contact',false);if(!m.pointer&&m.press(pt,id,now,{force:true})){wall=null;p.vx=p.vy=0;}}
 else if(type==='move')m.move(pt,id,now);
 else m.release(id,now,{cancel:type==='cancel'});
}
function cancel(){if(m.pointer)m.release(m.pointer.id,clock.now(),{cancel:true});clock.set('contact',false);}
if(!overlay){
 let down=null,held=false,lastTap=0,holdTimer=null,singleTimer=null;
 const clear=()=>{clearTimeout(holdTimer);holdTimer=null;};
 const begin=()=>{if(!down||held)return;held=true;clock.set('contact',false);pointer('down',down.x,down.y,down.id,canvas.clientWidth,canvas.clientHeight);};
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.x,y=e.clientY-r.y;if(!lastTargets.some(t=>x>=t.x&&y>=t.y&&x<t.x+t.width&&y<t.y+t.height))return;e.preventDefault();canvas.setPointerCapture(e.pointerId);clearTimeout(singleTimer);down={x,y,id:e.pointerId};held=false;clock.set('contact',true);
  if(performance.now()-lastTap<300){clear();down=null;lastTap=0;window.AndroidPet?.menu?.();clock.set('contact',false);return;}holdTimer=setTimeout(begin,500);});
 canvas.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.x,y=e.clientY-r.y;if(!held&&Math.hypot(x-down.x,y-down.y)>8)begin();if(held)pointer('move',x,y,down.id,canvas.clientWidth,canvas.clientHeight);});
 const end=(e,cancelled)=>{if(!down||e.pointerId!==down.id)return;clear();if(held){const r=canvas.getBoundingClientRect();pointer(cancelled?'cancel':'up',e.clientX-r.x,e.clientY-r.y,down.id,canvas.clientWidth,canvas.clientHeight);clock.set('contact',false);}else{lastTap=performance.now();singleTimer=setTimeout(()=>clock.set('contact',false),300);}down=null;held=false;};
 canvas.addEventListener('pointerup',e=>end(e,false));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>{if(down)end(e,true);});
}
$('calibrate').onclick=()=>{zero={x:gravity.x,y:gravity.y};p.vx=p.vy=0;};$('reset').onclick=reset;
$('pull').onclick=()=>{if(m.pointer)m.release(m.pointer.id,clock.now());else{wall=null;m.floor=m.height-22;m.preview(clock.now());}};
$('theme').onclick=()=>{const on=document.body.classList.toggle('dark');$('theme').textContent=on?'밝은 배경':'어두운 배경';};
for(const button of document.querySelectorAll('[data-wall]'))button.onclick=()=>startWall(button.dataset.wall,clock.now());
if(window.AndroidPet?.startOverlay){$('native-actions').hidden=false;$('overlay-start').onclick=()=>window.AndroidPet.startOverlay();$('overlay-stop').onclick=()=>window.AndroidPet.stopOverlay();}
function tick(wallTime){
 const now=clock.sample(wallTime);
 const dt=last===null?0:Math.max(0,now-last);last=now;
 const gx=gravity.x-zero.x,gy=gravity.y-zero.y,roll=Math.atan2(-gx,Math.abs(gravity.z)||.001)*180/Math.PI,pitch=Math.atan2(gy,Math.abs(gravity.z)||.001)*180/Math.PI;
 $('roll').textContent=roll.toFixed(1)+'°';$('pitch').textContent=pitch.toFixed(1)+'°';
 const before=m.phase;
 if(clock.running){
 if(wall){
  const seq=data.sequences[wall.mode],attached=wall.clock.attached,time=advanceWallClock(wall.clock,now,inwardGravity(wall.mode,gx,gy)),cur=locateFrame(seq,time,false),f=wallPose(data,seq,cur,wall.mode,wall.facing,!wall.clock.attached);
  if(attached&&!wall.clock.attached)void 0;
  wall.frame=f;wall.opacity=wallRimOpacity(data,seq,time);m.view=placement(f,{...wall});
  if(cur.ended){const h=m.world(m.view,m.head(f));p.x=h.x;p.y=h.y;p.vx=wall.mode==='wall-left'?25:wall.mode==='wall-right'?-25:0;p.vy=0;wall=null;m.phase='rolling';m.rollElapsed=0;cooldown=now+650;}
 }else if(m.phase==='rolling'){
  const previous={x:p.x,y:p.y};
  const motion=advanceRollingFrame(p,gx,gy,dt,viewScale),speed=motion.speed;
  if(Math.abs(p.vx)>4)m.direction=p.vx<0?'left':'right';
  m.paused=false;m.rollElapsed+=rollingPhaseIncrement(motion.dt,speed,viewScale,60);
  m.now=now;m.lastTime=now;const rotation=locateFrame(data.sequences.rolling,m.rollElapsed,true);m.view=m.byHead(data.sequences.rolling[rotation.index],p);
  if(now>cooldown){
   const hits=[];
   for(const [mode,axis,sign] of [['wall-left','x',-1],['wall-right','x',1],['wall-top','y',-1],['wall-bottom','y',1]]){
    const geometry=wallGeometry(mode),limit=axis==='x'?geometry.headX:geometry.headY;
    if(p['v'+axis]*sign>0&&(p[axis]-limit)*sign>=0){const t=clamp((limit-previous[axis])/(p[axis]-previous[axis]||1),0,1);hits.push({mode,axis,limit,t});}
   }
   hits.sort((a,b)=>a.t-b.t);
   if(hits.length){const hit=hits[0];p.x=previous.x+(p.x-previous.x)*hit.t;p.y=previous.y+(p.y-previous.y)*hit.t;p[hit.axis]=hit.limit;startWall(hit.mode,now);}
  }
  if(!wall){p.x=clamp(p.x,wallGeometry('wall-left').headX,wallGeometry('wall-right').headX);p.y=clamp(p.y,wallGeometry('wall-top').headY,wallGeometry('wall-bottom').headY);m.view=m.byHead(m.view.frame,p);}
 }else{
  m.tick(now);
  if(before!=='rolling'&&m.phase==='rolling'){const h=m.world(m.view,m.head(m.view.frame));p.x=h.x;p.y=h.y;p.vx=p.vy=0;cooldown=now+650;}
 }
 }
 ctx.clearRect(0,0,m.width,m.height);if(!overlay){ctx.strokeStyle=document.body.classList.contains('dark')?'#4d4357':'#e5ddeb';ctx.strokeRect(10.5,10.5,m.width-21,m.height-21);}
 if(wall)renderer.paintStage(ctx,wall.frame,wall.mode,wall.facing,{x:wall.x,y:wall.y,rimAlpha:wall.opacity});
 else drawWholePose(ctx,data,images,m.view);
 for(const t of m.particles)drawPearl(ctx,data,images,t,now-t.born);
 if(now-lastBounds>40){
  const item=m.item(m.view.frame),scale=m.scale(m.view.frame),b=item.bbox||[0,0,item.rect[2],item.rect[3]],w=item.rect[2];
  const actorLeft=m.view.left+(m.view.mirror?w-b[2]:b[0])*scale,actorTop=m.view.top+b[1]*scale;
  let left=actorLeft,top=actorTop,right=m.view.left+(m.view.mirror?w-b[0]:b[2])*scale,bottom=m.view.top+b[3]*scale;
  const hw=Math.max(1,Math.ceil((right-left)*viewScale)),hh=Math.max(1,Math.ceil((bottom-top)*viewScale));
  let clip=null;
  if(wall){const inset=data.side_wall_inset??52;clip=wall.mode==='wall-left'?[wall.x+inset,wall.y,460-inset,340]:wall.mode==='wall-right'?[wall.x,wall.y,460-inset,340]:wall.mode==='wall-top'?[wall.x,wall.y+22,460,318]:wall.frame.occludeGround?[wall.x,wall.y,460,311]:[wall.x,wall.y,460,340];}
  const relativeClip=clip?.map((v,i)=>i===0?v-actorLeft:i===1?v-actorTop:v);
  const key=[m.view.frame.sheet,m.view.frame.index,m.view.mirror,scale,viewScale,hw,hh,wall?.mode??'',...(relativeClip??[]).map(v=>Math.round(v*10000)/10000)].join('|');
  const localTargets=poseHits.get(key,()=>{
   hitCanvas.width=hw;hitCanvas.height=hh;
   const hc=hitCanvas.getContext('2d',{willReadFrequently:true});hc.setTransform(viewScale,0,0,viewScale,0,0);
   if(relativeClip){hc.beginPath();hc.rect(...relativeClip);hc.clip();}
   drawWholePose(hc,data,images,{...m.view,left:m.view.left-actorLeft,top:m.view.top-actorTop});
   const pixels=hc.getImageData(0,0,hw,hh).data,mask=new Uint8Array(hw*hh);
   const hb=item.head_bbox??[0,0,w,item.rect[3]],hl=m.view.left+(m.view.mirror?w-hb[2]:hb[0])*scale-actorLeft,ht=m.view.top+hb[1]*scale-actorTop,hr=hl+(hb[2]-hb[0])*scale,hbY=ht+(hb[3]-hb[1])*scale;
   for(let i=0;i<mask.length;i++){const x=(i%hw+.5)/viewScale,y=(Math.floor(i/hw)+.5)/viewScale;mask[i]=pixels[i*4+3]>=224&&(!wall||(x>=hl&&x<hr&&y>=ht&&y<hbY))?1:0;}
   return opaqueRectangles(mask,hw,hh);
  });
  lastTargets=localTargets.map(r=>({x:actorLeft*viewScale+r.x,y:actorTop*viewScale+r.y,width:r.width,height:r.height}));
  if(wall){left=Math.min(left,wall.x);right=Math.max(right,wall.x+460);top=Math.min(top,wall.y);bottom=Math.max(bottom,wall.y+340);}
  for(const t of m.particles){const age=now-t.born;if(age<650){left=Math.min(left,t.x-8);right=Math.max(right,t.x+8);bottom=Math.max(bottom,t.y+.00042*age*age+8);}}
  const guard=drawingGuard(Math.hypot(p.vx,p.vy)*viewScale);
  if(overlay){boundsSent++;window.AndroidPet?.onBounds?.(JSON.stringify({epoch,left:left*viewScale-guard,top:top*viewScale-guard,right:right*viewScale+guard,bottom:bottom*viewScale+guard,drawGuard:guard,viewportWidth:m.width*viewScale,viewportHeight:m.height*viewScale,targets:lastTargets}));}
  lastBounds=now;
 }
 const phase=wall?'wall':m.phase;
 const texts={rolling:'기울일수록 빨리 굴러. 볼을 잡아 옮길 수도 있어.',caught:'볼이 당겨지고 몸이 뒤따르는 중',hanging:'볼을 잡은 채 팔다리를 휘적이는 중',drop:'손을 놓아 떨어지는 중',fall:'넘어진 몸을 모으는 중',wall:wall?.clock.attached?'벽에 박혀 있어. 기울기를 풀면 빠져나와.':'낑낑대며 틈에서 빠져나오는 중'};
 $('status').textContent=texts[phase];$('pull').textContent=m.pointer?'놓기':'당겨 보기';
 $('sensor').textContent=samples?'휴대폰을 기울여 움직이고, 수평에서 기준을 잡아 봐.':'휴대폰 센서를 기다리는 중 · 아래 버튼으로 동작을 볼 수 있어.';
 requestAnimationFrame(tick);
}
window.Kydian={
 gravity(x,y,z,rotation=basis){if(rotation!==basis){zero=rotateVector(zero,basis,rotation);const v=rotateVector({x:p.vx,y:p.vy},basis,rotation);p.vx=v.x;p.vy=v.y;basis=rotation;}window.receiveGravity(x,y,z,clock.now());},
 pointer,
 contact(value){clock.set('contact',value);},
 visible(value){if(!value)cancel();clock.set('visible',value);lastBounds=-Infinity;},
 pause(value){if(value)cancel();clock.set('manual',value);},
 cancel,
 viewport(width,height,revision){cancel();epoch=revision;resize();lastBounds=-Infinity;},
 action(name){if(['calibrate','reset','pull','theme'].includes(name))$(name).click();},
 snapshot(){const head=m.world(m.view,m.head(m.view.frame));return{phase:m.phase,frame:{...m.view.frame},head,world:{width:m.width,height:m.height},viewScale,performance:{poseHits:poseHits.stats(),boundsSent},velocity:{x:p.vx,y:p.vy},time:clock.time,pointer:m.pointer?m.pointer.id:null,paused:!clock.running,epoch,targets:lastTargets,wall:wall?{mode:wall.mode,contactX:wall.contactX,contactY:wall.contactY,attached:wall.clock.attached}:null};}
};
window.AndroidPet?.ready?.();requestAnimationFrame(tick);
