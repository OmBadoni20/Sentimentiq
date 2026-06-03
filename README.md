# ============================================================
# SENTIMENTIQ - INTERNAL EMPLOYEE FEEDBACK ANALYSIS
# Dataset  : Internal_Feedback_WITHOUT_Scores.csv
# Model    : Loads saved IMDB trained BiLSTM model
# Classes  : Positive / Negative / Neutral
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
print("   SENTIMENTIQ - INTERNAL EMPLOYEE FEEDBACK")
print("   Using saved IMDB trained BiLSTM model")
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
# STEP 2 - LOAD DATASET
# ============================================================
print("=" * 65)
print("   STEP 2 - LOADING INTERNAL FEEDBACK DATASET")
print("=" * 65)
print()

df = pd.read_csv("Internal_Feedback_WITHOUT_Scores.csv")

print(f"[OK] Dataset loaded!")
print(f"   Total rows    : {len(df):,}")
print(f"   Total columns : {len(df.columns)}")
print()

print("First 5 feedbacks:")
print("-" * 65)
for i in range(5):
    print(f"Employee : {df['Employee_Name'].iloc[i]}")
    print(f"Dept     : {df['Department'].iloc[i]}")
    print(f"Issue    : {df['Issue_Category'].iloc[i]}")
    print(f"Priority : {df['Priority'].iloc[i]}")
    print(f"Feedback : {df['Customer_Feedback'].iloc[i][:100]}...")
    print(f"NPS      : {df['NPS_Score'].iloc[i]} ({df['NPS_Category'].iloc[i]})")
    print()




# ============================================================
# STEP 3 - SHOW DATASET DETAILS
# ============================================================
print("=" * 65)
print("   STEP 3 - DATASET DETAILS")
print("=" * 65)
print()

total      = len(df)
sla_breach = len(df[df['SLA_Breached']=='Yes'])

print(f"Total Feedbacks  : {total:,}")
print()
print(f"NOTE: No CSAT DSAT sentiment in this file!")
print(f"Model will predict all of these!")
print()
print(f"SLA BREACH:")
print(f"   Breached     : {sla_breach:,} ({sla_breach/total*100:.1f}%)")
print(f"   Not Breached : {total-sla_breach:,} ({(total-sla_breach)/total*100:.1f}%)")
print()

print(f"PRIORITY DISTRIBUTION:")
for pri, cnt in df['Priority'].value_counts().sort_index().items():
    bar = "#" * int(cnt/50)
    print(f"   {pri} : {cnt:,} ({cnt/total*100:.1f}%) {bar}")
print()

print(f"DEPARTMENT DISTRIBUTION:")
for dept, cnt in df['Department'].value_counts().items():
    print(f"   {dept:20s} : {cnt:,}")
print()

print(f"ISSUE CATEGORY DISTRIBUTION:")
for issue, cnt in df['Issue_Category'].value_counts().items():
    print(f"   {issue:25s} : {cnt:,}")
print()
print("[OK] STEP 3 - Details shown!")
print()




# ============================================================
# STEP 4 - SHOW SAMPLE FEEDBACKS
# ============================================================
print("=" * 65)
print("   STEP 4 - SAMPLE FEEDBACKS")
print("=" * 65)
print()

print("10 Random feedbacks from dataset:")
print("-" * 65)
samples = df['Customer_Feedback'].sample(10, random_state=42).values
for i, fb in enumerate(samples, 1):
    print(f"[{i:2d}] {fb[:120]}...")
    print()

print("[OK] STEP 4 - Sample feedbacks shown!")
print()




# ============================================================
# STEP 5 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 5 - SETTING UP PREDICTION FUNCTION")
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
        nps_pred   = 9
        nps_cat    = 'Promoter'
    elif prob <= 0.35:
        sentiment  = 'Negative'
        confidence = round((1-prob) * 100, 2)
        csat, dsat = 0, 1
        nps_pred   = 2
        nps_cat    = 'Detractor'
    else:
        sentiment  = 'Neutral'
        confidence = round(max(prob, 1-prob) * 100, 2)
        csat, dsat = 0, 0
        nps_pred   = 6
        nps_cat    = 'Passive'

    return sentiment, confidence, csat, dsat, nps_pred, nps_cat

print("Prediction Logic:")
print("   prob >= 0.65 → Positive | CSAT=1 DSAT=0 | NPS 9 Promoter")
print("   prob <= 0.35 → Negative | CSAT=0 DSAT=1 | NPS 2 Detractor")
print("   in between   → Neutral  | CSAT=0 DSAT=0 | NPS 6 Passive")
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
print(f"Predicting sentiment for {total:,} feedbacks...")
print()

sentiments  = []
confidences = []
csat_preds  = []
dsat_preds  = []
nps_preds   = []
nps_cats    = []
start       = time.time()

