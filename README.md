# ============================================================
# SENTIMENTIQ - INTERNAL EMPLOYEE FEEDBACK WITH SCORES
# Dataset  : Internal_Feedback_WITH_Scores.csv
# Model    : Loads saved IMDB trained BiLSTM model
# Purpose  : Predict AND verify against actual CSAT DSAT
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']       = ''
os.environ['REQUESTS_CA_BUNDLE']   = ''
os.environ['PYTHONHTTPSVERIFY']    = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pandas            as pd
import numpy             as np
import matplotlib.pyplot as plt
import seaborn           as sns
import pickle
import re
import time
import warnings

warnings.filterwarnings('ignore')

MAX_LEN = 200

print("=" * 65)
print("   SENTIMENTIQ - INTERNAL FEEDBACK WITH SCORES")
print("   Predict + Verify against actual CSAT DSAT")
print("=" * 65)
print()




# ============================================================
# STEP 1 - LOAD SAVED MODEL
# ============================================================
print("=" * 65)
print("   STEP 1 - LOADING SAVED MODEL")
print("=" * 65)
print()

model     = tf.keras.models.load_model('best_bilstm_model.h5')
tokenizer = pickle.load(open('tokenizer.pkl', 'rb'))

print("[OK] Model loaded!")
print("[OK] Tokenizer loaded!")
print()




# ============================================================
# STEP 2 - LOAD DATASET WITH SCORES
# ============================================================
print("=" * 65)
print("   STEP 2 - LOADING DATASET WITH SCORES")
print("=" * 65)
print()

df = pd.read_csv("Internal_Feedback_WITH_Scores.csv")

print(f"[OK] Dataset loaded!")
print(f"   Total rows    : {len(df):,}")
print(f"   Total columns : {len(df.columns)}")
print()

print("First 5 rows:")
print("-" * 65)
for i in range(5):
    print(f"Employee : {df['Employee_Name'].iloc[i]}")
    print(f"Dept     : {df['Department'].iloc[i]}")
    print(f"Issue    : {df['Issue_Category'].iloc[i]}")
    print(f"Feedback : {df['Customer_Feedback'].iloc[i][:100]}...")
    print(f"Rating   : {df['Star_Rating'].iloc[i]}")
    print(f"CSAT     : {df['CSAT'].iloc[i]} | DSAT: {df['DSAT'].iloc[i]}")
    print(f"NPS      : {df['NPS_Score'].iloc[i]} ({df['NPS_Category'].iloc[i]})")
    print()




# ============================================================
# STEP 3 - SHOW ACTUAL PERCENTAGES
# ============================================================
print("=" * 65)
print("   STEP 3 - ACTUAL PERCENTAGES FROM DATASET")
print("=" * 65)
print()

total        = len(df)
actual_csat  = int(df['CSAT'].sum())
actual_dsat  = int(df['DSAT'].sum())
actual_neu   = total - actual_csat - actual_dsat
sla_breach   = len(df[df['SLA_Breached']=='Yes'])

print(f"ACTUAL CSAT DSAT (from dataset):")
print(f"   CSAT=1 (Satisfied)   : {actual_csat:,} ({actual_csat/total*100:.1f}%)")
print(f"   DSAT=1 (Dissatisfied): {actual_dsat:,} ({actual_dsat/total*100:.1f}%)")
print(f"   Neutral (both 0)     : {actual_neu:,}  ({actual_neu/total*100:.1f}%)")
print()
print(f"SLA BREACH:")
print(f"   Breached     : {sla_breach:,} ({sla_breach/total*100:.1f}%)")
print(f"   Not Breached : {total-sla_breach:,} ({(total-sla_breach)/total*100:.1f}%)")
print()

print("RATING DISTRIBUTION:")
for r, c in df['Star_Rating'].value_counts().sort_index().items():
    bar = "#" * int(c/100)
    print(f"   {r} star : {c:,} ({c/total*100:.1f}%) {bar}")
print()

print("NPS DISTRIBUTION (Actual):")
for cat, cnt in df['NPS_Category'].value_counts().items():
    pct = cnt/total*100
    print(f"   {cat:12s}: {cnt:,} ({pct:.1f}%)")
print()
print("[OK] STEP 3 - Actual percentages shown!")
print()




