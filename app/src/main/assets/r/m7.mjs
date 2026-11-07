import {wallPose as previous} from './m6.mjs';
export {headTop,headX} from './m6.mjs';
export function wallPose(data,sequence,current,mode,direction,playing){
 const source=sequence[current.index],next=sequence[current.index+1];let f=previous(data,sequence,current,mode,direction,playing);
 if(mode==='wall-bottom'&&source.travelX!==undefined){
  const t=playing?Math.max(0,Math.min(1,current.local/source.duration)):0;
  const travel=source.travelX+((next?.travelX??source.travelX)-source.travelX)*t;
  f={...f,headX:230+(direction==='left'?-1:1)*travel};
  if(source.phase==='free-roll')delete f.headTop;
 }
 return f;
}
