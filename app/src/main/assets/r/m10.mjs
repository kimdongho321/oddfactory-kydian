

export class PoseHitCache {
 constructor(limit=384){this.limit=limit;this.entries=new Map();this.hits=0;this.misses=0;}
 get(key,produce){
  if(this.entries.has(key)){this.hits++;return this.entries.get(key);}
  this.misses++;
  const rects=produce().map(r=>Object.freeze({...r}));
  if(this.entries.size>=this.limit)this.entries.delete(this.entries.keys().next().value);
  this.entries.set(key,Object.freeze(rects));return rects;
 }
 clear(){this.entries.clear();}
 stats(){return{entries:this.entries.size,hits:this.hits,misses:this.misses};}
}



export function drawingGuard(screenSpeed=0){return Math.min(96,Math.max(18,Math.ceil(Math.abs(screenSpeed)*.15+12)));}
