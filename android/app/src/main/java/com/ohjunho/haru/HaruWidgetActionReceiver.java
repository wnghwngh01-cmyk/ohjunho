package com.ohjunho.haru;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class HaruWidgetActionReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getStringExtra("action"); if (action == null) return;
        if ("protein_add".equals(action)) HaruWidgetStore.addProteinLocal(context, Double.parseDouble(intent.getStringExtra("grams")), "빠른 +" + intent.getStringExtra("grams") + "g");
        else if (action.endsWith("_toggle")) {
            String kind = action.substring(0, action.indexOf('_'));
            HaruWidgetStore.toggleLocal(context, kind, intent.getStringExtra("id"), Boolean.parseBoolean(intent.getStringExtra("completed")));
        }
        HaruWidgetUpdater.updateAll(context);
    }
}
