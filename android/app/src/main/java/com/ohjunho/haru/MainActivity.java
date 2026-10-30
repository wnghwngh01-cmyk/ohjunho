package com.ohjunho.haru;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HaruWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
