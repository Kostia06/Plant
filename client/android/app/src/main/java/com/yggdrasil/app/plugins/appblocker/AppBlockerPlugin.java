package com.yggdrasil.app.plugins.appblocker;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private AppBlockerService service;

    @Override
    public void load() {
        service = new AppBlockerService(getContext());
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = hasUsageStatsPermission();
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (hasUsageStatsPermission()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject result = new JSObject();
        result.put("granted", false);
        result.put("message", "Redirected to usage access settings");
        call.resolve(result);
    }

    @PluginMethod
    public void setBlockedApps(PluginCall call) {
        JSArray apps = call.getArray("packages");
        if (apps == null) {
            call.reject("Missing 'packages' parameter");
            return;
        }

        try {
            List<String> packageList = new ArrayList<>();
            for (int i = 0; i < apps.length(); i++) {
                packageList.add(apps.getString(i));
            }
            service.setBlockedApps(packageList);
            call.resolve();
        } catch (JSONException e) {
            call.reject("Invalid packages array", e);
        }
    }

    @PluginMethod
    public void getBlockedApps(PluginCall call) {
        List<String> blocked = service.getBlockedApps();
        JSObject result = new JSObject();
        JSArray array = new JSArray(blocked);
        result.put("packages", array);
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }

        int intervalMs = call.getInt("intervalMs", 5000);
        service.startMonitoring(intervalMs, (foregroundPackage) -> {
            JSObject event = new JSObject();
            event.put("package", foregroundPackage);
            event.put("timestamp", System.currentTimeMillis());
            notifyListeners("appBlocked", event);
        });

        call.resolve();
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        service.stopMonitoring();
        call.resolve();
    }

    @PluginMethod
    public void getAppUsageStats(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }

        int daysBack = call.getInt("daysBack", 1);
        JSArray stats = service.getAppUsageStats(daysBack);
        JSObject result = new JSObject();
        result.put("stats", stats);
        call.resolve(result);
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        JSArray apps = service.getInstalledApps();
        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    private boolean hasUsageStatsPermission() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }
}
