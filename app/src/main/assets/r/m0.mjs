import {locateFrame} from './m3.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const frame=(sheet,index)=>({sheet,index});

export class CheekDragModel {
  constructor(data,{width=460,height=500}={}){
    this.data=data;this.width=width;this.height=height;this.floor=height-30;
    this.direction='left';this.paused=false;this.stats={grabs:0,regrabs:0,releases:0,cancels:0,tears:0};
    this.reset();
  }
  item(f){return this.data.sheets[f.sheet].frames[f.index];}
  scale(f){return this.item(f).scale??this.data.sheets[f.sheet].scale;}
  mirror(f){return this.direction!==(this.item(f).baseFacing||this.data.sheets[f.sheet].baseFacing||'left');}
  head(f){const p=this.item(f),b=p.head_bbox;return p.head||(b?[(b[0]+b[2])/2,(b[1]+b[3])/2]:[p.rect[2]/2,p.rect[3]*.34]);}
  grip(f){return this.item(f).grip||this.head(f);}
  isHeld(f){return f.sheet==='p17'&&f.index<8;}
  world(view,point){const p=this.item(view.frame),s=this.scale(view.frame);return {x:view.left+(view.mirror?p.rect[2]-point[0]:point[0])*s,y:view.top+point[1]*s};}
  make(f,left,top){return {frame:{...f},left,top,mirror:this.mirror(f)};}
  byHead(f,h){const p=this.item(f),s=this.scale(f),g=this.head(f),m=this.mirror(f);return this.make(f,h.x-(m?p.rect[2]-g[0]:g[0])*s,h.y-g[1]*s);}
  onFloor(f,cx=this.x){const p=this.item(f),s=this.scale(f),m=this.mirror(f),c=p.center_x??p.rect[2]/2;
    return this.make(f,cx-(m?p.rect[2]-c:c)*s,this.floor-p.floor*s-(f.lift||0));}
  bounded(view,clearance=0){const p=this.item(view.frame),s=this.scale(view.frame),b=p.bbox||[0,0,p.rect[2],p.rect[3]],w=p.rect[2];
    const lo=(view.mirror?w-b[2]:b[0])*s,hi=(view.mirror?w-b[0]:b[2])*s;
    view.left=clamp(view.left,8-lo,this.width-8-hi);view.top=clamp(view.top,8-b[1]*s,this.floor-clearance-b[3]*s);return view;}
  remember(){}
  reset(){if(this.data.cheek_interaction.local_drop_distance)this.floor=this.height-30;this.phase='rolling';this.pointer=null;this.virtual=false;this.catchLevel=0;this.x=this.width/2;this.rollElapsed=0;this.lastTime=null;this.now=0;this.particles=[];this.lastEmission=0;this.view=this.onFloor(this.data.sequences.rolling[0]);void 0;}
  hit(point){if(!this.view)return false;const g=this.world(this.view,this.grip(this.view.frame));const h=this.world(this.view,this.head(this.view.frame));
    return Math.hypot(point.x-g.x,point.y-g.y)<52||Math.hypot(point.x-h.x,point.y-h.y)<85;}
  press(point,id,now=0,{force=false,virtual=false}={}){
    if(!force&&!this.hit(point))return false;
    if(this.data.cheek_interaction.local_drop_distance)this.floor=this.height-30;const regrab=this.phase!=='rolling';this.now=now;this.frozen={...this.view,frame:{...this.view.frame}};
    const g=this.world(this.view,this.grip(this.view.frame));this.offset={x:g.x-point.x,y:g.y-point.y};
    this.pointer={...point,id};this.anchor={...g};this.startPointer={...point};this.previousPointer={...point,time:now};this.velocity={x:0,y:0};
    this.catchIndex=this.view.frame.sheet==='rolling'?this.view.frame.index:7;this.regrab=regrab;
    const wasHeld=this.isHeld(this.view.frame);
    const resumeStage=this.view.frame.sheet==='p18'?this.view.frame.index+3:0;
    this.catchLevel=wasHeld?7:resumeStage;
    const resumedMs=resumeStage?this.data.cheek_interaction.grab_stage_ends[resumeStage-1]:0;
    if(!wasHeld)this.flutterAt=now+this.data.cheek_interaction.hold_progress_ms-resumedMs;
    this.facingPointerX=point.x;this.turnUntil=0;
    this.phase='caught';this.grabAt=now-resumedMs;this.virtual=virtual;this.stats.grabs++;if(regrab)this.stats.regrabs++;
    this.lastEmission=now-160;void 0;return true;
  }
  move(point,id,now){if(!this.pointer||this.pointer.id!==id)return false;
    const dx=point.x-this.pointer.x,dy=point.y-this.pointer.y,dt=Math.max(1,now-this.previousPointer.time);
    this.velocity={x:dx/dt,y:dy/dt};this.pointer={...point,id};this.previousPointer={...point,time:now};
    this.anchor={x:point.x+this.offset.x,y:point.y+this.offset.y};
    
    this.view.left+=dx;this.view.top+=dy;
    const facingTravel=point.x-this.facingPointerX;
    if(Math.abs(facingTravel)>=this.data.cheek_interaction.pull_direction_deadzone){this.setPullFacing(facingTravel<0?'left':'right',now);this.facingPointerX=point.x;}
    return true;
  }
  setPullFacing(facing,now){
    if(this.direction===facing)return;
    const h=this.world(this.view,this.head(this.view.frame));this.direction=facing;
    
    
    this.view=this.byHead(this.view.frame,h);this.turnUntil=now+120;this.now=now;void 0;
  }
  release(id,now,{cancel=false}={}){if(!this.pointer||this.pointer.id!==id)return false;
    const moved=Math.hypot(this.pointer.x-this.startPointer.x,this.pointer.y-this.startPointer.y);
    this.pointer=null;this.virtual=false;this.now=now;
    if(cancel)this.stats.cancels++;
    if(moved<7&&this.phase==='caught'&&this.catchIndex<7&&now-this.grabAt<this.data.cheek_interaction.hold_progress_ms){
      this.phase='rolling';this.x=clamp(this.world(this.view,this.head(this.view.frame)).x,110,this.width-110);
      this.rollElapsed=(this.catchIndex<7?this.catchIndex:0)*60;this.view={...this.frozen,frame:{...this.frozen.frame}};
      void 0;return true;
    }
    this.phase='drop';this.dropAt=now;this.dropHead=this.world(this.view,this.head(this.view.frame));
    if(this.data.cheek_interaction.local_drop_distance){const pose=frame('p20',1),p=this.item(pose);this.floor=Math.min(this.height-30,this.dropHead.y+this.data.cheek_interaction.local_drop_distance+(p.floor-this.head(pose)[1])*this.scale(pose));}
    const contact=this.onFloor(frame('p20',1),this.dropHead.x),target=this.world(contact,this.head(contact.frame));
    this.dropDistance=Math.max(0,target.y-this.dropHead.y);this.dropDuration=clamp(Math.sqrt(2*this.dropDistance/.0046),120,520);
    this.landX=clamp(this.dropHead.x+clamp((now-this.previousPointer.time<80?this.velocity.x:0)*85,-(this.data.cheek_interaction.release_max_drift??Infinity),this.data.cheek_interaction.release_max_drift??Infinity),115,this.width-115);
    this.stats.releases++;void 0;return true;
  }
  preview(now){const g=this.world(this.view,this.grip(this.view.frame));this.press(g,-1,now,{force:true,virtual:true});
    this.previewFrom={...g};this.previewTarget={x:this.width*(this.direction==='left'?.15:.85),y:this.height*.27};}
  toggleDirection(){if(this.phase!=='rolling')return;this.direction=this.direction==='left'?'right':'left';this.view=this.onFloor(this.view.frame,this.x);}
  caughtFrame(now){
    
    
    const stages=this.data.cheek_interaction.grab_stage_ends;
    const elapsed=now-this.grabAt;
    this.catchLevel=Math.max(this.catchLevel,stages.filter(end=>elapsed>=end).length);
    const loop=this.data.cheek_interaction.flutter_frames;
    const flutter=loop[Math.floor(Math.max(0,now-this.flutterAt)/this.data.cheek_interaction.flutter_frame_ms)%loop.length];
    const choices=[this.frozen.frame,frame('p15',this.catchIndex),frame('p15',7),
      frame('p18',0),frame('p18',1),frame('p18',2),frame('p18',3),frame('p17',flutter)];
    return choices[this.catchLevel];
  }
  emitTears(now){const p=this.item(this.view.frame);if(!this.pointer||!p.tears)return;
    if(now-this.lastEmission>=160){const side=this.stats.tears%2;const pt=this.world(this.view,p.tears[side]);this.particles.push({...pt,born:now,side});this.lastEmission=now;this.stats.tears++;}
  }
  tick(now){const dt=this.lastTime===null?0:clamp(now-this.lastTime,0,40);this.lastTime=now;this.now=now;
    if(this.virtual&&this.pointer){const t=clamp((now-this.grabAt)/this.data.cheek_interaction.preview_move_ms,0,1),e=t*t*(3-2*t);
      this.move({x:this.previewFrom.x+(this.previewTarget.x-this.previewFrom.x)*e,y:this.previewFrom.y+(this.previewTarget.y-this.previewFrom.y)*e},-1,now);}
    if(this.phase==='rolling'){
      if(!this.paused){this.rollElapsed+=dt;this.x+=(this.direction==='left'?-1:1)*dt*.016;
        if(this.x<110||this.x>this.width-110){this.x=clamp(this.x,110,this.width-110);this.direction=this.direction==='left'?'right':'left';}}
      const current=locateFrame(this.data.sequences.rolling,this.rollElapsed,true);this.view=this.onFloor(this.data.sequences.rolling[current.index]);
    }else if(this.pointer){
      const f=this.caughtFrame(now),changed=f.sheet!==this.view.frame.sheet||f.index!==this.view.frame.index;
      if(changed){const h=this.world(this.view,this.head(this.view.frame));this.view=this.byHead(f,h);
        if(!this.isHeld(f))void 0;}
      const p=this.item(f),s=this.scale(f),g=this.grip(f),m=this.mirror(f);
      const held=this.isHeld(f),floating=held?Math.sin((now-this.flutterAt)/180)*3:0;
      const clearance=18*clamp((now-this.grabAt)/this.data.cheek_interaction.hold_progress_ms,0,1);
      const target=this.bounded(this.make(f,this.anchor.x-(m?p.rect[2]-g[0]:g[0])*s,this.anchor.y-g[1]*s+floating),clearance);
      const a=1-Math.exp(-Math.max(1,dt)/(now<this.turnUntil?38:20));this.view.left+=(target.left-this.view.left)*a;this.view.top+=(target.top-this.view.top)*a;
      this.view=this.bounded(this.view,clearance);this.phase=held?'hanging':'caught';this.emitTears(now);
    }else if(this.phase==='drop'){
      const t=now-this.dropAt;
      if(t<this.dropDuration){const f=frame('p20',t<this.data.cheek_interaction.release_recoil_ms?0:1),progress=t/this.dropDuration;
        this.view=this.byHead(f,{x:this.dropHead.x+(this.landX-this.dropHead.x)*progress,y:this.dropHead.y+this.dropDistance*progress*progress});this.bounded(this.view);
      }else if(t<this.dropDuration+this.data.cheek_interaction.contact_ms){this.view=this.onFloor(frame('p20',2),this.landX);}
      else {this.phase='fall';this.fallAt=this.dropAt+this.dropDuration+this.data.cheek_interaction.contact_ms;void 0;}
    }
    if(this.phase==='fall'){
      const seq=this.data.cheek_release_suffix,current=locateFrame(seq,now-this.fallAt,false),f=seq[current.index];
      const shift=(this.direction==='left'?1:-1)*(f.shiftX||0);this.view=this.onFloor(f,this.landX+shift);
      if(current.ended){this.phase='rolling';this.x=this.landX;this.rollElapsed=this.paused?0:this.data.sequences.rolling[0].duration;void 0;}
    }
    this.particles=this.particles.filter(p=>now-p.born<650);return this.view;
  }
}
