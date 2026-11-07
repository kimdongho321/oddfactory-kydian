package com.oddfactory.kydian;
import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.*;
import android.content.*;
import android.content.res.Configuration;
import android.graphics.*;
import android.hardware.*;
import android.os.*;
import android.view.*;
import android.view.accessibility.AccessibilityEvent;
import android.webkit.JavascriptInterface;
import android.widget.*;
import org.json.*;
import java.util.*;
public final class PetOverlayService extends AccessibilityService implements SensorEventListener {
 public static volatile PetOverlayService current;
 private Session session;
 final class Session {
  RuntimeView view;
  String pendingBounds;boolean boundsQueued;
  boolean current(){return running&&session==this&&view!=null&&web==view;}
 }
 final Handler main=new Handler(Looper.getMainLooper());WindowManager manager;RuntimeView web;FrameLayout root;WindowManager.LayoutParams params;TouchTargets targets;Rect world;SensorManager sensors;Sensor sensor;AlertDialog menu;boolean running,ready,placed,awake,paused,registered,fallback,pageLoaded;long sent,lastSensorNs;int epoch,lastViewportEpoch=-1,boundsReports,badBounds;String lastFailure="none";final float[] filtered={0,0,9.81f};boolean filterReady;
 final BroadcastReceiver screen=new BroadcastReceiver(){public void onReceive(Context c,Intent i){visibility();}};
 protected void onServiceConnected(){current=this;manager=getSystemService(WindowManager.class);sensors=getSystemService(SensorManager.class);sensor=sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);if(sensor==null){sensor=sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);fallback=true;}AccessibilityServiceInfo info=getServiceInfo();info.eventTypes=0;setServiceInfo(info);if(getSharedPreferences("pet",0).getBoolean("enabled",false))startSession();MainActivity.overlayConnected(this);}
 public void startSession(){if(running){if(!placed)bootstrapWindow(true);viewport();visibility();return;}if(sensor==null)return;running=true;paused=false;ready=false;pageLoaded=false;placed=false;lastViewportEpoch=-1;boundsReports=badBounds=0;lastFailure="none";getSharedPreferences("pet",0).edit().putBoolean("enabled",true).apply();world=DisplayGeometry.world(manager);epoch++;foreground();
  Session origin=new Session();session=origin;Rect initial=StartupWindow.bounds(world,getResources().getDisplayMetrics().density);root=new FrameLayout(this);root.setClipChildren(true);root.setBackgroundColor(Color.TRANSPARENT);web=createRuntime(origin);root.addView(web,new FrameLayout.LayoutParams(world.width(),world.height()));params=new WindowManager.LayoutParams(initial.width(),initial.height(),WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);params.gravity=Gravity.TOP|Gravity.LEFT;params.setTitle("com.oddfactory.kydian.overlay");params.x=initial.left;params.y=initial.top;params.windowAnimations=0;if(Build.VERSION.SDK_INT>=30){params.setFitInsetsTypes(0);params.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;}else if(Build.VERSION.SDK_INT>=28)params.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;if(Build.VERSION.SDK_INT>=34)params.setCanPlayMoveAnimation(false);web.setTranslationX(world.left-initial.left);web.setTranslationY(world.top-initial.top);root.setVisibility(View.INVISIBLE);manager.addView(root,params);
  targets=new TouchTargets(this,manager,new TouchTargets.Listener(){public void contact(boolean value){if(web!=null)web.call("contact("+value+")");}public void pointer(String type,float x,float y,int id){if(web!=null)web.call("pointer('"+type+"',"+(x-world.left)+","+(y-world.top)+","+id+","+world.width()+","+world.height()+")");}public void menu(){showMenu(false);}});
  IntentFilter f=new IntentFilter();f.addAction(Intent.ACTION_SCREEN_ON);f.addAction(Intent.ACTION_SCREEN_OFF);f.addAction(Intent.ACTION_USER_PRESENT);if(Build.VERSION.SDK_INT>=33)registerReceiver(screen,f,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(screen,f);registered=true;web.loadUrl("https://"+RuntimeView.HOST+"/screen.html?overlay=1");visibility();
 }
 RuntimeView createRuntime(Session origin){
  RuntimeView view=new RuntimeView(this,new Host(origin),()->{if(!origin.current())return;pageLoaded=true;viewport();visibility();});
  origin.view=view;
  view.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,orr,ob)->{if(origin.current()&&v==origin.view&&ready&&(r-l!=orr-ol||b-t!=ob-ot))viewport();});
  return view;
 }
 void foreground(){NotificationManager n=getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel("pet",getString(R.string.app_name),NotificationManager.IMPORTANCE_LOW));PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);Notification notice=new Notification.Builder(this,"pet").setSmallIcon(android.R.drawable.star_on).setContentTitle(getString(R.string.pet_running)).setContentText("더블터치로 종료·설정 · 꾹 잡고 이동").setContentIntent(open).setOngoing(true).build();if(Build.VERSION.SDK_INT>=34)startForeground(26,notice,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);else startForeground(26,notice);}
 void viewport(){if(ready&&web!=null&&world!=null&&web.getWidth()==world.width()&&web.getHeight()==world.height()&&lastViewportEpoch!=epoch){lastViewportEpoch=epoch;web.call("viewport("+world.width()+","+world.height()+","+epoch+")");}}
 void bootstrapWindow(boolean attached){if(root==null||web==null||world==null||params==null)return;Rect initial=StartupWindow.bounds(world,getResources().getDisplayMetrics().density);params.x=initial.left;params.y=initial.top;params.width=initial.width();params.height=initial.height();web.setTranslationX(world.left-initial.left);web.setTranslationY(world.top-initial.top);if(attached)manager.updateViewLayout(root,params);root.setVisibility(awake?View.VISIBLE:View.INVISIBLE);}
 public void visibility(){if(!running||web==null)return;boolean next=getSystemService(PowerManager.class).isInteractive()&&!getSystemService(KeyguardManager.class).isKeyguardLocked()&&!MainActivity.visible;if(next==awake){root.setVisibility(awake?View.VISIBLE:View.INVISIBLE);if(targets!=null)targets.visible(awake&&ready&&placed&&menu==null&&!paused);return;}awake=next;if(!awake){if(targets!=null)targets.visible(false);closeMenu();web.call("visible(false)");web.onPause();sensors.unregisterListener(this);root.setVisibility(View.INVISIBLE);}else{filterReady=false;lastSensorNs=0;root.setVisibility(View.VISIBLE);web.onResume();web.call("visible(true)");web.call("pause("+paused+")");if(sensor!=null)sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_GAME);if(targets!=null)targets.visible(ready&&placed&&menu==null&&!paused);}}
 final class Host {
  final Session origin;
  Host(Session value){origin=value;}
  @JavascriptInterface public void ready(){main.post(()->{if(!origin.current())return;ready=true;lastViewportEpoch=-1;viewport();visibility();origin.view.call("visible("+awake+")");origin.view.call("pause("+paused+")");});}
  @JavascriptInterface public void onBounds(String encoded){
   if(encoded==null||encoded.length()>20000)return;
   synchronized(origin){origin.pendingBounds=encoded;if(origin.boundsQueued)return;origin.boundsQueued=true;}
   main.post(()->{String latest;synchronized(origin){latest=origin.pendingBounds;origin.pendingBounds=null;origin.boundsQueued=false;}
    if(!origin.current()||!ready||latest==null)return;
    try{JSONObject b=new JSONObject(latest);if(b.optInt("epoch",-1)!=epoch)return;double vw=b.getDouble("viewportWidth"),vh=b.getDouble("viewportHeight");Rect r=DisplayGeometry.bounds(b.getDouble("left"),b.getDouble("top"),b.getDouble("right"),b.getDouble("bottom"),vw,vh,world);if(r.isEmpty()){badBounds++;lastFailure="empty-bounds";return;}boundsReports++;lastFailure="none";double halfGuard=Math.max(0,b.optDouble("drawGuard",0)/2);Rect required=DisplayGeometry.bounds(b.getDouble("left")+halfGuard,b.getDouble("top")+halfGuard,b.getDouble("right")-halfGuard,b.getDouble("bottom")-halfGuard,vw,vh,world);Rect currentBounds=new Rect(params.x,params.y,params.x+params.width,params.y+params.height);if(!placed||!currentBounds.contains(required)){params.x=r.left;params.y=r.top;params.width=r.width();params.height=r.height();web.setTranslationX(world.left-r.left);web.setTranslationY(world.top-r.top);manager.updateViewLayout(root,params);}ArrayList<Rect> list=new ArrayList<>();JSONArray a=b.optJSONArray("targets");for(int i=0;a!=null&&i<Math.min(8,a.length());i++){JSONObject q=a.getJSONObject(i);Rect hit=DisplayGeometry.hitBounds(q.getDouble("x"),q.getDouble("y"),q.getDouble("x")+q.getDouble("width"),q.getDouble("y")+q.getDouble("height"),vw,vh,world);if(!hit.isEmpty())list.add(hit);}placed=true;root.setVisibility(awake?View.VISIBLE:View.INVISIBLE);targets.update(list);targets.visible(awake&&menu==null&&!paused);}catch(Exception error){badBounds++;lastFailure=error.getClass().getSimpleName();targets.update(Collections.emptyList());}
   });
  }
 }
 public void action(String name){if(web!=null)web.call("action('"+name+"')");}
 void closeMenu(){if(menu!=null){AlertDialog d=menu;menu=null;d.dismiss();}}
 void showMenu(boolean settings){if(!running||!awake)return;closeMenu();web.call("pause(true)");targets.visible(false);LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(AppUi.dp(this,16),AppUi.dp(this,8),AppUi.dp(this,16),AppUi.dp(this,16));box.setBackgroundColor(AppUi.BG);box.addView(AppUi.text(this,settings?"설정":getString(R.string.app_name),22,true));
  if(settings){add(box,"기준 잡기",()->action("calibrate"));add(box,"처음 위치로",()->action("reset"));add(box,paused?"움직임 재개":"움직임 잠시 멈춤",()->{paused=!paused;if(web!=null)web.call("pause("+paused+")");});add(box,"앱 설정 화면",()->startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));add(box,"돌아가기",()->main.post(()->showMenu(false)));}else{add(box,"종료",this::stopSession);add(box,"설정",()->main.post(()->showMenu(true)));}
  AlertDialog d=new AlertDialog.Builder(this).setView(box).create();d.getWindow().setType(WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY);d.setOnDismissListener(v->{if(menu==d)menu=null;if(running&&web!=null){web.call("pause("+paused+")");targets.visible(awake&&placed&&!paused);}});menu=d;d.show();d.getWindow().setLayout(Math.min(world.width()-AppUi.dp(this,32),AppUi.dp(this,320)),-2);AppUi.fonts(this,d.getWindow().getDecorView());}
 void add(LinearLayout box,String text,Runnable task){Button button=AppUi.button(this,text,false,()->{closeMenu();task.run();});LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=AppUi.dp(this,10);box.addView(button,p);}
 public void stopSession(){getSharedPreferences("pet",0).edit().putBoolean("enabled",false).apply();closeSession();}
 void closeSession(){session=null;running=false;ready=false;awake=false;closeMenu();main.removeCallbacksAndMessages(null);if(sensors!=null)sensors.unregisterListener(this);if(registered){unregisterReceiver(screen);registered=false;}if(targets!=null){targets.close();targets=null;}if(root!=null){try{manager.removeView(root);}catch(RuntimeException ignored){}root=null;}if(web!=null){web.stopLoading();web.destroy();web=null;}stopForeground(STOP_FOREGROUND_REMOVE);}
 public void onSensorChanged(SensorEvent e){
  if(!running||!ready||!awake||menu!=null||paused||web==null)return;
  for(int i=0;i<3;i++)if(!Float.isFinite(e.values[i]))return;
  double dt=lastSensorNs==0?0:Math.max(0,Math.min(.25,(e.timestamp-lastSensorNs)/1e9));lastSensorNs=e.timestamp;
  float alpha=(float)(1-Math.exp(-dt/.09));
  for(int i=0;i<3;i++)filtered[i]=!filterReady||!fallback?e.values[i]:filtered[i]+alpha*(e.values[i]-filtered[i]);filterReady=true;
  long now=SystemClock.elapsedRealtime();if(now-sent<33)return;sent=now;
  float[] g=DisplayGeometry.gravity(filtered[0],filtered[1],filtered[2],manager.getDefaultDisplay().getRotation());web.call("gravity("+g[0]+","+g[1]+","+g[2]+","+manager.getDefaultDisplay().getRotation()+")");
 }
 public void onAccuracyChanged(Sensor sensor,int value){}
 public void onConfigurationChanged(Configuration c){super.onConfigurationChanged(c);if(!running||web==null)return;targets.visible(false);targets.update(Collections.emptyList());placed=false;closeMenu();web.call("cancel()");world=DisplayGeometry.world(manager);epoch++;lastViewportEpoch=-1;web.setLayoutParams(new FrameLayout.LayoutParams(world.width(),world.height()));bootstrapWindow(true);viewport();filterReady=false;}
 public void onAccessibilityEvent(AccessibilityEvent e){}
 public void onInterrupt(){closeSession();}
 protected void dump(java.io.FileDescriptor fd,java.io.PrintWriter out,String[] args){
  out.println("kydian connected="+(current==this)+" running="+running+" pageLoaded="+pageLoaded+" runtimeReady="+ready+" placed="+placed+" awake="+awake+" paused="+paused+" epoch="+epoch+" viewportEpoch="+lastViewportEpoch);
  out.println("window="+(params==null?"absent":params.x+","+params.y+","+params.width+","+params.height)+" world="+(world==null?"absent":world.toShortString())+" rootVisibility="+(root==null?-1:root.getVisibility())+" attached="+(root!=null&&root.isAttachedToWindow())+" webSize="+(web==null?"absent":web.getWidth()+","+web.getHeight()));
  out.println("boundsReports="+boundsReports+" badBounds="+badBounds+" lastFailure="+lastFailure+" inputWindows="+(targets==null?0:targets.layouts.stream().filter(java.util.Objects::nonNull).count()));
 }
 public void onDestroy(){closeSession();current=null;super.onDestroy();}
}
