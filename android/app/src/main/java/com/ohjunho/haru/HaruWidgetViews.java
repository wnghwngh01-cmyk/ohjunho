package com.ohjunho.haru;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.style.ForegroundColorSpan;
import android.text.style.StrikethroughSpan;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

final class HaruWidgetViews {
    private static final int FOREST = Color.parseColor("#214838"), DANGER = Color.parseColor("#A23F43");
    private static final int LIGHT_TEXT = Color.parseColor("#1B1C1A"), LIGHT_MUTED = Color.parseColor("#6B6D69");
    private static final int DARK_TEXT = Color.parseColor("#EDF3EF"), DARK_MUTED = Color.parseColor("#AAB7AE");
    private static final int[] ROWS = {R.id.row1, R.id.row2, R.id.row3};
    private static final int[] CHECKS = {R.id.row1_check, R.id.row2_check, R.id.row3_check};
    private static final int[] TEXTS = {R.id.row1_text, R.id.row2_text, R.id.row3_text};
    private static final int[] METAS = {R.id.row1_meta, R.id.row2_meta, R.id.row3_meta};
    private static final int[] DIVIDERS = {R.id.divider1, R.id.divider2};
    private static final int[] BUDGET_ROWS = {R.id.budget_row1, R.id.budget_row2, R.id.budget_row3};
    private static final int[] BUDGET_NAMES = {R.id.budget_row1_name, R.id.budget_row2_name, R.id.budget_row3_name};
    private static final int[] BUDGET_AMOUNTS = {R.id.budget_row1_amount, R.id.budget_row2_amount, R.id.budget_row3_amount};
    private static final int[] BUDGET_PROGRESS = {R.id.budget_row1_progress, R.id.budget_row2_progress, R.id.budget_row3_progress};
    private static final int[] BUDGET_PROGRESS_DANGER = {R.id.budget_row1_progress_danger, R.id.budget_row2_progress_danger, R.id.budget_row3_progress_danger};
    private static final int[] BUDGET_METAS = {R.id.budget_row1_meta, R.id.budget_row2_meta, R.id.budget_row3_meta};

    private HaruWidgetViews() {}

