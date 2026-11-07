package com.oddfactory.kydian;
import android.os.Build;
import android.graphics.Rect;
import android.util.DisplayMetrics;
import android.view.*;
final class DisplayGeometry {
 static Rect world(WindowManager wm){if(Build.VERSION.SDK_INT>=30)return new Rect(wm.getMaximumWindowMetrics().getBounds());DisplayMetrics m=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(m);return new Rect(0,0,m.widthPixels,m.heightPixels);}
 static float[] gravity(float x,float y,float z,int rotation){if(rotation==Surface.ROTATION_90)return new float[]{-y,x,z};if(rotation==Surface.ROTATION_180)return new float[]{-x,-y,z};if(rotation==Surface.ROTATION_270)return new float[]{y,-x,z};return new float[]{x,y,z};}
 static Rect bounds(double l,double t,double r,double b,double vw,double vh,Rect w){if(!Double.isFinite(vw)||!Double.isFinite(vh)||vw<=0||vh<=0||!Double.isFinite(l)||!Double.isFinite(t)||!Double.isFinite(r)||!Double.isFinite(b))throw new IllegalArgumentException();int x=(int)Math.max(0,Math.min(w.width(),Math.floor(l*w.width()/vw))),y=(int)Math.max(0,Math.min(w.height(),Math.floor(t*w.height()/vh)));int right=(int)Math.max(x,Math.min(w.width(),Math.ceil(r*w.width()/vw))),bottom=(int)Math.max(y,Math.min(w.height(),Math.ceil(b*w.height()/vh)));return new Rect(w.left+x,w.top+y,w.left+right,w.top+bottom);}
 static Rect hitBounds(double l,double t,double r,double b,double vw,double vh,Rect w){Rect box=bounds(l,t,r,b,vw,vh,w);box.left=Math.max(box.left,w.left+(int)Math.ceil(l*w.width()/vw));box.top=Math.max(box.top,w.top+(int)Math.ceil(t*w.height()/vh));box.right=Math.min(box.right,w.left+(int)Math.floor(r*w.width()/vw));box.bottom=Math.min(box.bottom,w.top+(int)Math.floor(b*w.height()/vh));return box;}
}