# ============================================================
# STEP 4 - SHOW SAMPLE COMMENTS BY CATEGORY
# ============================================================
print("=" * 65)
print("   STEP 4 - SAMPLE COMMENTS")
print("=" * 65)
print()

# Positive (CSAT=1)
print("POSITIVE FEEDBACK SAMPLES (5) - CSAT=1:")
print("-" * 65)
pos_samples = df[df['CSAT']==1]['Customer_Feedback']\
    .sample(5, random_state=42).values
for i, fb in enumerate(pos_samples, 1):
    print(f"[{i}] {fb[:120]}...")
    print()

print()

# Negative (DSAT=1)
print("NEGATIVE FEEDBACK SAMPLES (5) - DSAT=1:")
print("-" * 65)
neg_samples = df[df['DSAT']==1]['Customer_Feedback']\
    .sample(5, random_state=42).values
for i, fb in enumerate(neg_samples, 1):
    print(f"[{i}] {fb[:120]}...")
    print()

print()

# Neutral (both 0)
print("NEUTRAL FEEDBACK SAMPLES (5) - CSAT=0 DSAT=0:")
print("-" * 65)
neu_samples = df[(df['CSAT']==0) & (df['DSAT']==0)]\
    ['Customer_Feedback'].sample(5, random_state=42).values
for i, fb in enumerate(neu_samples, 1):
    print(f"[{i}] {fb[:120]}...")
    print()

print("[OK] STEP 4 - Sample comments shown!")
print()




# ============================================================
# STEP 5 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 5 - PREDICTION FUNCTION")
print("=" * 65)
print()

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r'<.*?>',         ' ', text)
    text = re.sub(r'http\S+',       ' ', text)
    text = re.sub(r'[^a-zA-Z\s]',   ' ', text)
    text = re.sub(r'\s+',           ' ', text).strip()
    return text

def predict_sentiment(text):
    clean    = preprocess(text)
    sequence = tokenizer.texts_to_sequences([clean])
    padded   = pad_sequences(
        sequence, maxlen=MAX_LEN,
        padding='post', truncating='post'
    )
    prob = float(model.predict(padded, verbose=0)[0][0])

    if prob >= 0.65:
        sentiment  = 'Positive'
        confidence = round(prob * 100, 2)
        csat, dsat = 1, 0
        nps_p      = 9
        nps_c      = 'Promoter'
    elif prob <= 0.35:
        sentiment  = 'Negative'
        confidence = round((1-prob) * 100, 2)
        csat, dsat = 0, 1
        nps_p      = 2
        nps_c      = 'Detractor'
    else:
        sentiment  = 'Neutral'
        confidence = round(max(prob, 1-prob) * 100, 2)
        csat, dsat = 0, 0
        nps_p      = 6
        nps_c      = 'Passive'

    return sentiment, confidence, csat, dsat, nps_p, nps_c

print("Logic:")
print("   prob >= 0.65 → Positive | CSAT=1 DSAT=0 | NPS 9")
print("   prob <= 0.35 → Negative | CSAT=0 DSAT=1 | NPS 2")
print("   in between   → Neutral  | CSAT=0 DSAT=0 | NPS 6")
print()
print("[OK] STEP 5 - Function ready!")
print()




# ============================================================
# STEP 6 - PREDICT ON ALL FEEDBACKS
# ============================================================
print("=" * 65)
print("   STEP 6 - PREDICTING ON ALL FEEDBACKS")
print("=" * 65)
print()
print(f"Predicting on {total:,} feedbacks...")
print()

sentiments  = []
confidences = []
csat_preds  = []
dsat_preds  = []
start       = time.time()

for i, feedback in enumerate(df['Customer_Feedback']):
    sent, conf, csat, dsat, nps_p, nps_c = predict_sentiment(
        str(feedback)
    )
    sentiments.append(sent)
    confidences.append(conf)
    csat_preds.append(csat)
    dsat_preds.append(dsat)

    if (i+1) % 500 == 0 or (i+1) == total:
        elapsed = time.time() - start
        print(f"   {i+1:,}/{total:,} "
              f"({(i+1)/total*100:.1f}%) | "
              f"Time: {elapsed:.0f}s")

elapsed = time.time() - start
print()
print(f"[OK] Done in {elapsed:.1f}s!")
print()




