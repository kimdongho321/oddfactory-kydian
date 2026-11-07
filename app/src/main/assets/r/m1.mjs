import {CheekDragModel} from './m0.mjs';
const clipPaths=new WeakMap();
export function actorClip(item){
  if(!item.clip_runs)return null;
  if(!clipPaths.has(item)){const path=new Path2D();for(const [y,a,b] of item.clip_runs)path.rect(a,y,b-a,1);clipPaths.set(item,path);}
  return clipPaths.get(item);
}

export function drawWholePose(ctx,data,images,view){
  const sheet=data.sheets[view.frame.sheet],p=sheet.frames[view.frame.index];
  const [x,y,w,h]=p.rect,s=p.scale??sheet.scale;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(view.left,view.top);
  if(view.mirror){ctx.translate(w*s,0);ctx.scale(-1,1);}
  ctx.scale(s,s);const clip=actorClip(p);if(clip)ctx.clip(clip);
  ctx.drawImage(images[view.frame.sheet],x,y,w,h,0,0,w,h);ctx.restore();
}

export function drawPearl(ctx,data,images,p,age){
  if(age<0||age>650)return;
  const sheet=data.sheets.p13,f=sheet.frames[Math.min(3,Math.floor(age/160))];
  const [rx,ry]=f.rect,b=f.bbox,[x,y,x2,y2]=b,w=x2-x,h=y2-y,s=6/w;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=Math.min(1,(650-age)/180);
  ctx.drawImage(images.p13,rx+x,ry+y,w,h,p.x-3+(p.side?1:-1)*age*.002,p.y+.00042*age*age,w*s,h*s);ctx.restore();
}

