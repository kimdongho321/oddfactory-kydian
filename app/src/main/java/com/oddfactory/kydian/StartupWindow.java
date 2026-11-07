package com.oddfactory.kydian;
import android.graphics.Rect;
/** Bounded NOT_TOUCHABLE bootstrap while the full measured child reports its first frame. */
final class StartupWindow {
 static Rect bounds(Rect world,float density){
  int width=Math.max(1,Math.min(world.width(),Math.round(256*density)));
  int height=Math.max(1,Math.min(world.height(),Math.round(256*density)));
  int left=world.left+(world.width()-width)/2,top=world.top+(world.height()-height)/2;
  return new Rect(left,top,left+width,top+height);
 }
}
