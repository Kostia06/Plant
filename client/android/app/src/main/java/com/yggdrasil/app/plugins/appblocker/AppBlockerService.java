package com.yggdrasil.app.plugins.appblocker;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

public class AppBlockerService {

    private static final String PREFS_NAME = "app_blocker_prefs";
    private static final String KEY_BLOCKED_APPS = "blocked_apps";

    private final Context context;
    private final SharedPreferences prefs;
    private final Handler handler;
    private Runnable monitorRunnable;
    private boolean isMonitoring = false;

    public interface BlockedAppCallback {
        void onAppBlocked(String packageName);
    }

    public AppBlockerService(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.handler = new Handler(Looper.getMainLooper());
    }

    public void setBlockedApps(List<String> packages) {
        Set<String> set = new HashSet<>(packages);
        prefs.edit().putStringSet(KEY_BLOCKED_APPS, set).apply();
    }

    public List<String> getBlockedApps() {
        Set<String> set = prefs.getStringSet(KEY_BLOCKED_APPS, new HashSet<>());
        return new ArrayList<>(set);
    }

    public void startMonitoring(int intervalMs, BlockedAppCallback callback) {
        if (isMonitoring) {
            stopMonitoring();
        }

        isMonitoring = true;
        Set<String> blockedApps = prefs.getStringSet(KEY_BLOCKED_APPS, new HashSet<>());

        monitorRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isMonitoring) return;

                String foreground = getForegroundPackage();
                if (foreground != null && blockedApps.contains(foreground)) {
                    callback.onAppBlocked(foreground);
                }

                handler.postDelayed(this, intervalMs);
            }
        };

        handler.post(monitorRunnable);
    }

    public void stopMonitoring() {
        isMonitoring = false;
        if (monitorRunnable != null) {
            handler.removeCallbacks(monitorRunnable);
            monitorRunnable = null;
        }
    }

    public JSArray getAppUsageStats(int daysBack) {
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        Calendar calendar = Calendar.getInstance();
        long endTime = calendar.getTimeInMillis();
        calendar.add(Calendar.DAY_OF_YEAR, -daysBack);
        long startTime = calendar.getTimeInMillis();

        Map<String, UsageStats> statsMap = usm.queryAndAggregateUsageStats(startTime, endTime);
        JSArray result = new JSArray();

        if (statsMap == null) return result;

        for (Map.Entry<String, UsageStats> entry : statsMap.entrySet()) {
            UsageStats stats = entry.getValue();
            if (stats.getTotalTimeInForeground() == 0) continue;

            JSObject obj = new JSObject();
            obj.put("packageName", stats.getPackageName());
            obj.put("totalTimeMs", stats.getTotalTimeInForeground());
            obj.put("lastUsed", stats.getLastTimeUsed());
            result.put(obj);
        }

        return result;
    }

    public JSArray getInstalledApps() {
        PackageManager pm = context.getPackageManager();
        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        JSArray result = new JSArray();

        for (ApplicationInfo app : apps) {
            if (pm.getLaunchIntentForPackage(app.packageName) == null) continue;

            JSObject obj = new JSObject();
            obj.put("packageName", app.packageName);
            obj.put("appName", pm.getApplicationLabel(app).toString());
            obj.put("isSystem", (app.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
            result.put(obj);
        }

        return result;
    }

    private String getForegroundPackage() {
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        long endTime = System.currentTimeMillis();
        long startTime = endTime - 10_000;

        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
        if (stats == null || stats.isEmpty()) return null;

        SortedMap<Long, UsageStats> sorted = new TreeMap<>();
        for (UsageStats stat : stats) {
            sorted.put(stat.getLastTimeUsed(), stat);
        }

        if (sorted.isEmpty()) return null;
        return sorted.get(sorted.lastKey()).getPackageName();
    }
}
