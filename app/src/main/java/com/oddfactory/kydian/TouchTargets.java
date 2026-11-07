package com.oddfactory.kydian;
import android.content.Context;
import android.graphics.*;
import android.view.*;
import java.util.*;
final class TouchTargets {
 interface Listener {void contact(boolean value);void pointer(String type,float x,float y,int id);void menu();}
 final Context context;final WindowManager wm;final Listener listener;final GestureDetector detector;final ArrayList<View> views=new ArrayList<>();final ArrayList<WindowManager.LayoutParams> layouts=new ArrayList<>();List<Rect> wanted=new ArrayList<>();boolean visible,active,held,suppress;float startX,startY;int pointer;final int slop;
 TouchTargets(Context c,WindowManager w,Listener l){context=c;wm=w;listener=l;slop=ViewConfiguration.get(c).getScaledTouchSlop();detector=new GestureDetector(c,new GestureDetector.SimpleOnGestureListener(){public boolean onDown(MotionEvent e){return true;}public void onLongPress(MotionEvent e){beginHold();}public boolean onSingleTapConfirmed(MotionEvent e){listener.contact(false);return true;}public boolean onDoubleTap(MotionEvent e){suppress=true;held=false;listener.menu();return true;}});}
 void beginHold(){if(!active||held||suppress)return;held=true;listener.contact(false);listener.pointer("down",startX,startY,pointer);}
 boolean touch(MotionEvent e){int a=e.getActionMasked();if(!visible)return true;if(e.getPointerCount()!=1||a==MotionEvent.ACTION_POINTER_DOWN){cancel();suppress=true;return true;}if(suppress){if(a==MotionEvent.ACTION_UP||a==MotionEvent.ACTION_CANCEL){suppress=false;active=false;apply();}return true;}
  if(a==MotionEvent.ACTION_DOWN){active=true;held=false;startX=e.getRawX();startY=e.getRawY();pointer=e.getPointerId(0);listener.contact(true);}
  if(a==MotionEvent.ACTION_MOVE&&active){if(!held&&Math.hypot(e.getRawX()-startX,e.getRawY()-startY)>slop)beginHold();if(held)listener.pointer("move",e.getRawX(),e.getRawY(),pointer);}
  MotionEvent raw=MotionEvent.obtain(e);raw.offsetLocation(e.getRawX()-e.getX(),e.getRawY()-e.getY());detector.onTouchEvent(raw);raw.recycle();
  if(a==MotionEvent.ACTION_UP){if(held){listener.pointer("up",e.getRawX(),e.getRawY(),pointer);listener.contact(false);}held=false;active=false;apply();}
  else if(a==MotionEvent.ACTION_CANCEL)cancel();return true;
 }
 void update(List<Rect> rects){wanted=new ArrayList<>(rects.subList(0,Math.min(8,rects.size())));if(!active)apply();}
 void visible(boolean value){if(visible==value)return;visible=value;if(!value)cancel();apply();}
 void cancel(){if(held)listener.pointer("cancel",startX,startY,pointer);held=false;active=false;listener.contact(false);MotionEvent e=MotionEvent.obtain(android.os.SystemClock.uptimeMillis(),android.os.SystemClock.uptimeMillis(),MotionEvent.ACTION_CANCEL,0,0,0);detector.onTouchEvent(e);e.recycle();}
 void apply(){for(int i=0;i<8;i++){boolean use=visible&&i<wanted.size();if(i>=views.size()){View v=new View(context);v.setBackgroundColor(Color.TRANSPARENT);v.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);v.setOnTouchListener((view,e)->touch(e));views.add(v);layouts.add(null);}View v=views.get(i);WindowManager.LayoutParams old=layouts.get(i);if(!use){if(old!=null){try{wm.removeView(v);}catch(RuntimeException ignored){}layouts.set(i,null);}continue;}Rect r=wanted.get(i);if(r.isEmpty())continue;WindowManager.LayoutParams p=new WindowManager.LayoutParams(r.width(),r.height(),WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);p.gravity=Gravity.TOP|Gravity.LEFT;p.setTitle("com.oddfactory.kydian.input."+i);p.x=r.left;p.y=r.top;p.windowAnimations=0;if(android.os.Build.VERSION.SDK_INT>=30)p.setFitInsetsTypes(0);if(android.os.Build.VERSION.SDK_INT>=28)p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;if(android.os.Build.VERSION.SDK_INT>=30)p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;if(android.os.Build.VERSION.SDK_INT>=34)p.setCanPlayMoveAnimation(false);if(old==null)wm.addView(v,p);else if(old.x!=p.x||old.y!=p.y||old.width!=p.width||old.height!=p.height)wm.updateViewLayout(v,p);layouts.set(i,p);}}
 void close(){visible(false);wanted.clear();apply();}
}
