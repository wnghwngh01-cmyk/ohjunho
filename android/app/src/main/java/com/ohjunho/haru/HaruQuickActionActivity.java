package com.ohjunho.haru;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class HaruQuickActionActivity extends AppCompatActivity {
    private static final int FOREST = Color.parseColor("#214838"), TEXT = Color.parseColor("#1B1C1A"), MUTED = Color.parseColor("#6B6D69"), BORDER = Color.parseColor("#E2E3DF"), BEIGE = Color.parseColor("#F4F3EF");
    private String type, category = "식비"; private EditText primary, secondary; private LinearLayout chips;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state); type = getIntent().getStringExtra("type"); if (type == null) { finish(); return; }
        Window window = getWindow(); window.setBackgroundDrawableResource(android.R.color.transparent); window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND); window.setDimAmount(.45f); window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL); card.setPadding(dp(16), dp(16), dp(16), dp(16)); card.setBackgroundResource(R.drawable.quick_dialog_card);
        LinearLayout header = row(); TextView dot = text("●", 12, FOREST, true); TextView title = text(title(), 13, TEXT, true); title.setPadding(dp(6),0,0,0); Button close = button("×", false); close.setOnClickListener(v -> finish());
        header.addView(dot); header.addView(title, new LinearLayout.LayoutParams(0, dp(34), 1)); header.addView(close, new LinearLayout.LayoutParams(dp(34), dp(34))); card.addView(header);
        View line = new View(this); line.setBackgroundColor(BORDER); card.addView(line, new LinearLayout.LayoutParams(-1, dp(1)));
        if ("finance".equals(type)) addFinanceFields(card); else if ("todo".equals(type)) addTodoFields(card); else addProteinFields(card);
        LinearLayout actions = row(); actions.setPadding(0, dp(14), 0, 0); Button cancel = button("취소", false), save = button("저장", true); cancel.setOnClickListener(v -> finish()); save.setOnClickListener(v -> save());
        actions.addView(cancel, new LinearLayout.LayoutParams(0, dp(36), 1)); LinearLayout.LayoutParams saveLp = new LinearLayout.LayoutParams(0, dp(36), 1); saveLp.setMarginStart(dp(8)); actions.addView(save, saveLp); card.addView(actions);
        LinearLayout frame = new LinearLayout(this); frame.setGravity(Gravity.CENTER); frame.setPadding(dp(24),dp(24),dp(24),dp(24)); frame.addView(card, new LinearLayout.LayoutParams(dp(326), -2)); setContentView(frame);
        window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT); primary.requestFocus(); window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private void addFinanceFields(LinearLayout card) {
        label(card, "분류"); HorizontalScrollView scroll = new HorizontalScrollView(this); scroll.setHorizontalScrollBarEnabled(false); chips = row();
        for (String value : new String[]{"식비","교통","쇼핑","생활","교육","세금","기타"}) { TextView chip = text(value,11,TEXT,false); chip.setGravity(Gravity.CENTER); chip.setPadding(dp(10),0,dp(10),0); chip.setTag(value); chip.setBackground(chipBackground(value.equals(category))); chip.setTextColor(value.equals(category) ? Color.WHITE : TEXT); chip.setOnClickListener(v -> selectChip((TextView)v)); LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2,dp(28)); lp.setMarginEnd(dp(6)); chips.addView(chip,lp); }
        scroll.addView(chips); card.addView(scroll,new LinearLayout.LayoutParams(-1,dp(32))); label(card,"금액 (원)"); primary=input("0",true); card.addView(primary); label(card,"내용 (선택)"); secondary=input("메모 (비워두면 분류명으로 저장)",false); card.addView(secondary);
    }

    private void addTodoFields(LinearLayout card) { label(card,"할 일 내용"); primary=input("오늘 할 일을 입력하세요",false); card.addView(primary); }
    private void addProteinFields(LinearLayout card) { label(card,"단백질 (g)"); primary=input("0",true); card.addView(primary); label(card,"음식 이름 (선택)"); secondary=input("예: 닭가슴살",false); card.addView(secondary); }

    private void save() {
        try {
            if ("finance".equals(type)) { long amount=Long.parseLong(primary.getText().toString().replaceAll("[^0-9]","")); if(amount<=0)throw new Exception(); String title=secondary.getText().toString().trim(); HaruWidgetStore.addFinanceLocal(this,category,amount,title.isEmpty()?category:title); }
            else if ("todo".equals(type)) { String title=primary.getText().toString().trim(); if(title.isEmpty())throw new Exception(); HaruWidgetStore.addTodoLocal(this,title); }
            else { double grams=Double.parseDouble(primary.getText().toString().trim()); if(grams<=0||grams>9999.9)throw new Exception(); HaruWidgetStore.addProteinLocal(this,grams,secondary.getText().toString().trim()); }
            HaruWidgetUpdater.updateAll(this); finish();
        } catch (Exception error) { Toast.makeText(this,"입력값을 확인해 주세요.",Toast.LENGTH_SHORT).show(); }
    }

    private void selectChip(TextView selected) { category=String.valueOf(selected.getTag()); for(int i=0;i<chips.getChildCount();i++){TextView chip=(TextView)chips.getChildAt(i);boolean on=category.equals(chip.getTag());chip.setBackground(chipBackground(on));chip.setTextColor(on?Color.WHITE:TEXT);} }
    private GradientDrawable chipBackground(boolean selected){GradientDrawable d=new GradientDrawable();d.setColor(selected?FOREST:BEIGE);d.setCornerRadius(dp(14));if(!selected)d.setStroke(dp(1),BORDER);return d;}
    private GradientDrawable fieldBackground(){GradientDrawable d=new GradientDrawable();d.setColor(BEIGE);d.setCornerRadius(dp(8));d.setStroke(dp(1),BORDER);return d;}
    private EditText input(String hint,boolean numeric){EditText e=new EditText(this);e.setHint(hint);e.setTextColor(TEXT);e.setHintTextColor(Color.parseColor("#8C8E8A"));e.setTextSize(numeric?14:12);e.setSingleLine(true);e.setPadding(dp(10),0,dp(10),0);e.setBackground(fieldBackground());e.setInputType(numeric?InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL:InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);e.setLayoutParams(new LinearLayout.LayoutParams(-1,dp(38)));return e;}
    private Button button(String value,boolean primaryStyle){Button b=new Button(this);b.setAllCaps(false);b.setText(value);b.setTextSize(12);b.setTextColor(primaryStyle?Color.WHITE:TEXT);GradientDrawable d=new GradientDrawable();d.setColor(primaryStyle?FOREST:BEIGE);d.setCornerRadius(dp(8));if(!primaryStyle)d.setStroke(dp(1),BORDER);b.setBackground(d);b.setPadding(0,0,0,0);return b;}
    private TextView text(String value,int size,int color,boolean bold){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(color);v.setGravity(Gravity.CENTER_VERTICAL);if(bold)v.setTypeface(v.getTypeface(),android.graphics.Typeface.BOLD);return v;}
    private LinearLayout row(){LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.HORIZONTAL);row.setGravity(Gravity.CENTER_VERTICAL);return row;}
    private void label(LinearLayout card,String value){TextView label=text(value,11,MUTED,false);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(28));lp.topMargin=dp(7);card.addView(label,lp);}
    private String title(){return "finance".equals(type)?"빠른 지출 기록":"todo".equals(type)?"할 일 빠른 추가":"단백질 빠른 추가";}
    private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
}
