package com.ohjunho.haru;
import android.appwidget.AppWidgetManager; import android.appwidget.AppWidgetProvider; import android.content.Context; import org.json.JSONObject;
public class TodoWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){update(c,m,ids);}
    static void update(Context c,AppWidgetManager m,int[] ids){JSONObject s=HaruWidgetStore.read(c);for(int id:ids)m.updateAppWidget(id,HaruWidgetViews.list(c,s,id,"todos"));}
}
