package com.ohjunho.haru;
import android.appwidget.AppWidgetManager; import android.appwidget.AppWidgetProvider; import android.content.Context; import android.os.Bundle; import org.json.JSONObject;
public class BudgetWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){update(c,m,ids);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle o){update(c,m,new int[]{id});}
    static void update(Context c,AppWidgetManager m,int[] ids){JSONObject s=HaruWidgetStore.read(c);for(int id:ids){Bundle o=m.getAppWidgetOptions(id);boolean large=o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)>=250&&o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)>=180;m.updateAppWidget(id,HaruWidgetViews.budget(c,s,id,large));}}
}
