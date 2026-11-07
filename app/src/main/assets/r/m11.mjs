import {advanceRollingMotion,rollRate} from './m2.mjs';


















export function advanceRollingFrame(body,gx,gy,elapsedMs,renderScale=1,{maxCatchupMs=250}={}){
 if(![body.x,body.y,body.vx,body.vy,gx,gy,elapsedMs,renderScale,maxCatchupMs].every(Number.isFinite)||
  elapsedMs<0||renderScale<=0||maxCatchupMs<=0)throw Error('finite-positive-rolling-frame-input-required');
 const dt=Math.min(elapsedMs,maxCatchupMs),speed=advanceRollingMotion(body,gx,gy,dt,renderScale);
 return{dt,discardedMs:elapsedMs-dt,speed};
}






export function rollingPhaseIncrement(dt,speed,renderScale=1,cellMs=60){
 if(![dt,speed,renderScale,cellMs].every(Number.isFinite)||dt<0||speed<0||renderScale<=0||cellMs<=0)
  throw Error('finite-positive-rolling-phase-input-required');
 return Math.min(dt*Math.max(.35,rollRate(speed,renderScale)),cellMs);
}
