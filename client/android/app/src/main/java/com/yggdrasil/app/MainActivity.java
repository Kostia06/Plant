package com.yggdrasil.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.yggdrasil.app.plugins.appblocker.AppBlockerPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppBlockerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
