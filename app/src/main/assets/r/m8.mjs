export class Clock {
 constructor(){this.time=0;this.wall=performance.now();this.flags={visible:true,manual:false,contact:false};}
 get running(){return this.flags.visible&&!this.flags.manual&&!this.flags.contact;}
 sample(at=performance.now()){if(this.running)this.time+=Math.max(0,at-this.wall);this.wall=at;return this.time;}
 now(){return this.sample();}
 set(key,value){this.sample();this.flags[key]=!!value;this.wall=performance.now();}
}
export function physicalPoint(x,y,width,height,worldWidth,worldHeight){
 if(![x,y,width,height,worldWidth,worldHeight].every(Number.isFinite)||width<=0||height<=0||worldWidth<=0||worldHeight<=0)throw Error('Invalid display coordinates');
 return{x:x*worldWidth/width,y:y*worldHeight/height};
}
export function rotateVector(vector,from,to){let {x,y}=vector;for(let i=0;i<(to-from+4)%4;i++)[x,y]=[-y,x];return{x,y};}
export function opaqueRectangles(input,width,height,limit=8,minSide=3){
 const work=input.slice(),heights=new Int32Array(width),stack=new Int32Array(width+1),result=[];
 for(let n=0;n<limit;n++){let best=null,area=0;heights.fill(0);
  for(let y=0;y<height;y++){for(let x=0;x<width;x++)heights[x]=work[y*width+x]?heights[x]+1:0;let top=0;
   for(let x=0;x<=width;x++){const h=x===width?0:heights[x];while(top&&heights[stack[top-1]]>h){const hh=heights[stack[--top]],left=top?stack[top-1]+1:0,ww=x-left;if(ww>=minSide&&hh>=minSide&&ww*hh>area){area=ww*hh;best={x:left,y:y-hh+1,width:ww,height:hh};}}stack[top++]=x;}}
  if(!best)break;result.push(best);for(let y=best.y;y<best.y+best.height;y++)work.fill(0,y*width+best.x,y*width+best.x+best.width);
 }return result;
}