# ============================================================
# STEP 7 - COMPARE PREDICTED VS ACTUAL
# ============================================================
print("=" * 65)
print("   STEP 7 - PREDICTED VS ACTUAL COMPARISON")
print("=" * 65)
print()

pred_pos  = sentiments.count('Positive')
pred_neg  = sentiments.count('Negative')
pred_neu  = sentiments.count('Neutral')
pred_csat = sum(csat_preds)
pred_dsat = sum(dsat_preds)
avg_conf  = sum(confidences) / total

# Accuracy
csat_correct = sum(
    1 for p, a in zip(csat_preds, df['CSAT'])
    if p == a
)
dsat_correct = sum(
    1 for p, a in zip(dsat_preds, df['DSAT'])
    if p == a
)
csat_acc = csat_correct / total * 100
dsat_acc = dsat_correct / total * 100

print(f"ACTUAL:")
print(f"   CSAT=1 : {actual_csat:,} ({actual_csat/total*100:.1f}%)")
print(f"   DSAT=1 : {actual_dsat:,} ({actual_dsat/total*100:.1f}%)")
print(f"   Neutral: {actual_neu:,}  ({actual_neu/total*100:.1f}%)")
print()
print(f"PREDICTED:")
print(f"   CSAT=1 : {pred_csat:,} ({pred_csat/total*100:.1f}%)")
print(f"   DSAT=1 : {pred_dsat:,} ({pred_dsat/total*100:.1f}%)")
print(f"   Neutral: {pred_neu:,}  ({pred_neu/total*100:.1f}%)")
print()
print(f"ACCURACY:")
print(f"   CSAT Accuracy : {csat_acc:.1f}%")
print(f"   DSAT Accuracy : {dsat_acc:.1f}%")
print(f"   Avg Confidence: {avg_conf:.1f}%")
print()
print("[OK] STEP 7 - Comparison done!")
print()




# ============================================================
# STEP 8 - SAMPLE RESULTS WITH VERIFICATION (50)
# ============================================================
print("=" * 65)
print("   STEP 8 - SAMPLE RESULTS WITH VERIFICATION")
print("=" * 65)
print()

df['Predicted_Sentiment'] = sentiments
df['Confidence']          = confidences
df['Pred_CSAT']           = csat_preds
df['Pred_DSAT']           = dsat_preds

sample    = df.sample(50, random_state=42).reset_index(drop=True)
correct_s = 0
wrong_s   = 0

print("50 predictions vs actual CSAT DSAT:")
print("=" * 65)

