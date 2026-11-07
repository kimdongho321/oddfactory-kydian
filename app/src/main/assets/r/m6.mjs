
export function headTop(data, frame) {
  if (frame.headTop !== undefined) return frame.headTop;
  const sheet=data.sheets[frame.sheet], pose=sheet.frames[frame.index];
  return 309-(pose.floor-(pose.head_bbox?.[1]||0))*(pose.scale??sheet.scale)-(frame.lift||0);
}

export function headX(data, frame, direction) {
  if(frame.headX!==undefined)return frame.headX;
  const sheet=data.sheets[frame.sheet],pose=sheet.frames[frame.index];
  const mirrored=direction!==(pose.baseFacing||sheet.baseFacing||'left');
  return 230+(mirrored?-1:1)*(frame.shiftX||0);
}

export function wallPose(data,sequence,current,mode,direction,playing) {
  const source=sequence[current.index],next=sequence[current.index+1];
  if(!playing||!mode.startsWith('wall-')||source.phase==='embedded'||source.phase==='reused-fall')return source;
  const frame={...source},t=Math.max(0,Math.min(1,current.local/source.duration));
  if(source.gravity){
    const g=source.gravity,ms=g.time+current.local;
    frame.headTop=g.origin+.5*g.acceleration*ms*ms;
  }else if(next){
    frame.headTop=headTop(data,source)+(headTop(data,next)-headTop(data,source))*t;
  }
  if(source.headX!==undefined&&next)frame.headX=headX(data,source,direction)+(headX(data,next,direction)-headX(data,source,direction))*t;
  return frame;
}
