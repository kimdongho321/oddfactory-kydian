package com.oddfactory.kydian;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
final class AppUi {
 static final int INK=0xff392f43,BG=0xfff8f4fc,ACCENT=0xff705385;
 static int dp(Context c,float n){return Math.round(n*c.getResources().getDisplayMetrics().density);}
 private static Typeface mapleLight,mapleBold;
 static synchronized Typeface font(Context c,boolean bold){if(bold){if(mapleBold==null)mapleBold=Typeface.createFromAsset(c.getAssets(),"fonts/Maplestory-Bold.ttf");return mapleBold;}if(mapleLight==null)mapleLight=Typeface.createFromAsset(c.getAssets(),"fonts/Maplestory-Light.ttf");return mapleLight;}
 static TextView text(Context c,String s,int size,boolean bold){TextView v=new TextView(c);v.setText(s);v.setTextSize(size);v.setTextColor(INK);v.setTypeface(font(c,bold));return v;}
 static Button button(Context c,String s,boolean primary,Runnable action){Button v=new Button(c);v.setText(s);v.setAllCaps(false);v.setTextSize(primary?22:16);v.setTypeface(font(c,primary));v.setTextColor(primary?-1:INK);v.setMinHeight(dp(c,primary?64:48));GradientDrawable bg=new GradientDrawable();bg.setColor(primary?ACCENT:0xffeee6f3);bg.setCornerRadius(dp(c,16));v.setBackground(bg);v.setPadding(dp(c,16),dp(c,10),dp(c,16),dp(c,10));v.setOnClickListener(w->action.run());return v;}
 static void fonts(Context c,View v){if(v instanceof TextView)((TextView)v).setTypeface(font(c,v instanceof Button));if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++)fonts(c,g.getChildAt(i));}}
}