for i in range(50):
    fb          = sample['Customer_Feedback'].iloc[i]
    employee    = sample['Employee_Name'].iloc[i]
    dept        = sample['Department'].iloc[i]
    issue       = sample['Issue_Category'].iloc[i]
    priority    = sample['Priority'].iloc[i]
    sla         = sample['SLA_Breached'].iloc[i]
    rating      = sample['Star_Rating'].iloc[i]
    actual_csat = sample['CSAT'].iloc[i]
    actual_dsat = sample['DSAT'].iloc[i]
    actual_nps  = sample['NPS_Score'].iloc[i]
    actual_cat  = sample['NPS_Category'].iloc[i]
    pred_sent   = sample['Predicted_Sentiment'].iloc[i]
    conf        = sample['Confidence'].iloc[i]
    pred_c      = sample['Pred_CSAT'].iloc[i]
    pred_d      = sample['Pred_DSAT'].iloc[i]
    bar         = "#" * int(conf // 5)

    if pred_c == actual_csat and pred_d == actual_dsat:
        correct_s += 1
        match = "[CORRECT]"
    else:
        wrong_s += 1
        match = "[WRONG]  "

    print(f"[{i+1:2d}] Employee  : {employee} ({dept})")
    print(f"     Issue    : {issue} | Priority:{priority} | SLA:{sla}")
    print(f"     Feedback : {fb[:80]}...")
    print(f"     Predicted: {pred_sent:10s} | {bar} {conf}%")
    print(f"     Pred CSAT:{pred_c} DSAT:{pred_d}")
    print(f"     Actual   : Rating={rating} | CSAT:{actual_csat} DSAT:{actual_dsat} | NPS:{actual_nps} {actual_cat} | {match}")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Correct : {correct_s}/50 ({correct_s/50*100:.1f}%)")
print(f"   Wrong   : {wrong_s}/50  ({wrong_s/50*100:.1f}%)")
print()
print("[OK] STEP 8 - Sample results done!")
print()




# ============================================================
# STEP 9 - BUSINESS INSIGHTS
# ============================================================
print("=" * 65)
print("   STEP 9 - BUSINESS INSIGHTS")
print("=" * 65)
print()

print(f"Overall Summary:")
print(f"   Total Feedbacks  : {total:,}")
print(f"   Actual CSAT%     : {actual_csat/total*100:.1f}%")
print(f"   Actual DSAT%     : {actual_dsat/total*100:.1f}%")
print(f"   Predicted CSAT%  : {pred_csat/total*100:.1f}%")
print(f"   Predicted DSAT%  : {pred_dsat/total*100:.1f}%")
print(f"   CSAT Accuracy    : {csat_acc:.1f}%")
print(f"   DSAT Accuracy    : {dsat_acc:.1f}%")
print(f"   SLA Breach%      : {sla_breach/total*100:.1f}%")
print()

print("Actual CSAT% by Department:")
for dept, val in df.groupby('Department')['CSAT']\
        .mean().sort_values(ascending=False).items():
    bar = "#" * int(val*20)
    print(f"   {dept:20s} : {val*100:.1f}% {bar}")
print()

print("Actual DSAT% by Department:")
for dept, val in df.groupby('Department')['DSAT']\
        .mean().sort_values(ascending=False).items():
    bar = "#" * int(val*20)
    print(f"   {dept:20s} : {val*100:.1f}% {bar}")
print()

print("CSAT% by Issue Category:")
for issue, val in df.groupby('Issue_Category')['CSAT']\
        .mean().sort_values(ascending=False).items():
    print(f"   {issue:25s} : {val*100:.1f}%")
print()

print("Best Agent by CSAT%:")
for agent, val in df.groupby('Assigned_Agent')['CSAT']\
        .mean().sort_values(ascending=False).items():
    print(f"   {agent:20s} : {val*100:.1f}%")
print()

print("SLA Breach by Priority:")
for pri, grp in df.groupby('Priority'):
    breach = len(grp[grp['SLA_Breached']=='Yes'])
    print(f"   {pri} : {breach:,}/{len(grp):,} "
          f"({breach/len(grp)*100:.1f}% breached)")
print()
print("[OK] STEP 9 - Insights done!")
print()




# ============================================================
# STEP 10 - VISUALIZATIONS
# ============================================================
print("=" * 65)
print("   STEP 10 - GENERATING VISUALIZATIONS")
print("=" * 65)
print()

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle(
    'SentimentIQ - Internal Feedback WITH Scores Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Actual CSAT DSAT
axes[0,0].pie(
    [actual_csat, actual_dsat, actual_neu],
    labels=[f'CSAT=1\n{actual_csat:,}',
            f'DSAT=1\n{actual_dsat:,}',
            f'Neutral\n{actual_neu:,}'],
    colors=['#22c55e','#ef4444','#3b82f6'],
    autopct='%1.1f%%', startangle=90
)
axes[0,0].set_title('Actual CSAT vs DSAT',
                     fontweight='bold')

# Graph 2 - Predicted vs Actual CSAT DSAT
x     = np.arange(2)
width = 0.35
b1    = axes[0,1].bar(
    x-width/2,
    [actual_csat, actual_dsat],
    width, label='Actual',
    color=['#22c55e','#ef4444']
)
b2    = axes[0,1].bar(
    x+width/2,
    [pred_csat, pred_dsat],
    width, label='Predicted',
    color=['#86efac','#fca5a5']
)
axes[0,1].set_title('Actual vs Predicted',
                     fontweight='bold')
axes[0,1].set_xticks(x)
axes[0,1].set_xticklabels(['CSAT','DSAT'])
axes[0,1].legend()
axes[0,1].set_ylabel('Count')
for bar in list(b1)+list(b2):
    axes[0,1].text(
        bar.get_x()+bar.get_width()/2,
        bar.get_height()+10,
        f'{int(bar.get_height()):,}',
        ha='center', fontsize=8
    )

# Graph 3 - CSAT by Department
dept_csat = df.groupby('Department')['CSAT'].mean()*100
dept_csat.sort_values().plot(
    kind='barh', ax=axes[0,2], color='#22c55e'
)
axes[0,2].set_title('CSAT% by Department',
                     fontweight='bold')
axes[0,2].set_xlabel('CSAT %')

# Graph 4 - DSAT by Department
dept_dsat = df.groupby('Department')['DSAT'].mean()*100
dept_dsat.sort_values(ascending=False).plot(
    kind='bar', ax=axes[1,0], color='#ef4444'
)
axes[1,0].set_title('DSAT% by Department',
                     fontweight='bold')
axes[1,0].set_ylabel('DSAT %')
axes[1,0].tick_params(axis='x', rotation=45)

# Graph 5 - SLA Breach by Priority
sla_data = df.groupby('Priority').apply(
    lambda x: len(x[x['SLA_Breached']=='Yes'])/len(x)*100
)
sla_data.plot(
    kind='bar', ax=axes[1,1],
    color=['#ef4444','#f97316','#eab308']
)
axes[1,1].set_title('SLA Breach% by Priority',
                     fontweight='bold')
axes[1,1].set_ylabel('Breach %')
axes[1,1].tick_params(axis='x', rotation=0)
for p in axes[1,1].patches:
    axes[1,1].text(
        p.get_x()+p.get_width()/2,
        p.get_height()+0.5,
        f'{p.get_height():.1f}%',
        ha='center', fontsize=9
    )

# Graph 6 - Rating Distribution
rating_counts = df['Star_Rating'].value_counts().sort_index()
colors6 = ['#ef4444','#f97316','#eab308',
           '#84cc16','#22c55e']
bars6   = axes[1,2].bar(
    [f'{r} Star' for r in rating_counts.index],
    rating_counts.values,
    color=colors6
)
axes[1,2].set_title('Star Rating Distribution',
                     fontweight='bold')
axes[1,2].set_ylabel('Count')
for bar, val in zip(bars6, rating_counts.values):
    axes[1,2].text(
        bar.get_x()+bar.get_width()/2,
        bar.get_height()+5,
        str(val), ha='center',
        fontweight='bold', fontsize=9
    )

plt.tight_layout()
plt.savefig('internal_with_scores_graph.png',
            dpi=150, bbox_inches='tight')
print("[OK] Graph saved as internal_with_scores_graph.png")
plt.show()
print()




# ============================================================
# STEP 11 - SAVE RESULTS
# ============================================================
print("=" * 65)
print("   STEP 11 - SAVING RESULTS")
print("=" * 65)
print()

df.to_csv('internal_with_scores_results.csv', index=False)
print("[OK] Saved to internal_with_scores_results.csv")
print()
print("Columns in saved file:")
print("   All original columns PLUS:")
print("   Predicted_Sentiment ← model prediction")
print("   Confidence          ← model confidence %")
print("   Pred_CSAT           ← predicted CSAT 0 or 1")
print("   Pred_DSAT           ← predicted DSAT 0 or 1")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   SENTIMENTIQ - WITH SCORES ANALYSIS COMPLETE")
print("=" * 65)
print()
print(f"   Dataset          : Internal_Feedback_WITH_Scores.csv")
print(f"   Total Feedbacks  : {total:,}")
print(f"   Actual CSAT%     : {actual_csat/total*100:.1f}%")
print(f"   Actual DSAT%     : {actual_dsat/total*100:.1f}%")
print(f"   Predicted CSAT%  : {pred_csat/total*100:.1f}%")
print(f"   Predicted DSAT%  : {pred_dsat/total*100:.1f}%")
print(f"   CSAT Accuracy    : {csat_acc:.1f}%")
print(f"   DSAT Accuracy    : {dsat_acc:.1f}%")
print(f"   SLA Breach%      : {sla_breach/total*100:.1f}%")
print(f"   Avg Confidence   : {avg_conf:.1f}%")
print(f"   Time Taken       : {elapsed:.1f}s")
print()
print("   Prediction Links:")
print("   Positive → CSAT=1 DSAT=0 NPS=9 Promoter")
print("   Negative → CSAT=0 DSAT=1 NPS=2 Detractor")
print("   Neutral  → CSAT=0 DSAT=0 NPS=6 Passive")
print()
print("   Output Files:")
print("   internal_with_scores_results.csv  - Full results")
print("   internal_with_scores_graph.png    - 6 Graphs")
print("=" * 65)
