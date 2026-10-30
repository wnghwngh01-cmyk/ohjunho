package com.ohjunho.haru;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "HaruWidget")
public class HaruWidgetPlugin extends Plugin {
    @PluginMethod public void sync(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot"); if (snapshot == null) { call.reject("snapshot is required"); return; }
        HaruWidgetStore.write(getContext(), snapshot); HaruWidgetUpdater.updateAll(getContext()); call.resolve();
    }

    @PluginMethod public void pending(PluginCall call) { JSObject result=new JSObject(); result.put("writes",HaruWidgetStore.pending(getContext())); call.resolve(result); }
    @PluginMethod public void completePending(PluginCall call) { String id=call.getString("id"); if(id!=null)HaruWidgetStore.completePending(getContext(),id); call.resolve(); }

    @PluginMethod public void requestPin(PluginCall call) {
        String type = call.getString("type", "todo"); JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { result.put("supported", false); result.put("requested", false); call.resolve(result); return; }
        Class<?> provider = "protein".equals(type)?ProteinWidgetProvider.class:"budget".equals(type)?BudgetWidgetProvider.class:"events".equals(type)?EventWidgetProvider.class:"habits".equals(type)?HabitWidgetProvider.class:TodoWidgetProvider.class;
        AppWidgetManager manager=AppWidgetManager.getInstance(getContext()); boolean supported=manager.isRequestPinAppWidgetSupported(),requested=supported&&manager.requestPinAppWidget(new ComponentName(getContext(),provider),null,null);
        result.put("supported",supported);result.put("requested",requested);call.resolve(result);
    }
}
