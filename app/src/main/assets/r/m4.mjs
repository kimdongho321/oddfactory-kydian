import {actorClip} from './m1.mjs';
export function createSceneRenderer(data,images){
 const direction='left';
    const frameMirror=(frame,facing)=>{const sheet=data.sheets[frame.sheet];return facing!==(sheet.frames[frame.index].baseFacing||sheet.baseFacing||'left');};
    const poseMirror=(frame,currentMode,facing)=>frame.sheet==='wallSide'?currentMode==='wall-right':frameMirror(frame,facing);
    const paintScenery=(context,currentMode,{x=0,y=0,width=460,floor=309,scale=1,facing=direction}={})=>{
      const sideRim=data.side_rims?.[currentMode];
      if(sideRim){
        const item=data.sheets[sideRim.sheet].frames[sideRim.index];
        const [sx,sy,sw,sh]=item.rect,s=sideRim.source_scale*scale;
        const inset=(data.side_wall_inset??52)*scale;
        const wallX=currentMode==='wall-left'?inset:width-inset;
        context.save();context.translate(x,y);context.imageSmoothingEnabled=false;
        context.drawImage(images[sideRim.sheet],sx,sy,sw,sh,wallX-sideRim.source_axis_x*s,
                          floor+(sideRim.screenTop-309)*scale,sw*s,sh*s);
        context.restore();return;
      }
      if(currentMode==='wall-bottom'&&data.bottom_fixed_rim){
        const item=data.sheets.groundRim.frames[0],rim=data.bottom_fixed_rim;
        const [sx,sy,sw,sh]=item.rect,s=rim.scale*scale;
        context.save();context.translate(x,y);context.imageSmoothingEnabled=false;
        if(facing!=='left'){context.translate(width,0);context.scale(-1,1);}
        context.drawImage(images.groundRim,sx,sy,sw,sh,width/2-rim.center_x*s,floor-rim.axis_y*s,sw*s,sh*s);
        context.restore();return;
      }
      const entry=data.scenery?.[currentMode];
      if(entry===undefined)return;
      const sheet=data.sheets.scenery,item=sheet.frames[entry];
      const [sx,sy,sw,sh]=item.rect,b=item.bbox;
      const s=(entry===2?.38:.40)*scale;
      let left=width/2-(b[0]+b[2])/2*s;
      let top=floor-item.axis_y*s;
      if(entry===0)top=floor-(309-data.scenery.ceiling_y)*scale-item.axis_y*s;
      if(entry===2){left=120*scale-item.axis_x*s;top=floor+21*scale-b[3]*s;}
      context.save();context.translate(x,y);context.imageSmoothingEnabled=false;
      if(currentMode==='wall-right'){context.translate(width,0);context.scale(-1,1);}
      context.drawImage(images.scenery,sx,sy,sw,sh,left,top,sw*s,sh*s);context.restore();
    };
    const paintPose=(context,frame,{x=0,y=0,width=460,floor=309,mirror=false,scale=1,wallX=null}={})=>{
      const sheet=data.sheets[frame.sheet],item=sheet.frames[frame.index];
      const [sx,sy,sw,sh]=item.rect,s=(item.scale??sheet.scale)*scale;
      let left=wallX===null?width/2-(item.center_x??sw/2)*s+(frame.shiftX||0)*scale:wallX-item.wall_axis_x*s;
      if(sheet.scene==='wall-embedded'){
        const inset=(data.side_wall_inset??52)*scale;
        const axis=item.wall_side==='wall-left'?inset:width-inset;
        left=axis-item.wall_axis_x*s;
      }
      if(frame.headX!==undefined){const cx=width/2+(frame.headX-230)*scale;left=(mirror?width-cx:cx)-(item.center_x??sw/2)*s;}
      context.save();context.translate(x,y);context.imageSmoothingEnabled=false;
      if(mirror){context.translate(width,0);context.scale(-1,1);}
      let top=floor-item.floor*s-(frame.lift||0)*scale;
      if(sheet.scene==='ceiling')top=floor-(309-sheet.screenCeilingY)*scale-item.ceiling_axis_y*s;
      if(sheet.scene==='ground')top=floor-item.ground_axis_y*s;
      if(frame.headTop!==undefined)top=floor+(frame.headTop-309)*scale-item.head_bbox[1]*s;
      if(sheet.scene==='wall-embedded')top=floor+(item.screenTop-309)*scale;
      context.translate(left,top);context.scale(s,s);const clip=actorClip(item);if(clip)context.clip(clip);
      context.drawImage(images[frame.sheet],sx,sy,sw,sh,0,0,sw,sh);
      context.restore();
    };
    const paintStage=(context,frame,currentMode,facing,{x=0,y=0,width=460,floor=309,scale=1,rimAlpha=1}={})=>{
      context.save();context.translate(x,y);
      if((currentMode==='wall-bottom'&&frame.sheet==='p6')||(currentMode==='wall-top'&&frame.sheet==='p19')){
        
        paintPose(context,frame,{width,floor,scale,mirror:poseMirror(frame,currentMode,facing)});
        context.restore();return;
      }
      const clearOfGround=currentMode==='wall-bottom'&&!frame.occludeGround;
      const boundary=()=>{context.save();context.globalAlpha*=rimAlpha;paintScenery(context,currentMode,{width,floor,scale,facing});context.restore();};
      if(clearOfGround)boundary();
      context.save();context.beginPath();
      if(currentMode==='wall-left')context.rect((data.side_wall_inset??52)*scale,0,width-(data.side_wall_inset??52)*scale,340*scale);
      else if(currentMode==='wall-right')context.rect(0,0,width-(data.side_wall_inset??52)*scale,340*scale);
      else if(currentMode==='wall-top')context.rect(0,floor-(309-22)*scale,width,340*scale);
      else if(currentMode==='wall-bottom'&&frame.occludeGround)context.rect(0,0,width,floor+2*scale);
      else context.rect(0,0,width,340*scale);
      context.clip();
      paintPose(context,frame,{width,floor,scale,mirror:poseMirror(frame,currentMode,facing)});
      context.restore();
      
      if(!clearOfGround)boundary();
      context.restore();
    };

return {frameMirror,poseMirror,paintScenery,paintPose,paintStage};
}