    static RemoteViews protein(Context context, JSONObject snapshot, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_protein_small);
        boolean dark = isDark(snapshot); theme(context, views, dark, new int[]{R.id.widget_title, R.id.protein_total}, new int[]{R.id.protein_caption});
        views.setTextViewText(R.id.protein_total, "오늘 " + decimal(snapshot.optDouble("proteinTotal")) + " g");
        views.setOnClickPendingIntent(R.id.protein_add10, action(context, widgetId, "protein_add", "grams", "10"));
        views.setOnClickPendingIntent(R.id.protein_add20, action(context, widgetId, "protein_add", "grams", "20"));
        views.setOnClickPendingIntent(R.id.protein_input, dialog(context, widgetId, "protein"));
        views.setOnClickPendingIntent(R.id.widget_title, openApp(context, widgetId));
        if (dark) {
            views.setInt(R.id.protein_add10, "setBackgroundResource", R.drawable.widget_button_dark);
            views.setInt(R.id.protein_add20, "setBackgroundResource", R.drawable.widget_button_dark);
            views.setTextColor(R.id.protein_add10, DARK_TEXT); views.setTextColor(R.id.protein_add20, DARK_TEXT);
        }
        return views;
    }

    static RemoteViews budget(Context context, JSONObject snapshot, int widgetId, boolean large) {
        JSONObject budget = snapshot.optJSONObject("budget"); boolean dark = isDark(snapshot), configured = budget != null && budget.optBoolean("configured");
        double remaining = budget == null ? 0 : budget.optDouble("remaining"); int layout = large ? R.layout.widget_budget_large : R.layout.widget_budget_small;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        int color = configured && remaining < 0 ? DANGER : FOREST;
        views.setTextViewText(R.id.budget_remaining, configured ? money(Math.abs(remaining)) + (remaining < 0 ? " 초과" : " 남음") : "예산 미설정");
        views.setTextColor(R.id.budget_remaining, color); views.setOnClickPendingIntent(R.id.budget_add, dialog(context, widgetId, "finance"));
        theme(context, views, dark, large ? new int[]{R.id.budget_remaining} : new int[]{R.id.widget_title}, new int[]{R.id.budget_caption});
        views.setTextColor(R.id.budget_remaining, color);
        if (dark) { views.setInt(R.id.budget_add, "setBackgroundResource", R.drawable.widget_button_dark); views.setTextColor(R.id.budget_add, DARK_TEXT); }
        if (large) renderBudgetRows(views, budget == null ? null : budget.optJSONArray("categories"), dark);
        return views;
    }

    static RemoteViews list(Context context, JSONObject snapshot, int widgetId, String kind) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_list_medium); boolean dark = isDark(snapshot);
        JSONArray rows = snapshot.optJSONArray("events".equals(kind) ? "events" : "todos".equals(kind) ? "todos" : "habits");
        if ("events".equals(kind)) {
            views.setTextViewText(R.id.widget_title, "오늘 일정"); views.setTextViewText(R.id.widget_subtitle, snapshot.optString("dateLabel"));
            String dday = snapshot.optString("dday"); views.setViewVisibility(R.id.widget_badge, dday.isEmpty() ? View.GONE : View.VISIBLE); views.setTextViewText(R.id.widget_badge, dday);
            views.setTextViewText(R.id.widget_add, "＋"); views.setOnClickPendingIntent(R.id.widget_add, openApp(context, widgetId));
        } else if ("todos".equals(kind)) {
            int done = count(rows, "completed"); views.setTextViewText(R.id.widget_title, "할 일"); views.setTextViewText(R.id.widget_subtitle, "");
            views.setTextViewText(R.id.widget_badge, done + "/" + (rows == null ? 0 : rows.length()) + " 완료"); views.setTextViewText(R.id.widget_add, "＋ 추가");
            views.setOnClickPendingIntent(R.id.widget_add, dialog(context, widgetId, "todo"));
        } else {
            int done = count(rows, "completed"), total = rows == null ? 0 : rows.length(); views.setTextViewText(R.id.widget_title, "습관"); views.setTextViewText(R.id.widget_subtitle, "주간 실천 흐름");
            views.setTextViewText(R.id.widget_badge, "오늘 " + Math.max(0, total - done) + "개 남음"); views.setViewVisibility(R.id.widget_add, View.GONE);
        }
        theme(context, views, dark, new int[]{R.id.widget_title}, new int[]{R.id.widget_subtitle});
        renderListRows(context, views, rows, widgetId, kind, dark);
        return views;
    }

    private static void renderListRows(Context context, RemoteViews views, JSONArray rows, int widgetId, String kind, boolean dark) {
        int count = rows == null ? 0 : Math.min(3, rows.length()); views.setViewVisibility(R.id.widget_empty, count == 0 ? View.VISIBLE : View.GONE);
        for (int i = 0; i < 3; i++) {
            boolean visible = i < count; views.setViewVisibility(ROWS[i], visible ? View.VISIBLE : View.GONE);
            if (i < 2) views.setViewVisibility(DIVIDERS[i], visible && i + 1 < count ? View.VISIBLE : View.GONE);
            if (!visible) continue;
            JSONObject row = rows.optJSONObject(i); if (row == null) continue; boolean completed = row.optBoolean("events".equals(kind) ? "done" : "completed");
            String title = row.optString("events".equals(kind) ? "name" : "title", row.optString("name"));
            CharSequence text = completed ? strike(title, dark ? DARK_MUTED : Color.parseColor("#8C8E8A")) : title;
            views.setTextViewText(TEXTS[i], text); views.setTextColor(TEXTS[i], completed ? (dark ? DARK_MUTED : Color.parseColor("#8C8E8A")) : (dark ? DARK_TEXT : LIGHT_TEXT));
            views.setTextViewText(CHECKS[i], completed ? "✓" : ""); views.setInt(CHECKS[i], "setBackgroundResource", completed ? R.drawable.widget_checkbox_checked : dark ? R.drawable.widget_button_dark : R.drawable.widget_checkbox);
            String meta = "events".equals(kind) ? row.optString("meta") : "habits".equals(kind) ? habitMeta(row) : "";
            views.setTextViewText(METAS[i], meta); views.setTextColor(METAS[i], dark ? DARK_MUTED : Color.parseColor("#8C8E8A"));
            String actionName = "events".equals(kind) ? "event_toggle" : "todos".equals(kind) ? "todo_toggle" : "habit_toggle";
            PendingIntent intent = action(context, widgetId, actionName, "id", row.optString("id"), "completed", String.valueOf(!completed));
            views.setOnClickPendingIntent(ROWS[i], intent); views.setOnClickPendingIntent(CHECKS[i], intent);
        }
    }

    private static void renderBudgetRows(RemoteViews views, JSONArray categories, boolean dark) {
        int count = categories == null ? 0 : Math.min(3, categories.length()); views.setViewVisibility(R.id.widget_empty, count == 0 ? View.VISIBLE : View.GONE);
        for (int i = 0; i < 3; i++) {
            boolean visible = i < count; views.setViewVisibility(BUDGET_ROWS[i], visible ? View.VISIBLE : View.GONE); if (!visible) continue;
            JSONObject item = categories.optJSONObject(i); if (item == null) continue; double used = item.optDouble("used"), limit = item.optDouble("budget"), remaining = item.optDouble("remaining"); boolean over = remaining < 0;
            int percent = limit > 0 ? (int)Math.round(used / limit * 100) : used > 0 ? 100 : 0;
            views.setTextViewText(BUDGET_NAMES[i], item.optString("category")); views.setTextViewText(BUDGET_AMOUNTS[i], money(used) + " / " + money(limit));
            views.setProgressBar(BUDGET_PROGRESS[i], 100, Math.min(100, percent), false); views.setProgressBar(BUDGET_PROGRESS_DANGER[i], 100, Math.min(100, percent), false);
            views.setViewVisibility(BUDGET_PROGRESS[i], over ? View.GONE : View.VISIBLE); views.setViewVisibility(BUDGET_PROGRESS_DANGER[i], over ? View.VISIBLE : View.GONE);
            views.setTextViewText(BUDGET_METAS[i], money(Math.abs(remaining)) + (over ? " 초과" : " 남음") + " · " + percent + "%");
            views.setTextColor(BUDGET_NAMES[i], dark ? DARK_TEXT : LIGHT_TEXT); views.setTextColor(BUDGET_AMOUNTS[i], over ? DANGER : dark ? DARK_MUTED : LIGHT_MUTED); views.setTextColor(BUDGET_METAS[i], over ? DANGER : dark ? DARK_MUTED : Color.parseColor("#8C8E8A"));
        }
    }

    private static void theme(Context context, RemoteViews views, boolean dark, int[] textIds, int[] mutedIds) {
        views.setInt(R.id.widget_root, "setBackgroundResource", dark ? R.drawable.widget_card_dark : R.drawable.widget_card);
        for (int id : textIds) views.setTextColor(id, dark ? DARK_TEXT : LIGHT_TEXT);
        for (int id : mutedIds) views.setTextColor(id, dark ? DARK_MUTED : LIGHT_MUTED);
    }

    static boolean isDark(JSONObject snapshot) { return "dark".equals(snapshot.optString("theme")); }
    private static int count(JSONArray rows, String field) { int value = 0; if (rows != null) for (int i = 0; i < rows.length(); i++) if (rows.optJSONObject(i) != null && rows.optJSONObject(i).optBoolean(field)) value++; return value; }
    private static String habitMeta(JSONObject row) { int done = row.optInt("weekCompleted"), target = Math.max(1, row.optInt("weekTarget", 7)); StringBuilder dots = new StringBuilder("주 ").append(done).append('/').append(target).append("일  "); for (int i = 0; i < target; i++) dots.append(i < done ? '●' : '○'); return dots.toString(); }
    private static SpannableString strike(String value, int color) { SpannableString text = new SpannableString(value); text.setSpan(new StrikethroughSpan(), 0, text.length(), 0); text.setSpan(new ForegroundColorSpan(color), 0, text.length(), 0); return text; }
    private static String money(double value) { return "₩" + NumberFormat.getIntegerInstance(Locale.KOREA).format(Math.round(value)); }
    private static String decimal(double value) { return value == Math.rint(value) ? String.valueOf((long)value) : String.format(Locale.US, "%.1f", value); }

    private static PendingIntent action(Context context, int widgetId, String action, String... extras) {
        Intent intent = new Intent(context, HaruWidgetActionReceiver.class).setAction("com.ohjunho.haru.WIDGET_ACTION").putExtra("action", action).putExtra(AppWidgetIds.EXTRA_WIDGET_ID, widgetId);
        for (int i = 0; i + 1 < extras.length; i += 2) intent.putExtra(extras[i], extras[i + 1]);
        return PendingIntent.getBroadcast(context, (widgetId + action + java.util.Arrays.toString(extras)).hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent dialog(Context context, int widgetId, String type) {
        Intent intent = new Intent(context, HaruQuickActionActivity.class).putExtra("type", type).putExtra(AppWidgetIds.EXTRA_WIDGET_ID, widgetId).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, (widgetId + "dialog" + type).hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context context, int widgetId) {
        Intent intent = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static final class AppWidgetIds { static final String EXTRA_WIDGET_ID = "widgetId"; }
}
