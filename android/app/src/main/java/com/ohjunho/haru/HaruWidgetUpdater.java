package com.ohjunho.haru;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

final class HaruWidgetUpdater {
    private HaruWidgetUpdater() {}

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] protein=manager.getAppWidgetIds(new ComponentName(context,ProteinWidgetProvider.class)),budget=manager.getAppWidgetIds(new ComponentName(context,BudgetWidgetProvider.class)),events=manager.getAppWidgetIds(new ComponentName(context,EventWidgetProvider.class)),todos=manager.getAppWidgetIds(new ComponentName(context,TodoWidgetProvider.class)),habits=manager.getAppWidgetIds(new ComponentName(context,HabitWidgetProvider.class));
        ProteinWidgetProvider.update(context,manager,protein);BudgetWidgetProvider.update(context,manager,budget);EventWidgetProvider.update(context,manager,events);TodoWidgetProvider.update(context,manager,todos);HabitWidgetProvider.update(context,manager,habits);
        for(int[] ids:new int[][]{protein,budget,events,todos,habits})if(ids.length>0)manager.notifyAppWidgetViewDataChanged(ids,R.id.widget_root);
    }
}
