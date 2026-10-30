package com.ohjunho.haru;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class HaruWidgetStore {
    static final String PREFS = "haru_widget_snapshot";
    static final String KEY_SNAPSHOT = "snapshot";
    static final String KEY_PENDING = "pending_writes";
    private static final String TAG = "HaruWidgets";
    private static final ExecutorService NETWORK = Executors.newSingleThreadExecutor();

    private HaruWidgetStore() {}

    static synchronized JSONObject read(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, "{}");
        try { return new JSONObject(raw == null ? "{}" : raw); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    static synchronized void write(Context context, JSONObject snapshot) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SNAPSHOT, snapshot.toString()).apply();
    }

    static synchronized JSONObject addProteinLocal(Context context, double grams, String label) {
        JSONObject snapshot = read(context);
        String id = UUID.randomUUID().toString();
        try {
            snapshot.put("proteinTotal", snapshot.optDouble("proteinTotal", 0) + grams);
            snapshot.put("updatedAt", System.currentTimeMillis());
        } catch (Exception ignored) {}
        write(context, snapshot);
        postUpsert(context, snapshot, "protein_logs", json(
            "id", id, "user_id", snapshot.optString("userId"), "log_date", snapshot.optString("day"),
            "label", label == null ? "" : label, "grams", grams));
        return snapshot;
    }

    static synchronized JSONObject addTodoLocal(Context context, String title) {
        JSONObject snapshot = read(context);
        JSONArray rows = snapshot.optJSONArray("todos"); if (rows == null) rows = new JSONArray();
        String id = UUID.randomUUID().toString(); JSONObject row = json("id", id, "title", title, "completed", false);
        JSONArray next = new JSONArray(); next.put(row); for (int i = 0; i < rows.length(); i++) next.put(rows.opt(i));
        put(snapshot, "todos", next); write(context, snapshot);
        postUpsert(context, snapshot, "daily_todos", json("id", id, "user_id", snapshot.optString("userId"), "todo_date", snapshot.optString("day"), "title", title, "completed", false));
        return snapshot;
    }

    static synchronized JSONObject addFinanceLocal(Context context, String category, long amount, String title) {
        JSONObject snapshot = read(context); JSONObject budget = snapshot.optJSONObject("budget");
        if (budget != null) {
            JSONArray categories = budget.optJSONArray("categories"); boolean assigned = false;
            if (categories != null) for (int i = 0; i < categories.length(); i++) {
                JSONObject item = categories.optJSONObject(i); if (item == null || !category.equals(item.optString("category"))) continue;
                assigned = true; double used = item.optDouble("used") + amount, limit = item.optDouble("budget");
                put(item, "used", used); put(item, "remaining", limit - used); put(item, "percent", limit > 0 ? Math.min(100, used / limit * 100) : used > 0 ? 100 : 0);
            }
            if (assigned) put(budget, "remaining", budget.optDouble("remaining") - amount);
            else put(budget, "unbudgeted", budget.optDouble("unbudgeted") + amount);
        }
        write(context, snapshot);
        postUpsert(context, snapshot, "finance_transactions", json("id", UUID.randomUUID().toString(), "user_id", snapshot.optString("userId"), "tx_type", "expense", "amount", amount, "title", title, "category", category, "tx_date", snapshot.optString("day")));
        return snapshot;
    }

    static synchronized JSONObject toggleLocal(Context context, String kind, String id, boolean completed) {
        JSONObject snapshot = read(context); String arrayKey = "todo".equals(kind) ? "todos" : "event".equals(kind) ? "events" : "habits";
        String field = "event".equals(kind) ? "done" : "completed"; JSONArray rows = snapshot.optJSONArray(arrayKey);
        if (rows != null) for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i); if (row == null || !id.equals(row.optString("id"))) continue;
            boolean old = row.optBoolean(field); put(row, field, completed);
            if ("habit".equals(kind) && old != completed) put(row, "weekCompleted", Math.max(0, row.optInt("weekCompleted") + (completed ? 1 : -1)));
            break;
        }
        write(context, snapshot);
        if (!id.startsWith("local-")) {
            if ("todo".equals(kind)) patch(context, snapshot, "daily_todos", id, json("completed", completed));
            else if ("event".equals(kind)) patch(context, snapshot, "events", id, json("done", completed));
            else upsertHabit(context, snapshot, id, completed);
        }
        return snapshot;
    }

    private static void upsertHabit(Context context, JSONObject snapshot, String habitId, boolean completed) {
        JSONObject body = json("user_id", snapshot.optString("userId"), "habit_id", habitId, "day", snapshot.optString("day"), "completed", completed);
        request(context, snapshot, "POST", "habit_checks?on_conflict=habit_id,day", body, "resolution=merge-duplicates,return=minimal");
    }

    private static void patch(Context context, JSONObject snapshot, String table, String id, JSONObject body) {
        String path = table + "?id=eq." + Uri.encode(id) + "&user_id=eq." + Uri.encode(snapshot.optString("userId"));
        request(context, snapshot, "PATCH", path, body, "return=minimal");
    }

    private static void postUpsert(Context context, JSONObject snapshot, String table, JSONObject body) {
        request(context, snapshot, "POST", table + "?on_conflict=id", body, "resolution=merge-duplicates,return=minimal");
    }

    private static void request(Context context, JSONObject snapshot, String method, String path, JSONObject body, String prefer) {
        String pendingId = UUID.randomUUID().toString(); JSONObject pending = json("id", pendingId, "method", method, "path", path, "body", body, "prefer", prefer); addPending(context, pending);
        String url = snapshot.optString("supabaseUrl"), key = snapshot.optString("supabaseKey"), token = snapshot.optString("accessToken");
        if (url.isEmpty() || key.isEmpty() || token.isEmpty() || snapshot.optString("userId").isEmpty()) return;
        NETWORK.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(url + "/rest/v1/" + path).openConnection();
                connection.setRequestMethod(method); connection.setConnectTimeout(5000); connection.setReadTimeout(5000); connection.setDoOutput(true);
                connection.setRequestProperty("apikey", key); connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Prefer", prefer);
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8); connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
                int code = connection.getResponseCode(); if (code >= 200 && code < 300) completePending(context, pendingId); else Log.w(TAG, "Supabase widget write failed: " + code);
            } catch (Exception error) { Log.w(TAG, "Supabase widget write deferred", error); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }

    static synchronized JSONArray pending(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PENDING, "[]");
        try { return new JSONArray(raw == null ? "[]" : raw); } catch (Exception ignored) { return new JSONArray(); }
    }

    private static synchronized void addPending(Context context, JSONObject item) {
        JSONArray rows = pending(context); rows.put(item); context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PENDING, rows.toString()).apply();
    }

    static synchronized void completePending(Context context, String id) {
        JSONArray rows = pending(context), next = new JSONArray();
        for (int i = 0; i < rows.length(); i++) { JSONObject row = rows.optJSONObject(i); if (row != null && !id.equals(row.optString("id"))) next.put(row); }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PENDING, next.toString()).apply();
    }

    static JSONObject json(Object... pairs) {
        JSONObject object = new JSONObject();
        for (int i = 0; i + 1 < pairs.length; i += 2) put(object, String.valueOf(pairs[i]), pairs[i + 1]);
        return object;
    }

    static void put(JSONObject object, String key, Object value) { try { object.put(key, value); } catch (Exception ignored) {} }
}