for i, feedback in enumerate(df['Customer_Feedback']):
    sent, conf, csat, dsat, nps_p, nps_c = predict_sentiment(
        str(feedback)
    )
    sentiments.append(sent)
    confidences.append(conf)
    csat_preds.append(csat)
    dsat_preds.append(dsat)
    nps_preds.append(nps_p)
    nps_cats.append(nps_c)

    if (i+1) % 500 == 0 or (i+1) == total:
        elapsed = time.time() - start
        print(f"   Progress: {i+1:,}/{total:,} "
              f"({(i+1)/total*100:.1f}%) | "
              f"Time: {elapsed:.0f}s")

elapsed = time.time() - start
print()
print(f"[OK] Prediction done in {elapsed:.1f}s!")
print()




# ============================================================
# STEP 7 - SHOW PREDICTED PERCENTAGES
# ============================================================
print("=" * 65)
print("   STEP 7 - PREDICTED PERCENTAGES")
print("=" * 65)
print()

pred_pos  = sentiments.count('Positive')
pred_neg  = sentiments.count('Negative')
pred_neu  = sentiments.count('Neutral')
pred_csat = sum(csat_preds)
pred_dsat = sum(dsat_preds)
avg_conf  = sum(confidences) / total

print(f"PREDICTED SENTIMENT:")
print(f"   Positive : {pred_pos:,} ({pred_pos/total*100:.1f}%)")
print(f"   Negative : {pred_neg:,} ({pred_neg/total*100:.1f}%)")
print(f"   Neutral  : {pred_neu:,} ({pred_neu/total*100:.1f}%)")
print()
print(f"CSAT (Satisfied Employees):")
print(f"   CSAT = 1 : {pred_csat:,} ({pred_csat/total*100:.1f}%)")
print(f"   CSAT = 0 : {total-pred_csat:,} ({(total-pred_csat)/total*100:.1f}%)")
print()
print(f"DSAT (Dissatisfied Employees):")
print(f"   DSAT = 1 : {pred_dsat:,} ({pred_dsat/total*100:.1f}%)")
print(f"   DSAT = 0 : {total-pred_dsat:,} ({(total-pred_dsat)/total*100:.1f}%)")
print()
print(f"Average Confidence : {avg_conf:.1f}%")
print()
print("[OK] STEP 7 - Percentages shown!")
print()




# ============================================================
# STEP 8 - SAMPLE RESULTS (50 feedbacks)
# ============================================================
print("=" * 65)
print("   STEP 8 - SAMPLE RESULTS (50 feedbacks)")
print("=" * 65)
print()

df['Predicted_Sentiment'] = sentiments
df['Confidence']          = confidences
df['CSAT']                = csat_preds
df['DSAT']                = dsat_preds
df['Predicted_NPS']       = nps_preds
df['Predicted_NPS_Cat']   = nps_cats

sample = df.sample(50, random_state=42).reset_index(drop=True)

print("50 predictions with CSAT DSAT NPS:")
print("=" * 65)

for i in range(50):
    fb       = sample['Customer_Feedback'].iloc[i]
    employee = sample['Employee_Name'].iloc[i]
    dept     = sample['Department'].iloc[i]
    issue    = sample['Issue_Category'].iloc[i]
    priority = sample['Priority'].iloc[i]
    sla      = sample['SLA_Breached'].iloc[i]
    sent     = sample['Predicted_Sentiment'].iloc[i]
    conf     = sample['Confidence'].iloc[i]
    csat     = sample['CSAT'].iloc[i]
    dsat     = sample['DSAT'].iloc[i]
    nps_p    = sample['Predicted_NPS'].iloc[i]
    nps_c    = sample['Predicted_NPS_Cat'].iloc[i]
    bar      = "#" * int(conf // 5)

    print(f"[{i+1:2d}] Employee  : {employee} ({dept})")
    print(f"     Issue    : {issue} | Priority: {priority} | SLA: {sla}")
    print(f"     Feedback : {fb[:80]}...")
    print(f"     Predicted: {sent:10s} | {bar} {conf}%")
    print(f"     CSAT:{csat} DSAT:{dsat} | NPS:{nps_p} {nps_c}")
    print("-" * 65)

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
print(f"   Total Feedbacks : {total:,}")
print(f"   Positive        : {pred_pos:,} ({pred_pos/total*100:.1f}%)")
print(f"   Negative        : {pred_neg:,} ({pred_neg/total*100:.1f}%)")
print(f"   Neutral         : {pred_neu:,} ({pred_neu/total*100:.1f}%)")
print(f"   CSAT%           : {pred_csat/total*100:.1f}%")
print(f"   DSAT%           : {pred_dsat/total*100:.1f}%")
print(f"   SLA Breach%     : {sla_breach/total*100:.1f}%")
print(f"   Avg Confidence  : {avg_conf:.1f}%")
print()

print("CSAT% by Department:")
for dept, val in df.groupby('Department')['CSAT']\
        .mean().sort_values(ascending=False).items():
    bar = "#" * int(val*20)
    print(f"   {dept:20s} : {val*100:.1f}% {bar}")
print()

print("DSAT% by Department:")
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

print("DSAT% by Issue Category:")
for issue, val in df.groupby('Issue_Category')['DSAT']\
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
print("[OK] STEP 9 - Business insights done!")
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
    'SentimentIQ - Internal Employee Feedback Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Sentiment Distribution
axes[0,0].pie(
    [pred_pos, pred_neg, pred_neu],
    labels=[f'Positive\n{pred_pos:,}',
            f'Negative\n{pred_neg:,}',
            f'Neutral\n{pred_neu:,}'],
    colors=['#22c55e','#ef4444','#3b82f6'],
    autopct='%1.1f%%', startangle=90
)
axes[0,0].set_title('Predicted Sentiment',
                     fontweight='bold')

# Graph 2 - CSAT vs DSAT
cats = ['CSAT\n(Satisfied)',
        'DSAT\n(Dissatisfied)',
        'Neutral']
vals = [pred_csat, pred_dsat, pred_neu]
cols = ['#22c55e','#ef4444','#3b82f6']
bars = axes[0,1].bar(cats, vals, color=cols)
axes[0,1].set_title('CSAT vs DSAT vs Neutral',
                     fontweight='bold')
axes[0,1].set_ylabel('Count')
for bar, val in zip(bars, vals):
    axes[0,1].text(
        bar.get_x()+bar.get_width()/2,
        bar.get_height()+10,
        f'{val:,}',
        ha='center', fontweight='bold'
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
colors5 = ['#ef4444','#f97316','#eab308']
sla_data.plot(
    kind='bar', ax=axes[1,1], color=colors5
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

# Graph 6 - Confidence Distribution
axes[1,2].hist(
    confidences, bins=20,
    color='#6366f1', edgecolor='white'
)
axes[1,2].axvline(
    avg_conf, color='red',
    linestyle='--',
    label=f'Mean: {avg_conf:.1f}%'
)
axes[1,2].set_title('Confidence Distribution',
                     fontweight='bold')
axes[1,2].set_xlabel('Confidence %')
axes[1,2].set_ylabel('Count')
axes[1,2].legend()

plt.tight_layout()
plt.savefig('internal_feedback_graph.png',
            dpi=150, bbox_inches='tight')
print("[OK] Graph saved as internal_feedback_graph.png")
plt.show()
print()




# ============================================================
# STEP 11 - SAVE RESULTS
# ============================================================
print("=" * 65)
print("   STEP 11 - SAVING RESULTS")
print("=" * 65)
print()

df.to_csv('internal_predicted_results.csv', index=False)
print("[OK] Saved to internal_predicted_results.csv")
print()
print("Columns in saved file:")
print("   All original columns PLUS:")
print("   Predicted_Sentiment ← Positive/Negative/Neutral")
print("   Confidence          ← Model confidence %")
print("   CSAT                ← 1 or 0")
print("   DSAT                ← 1 or 0")
print("   Predicted_NPS       ← 9/6/2")
print("   Predicted_NPS_Cat   ← Promoter/Passive/Detractor")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   SENTIMENTIQ - INTERNAL ANALYSIS COMPLETE")
print("=" * 65)
print()
print(f"   Dataset          : Internal_Feedback_WITHOUT_Scores.csv")
print(f"   Total Feedbacks  : {total:,}")
print(f"   Positive         : {pred_pos:,} ({pred_pos/total*100:.1f}%)")
print(f"   Negative         : {pred_neg:,} ({pred_neg/total*100:.1f}%)")
print(f"   Neutral          : {pred_neu:,} ({pred_neu/total*100:.1f}%)")
print(f"   CSAT%            : {pred_csat/total*100:.1f}%")
print(f"   DSAT%            : {pred_dsat/total*100:.1f}%")
print(f"   SLA Breach%      : {sla_breach/total*100:.1f}%")
print(f"   Avg Confidence   : {avg_conf:.1f}%")
print(f"   Time Taken       : {elapsed:.1f}s")
print()
print("   NPS Links:")
print("   Positive → CSAT=1 DSAT=0 NPS=9 Promoter")
print("   Negative → CSAT=0 DSAT=1 NPS=2 Detractor")
print("   Neutral  → CSAT=0 DSAT=0 NPS=6 Passive")
print()
print("   Output Files:")
print("   internal_predicted_results.csv - Full results")
print("   internal_feedback_graph.png    - 6 Graphs")
print("=" * 65)
