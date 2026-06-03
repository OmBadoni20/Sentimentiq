# ============================================================
# SENTIMENTIQ - INTERNAL EMPLOYEE FEEDBACK ANALYSIS
# Dataset  : Internal_Employee_Feedback_Balanced.csv
# Model    : Loads saved IMDB BiLSTM model
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
print("   STEP 2 - LOADING DATASET")
print("=" * 65)
print()

df = pd.read_csv("Internal_Employee_Feedback_Balanced.csv")

print(f"[OK] Dataset loaded!")
print(f"   Total rows    : {len(df):,}")
print(f"   Total columns : {len(df.columns)}")
print()

print("First 5 feedbacks:")
print("-" * 65)
for i in range(5):
    print(f"Employee  : {df['Employee_Name'].iloc[i]}")
    print(f"Dept      : {df['Department'].iloc[i]}")
    print(f"Issue     : {df['Issue_Category'].iloc[i]}")
    print(f"Feedback  : {df['Customer_Feedback'].iloc[i][:100]}...")
    print(f"Sentiment : {df['Predicted_Sentiment'].iloc[i]}")
    print(f"Rating    : {df['Star_Rating'].iloc[i]}")
    print(f"CSAT      : {df['CSAT'].iloc[i]} | DSAT: {df['DSAT'].iloc[i]}")
    print(f"NPS       : {df['NPS_Score'].iloc[i]} ({df['NPS_Category'].iloc[i]})")
    print()




# ============================================================
# STEP 3 - SHOW DATASET PERCENTAGES
# ============================================================
print("=" * 65)
print("   STEP 3 - DATASET PERCENTAGES")
print("=" * 65)
print()

total      = len(df)
pos_count  = len(df[df['Predicted_Sentiment']=='Positive'])
neg_count  = len(df[df['Predicted_Sentiment']=='Negative'])
neu_count  = len(df[df['Predicted_Sentiment']=='Neutral'])
csat_count = int(df['CSAT'].sum())
dsat_count = int(df['DSAT'].sum())
sla_breach = len(df[df['SLA_Breached']=='Yes'])

print(f"SENTIMENT DISTRIBUTION:")
print(f"   Positive : {pos_count:,} ({pos_count/total*100:.1f}%)")
print(f"   Negative : {neg_count:,} ({neg_count/total*100:.1f}%)")
print(f"   Neutral  : {neu_count:,} ({neu_count/total*100:.1f}%)")
print()
print(f"CSAT (Satisfied Employees):")
print(f"   CSAT=1 : {csat_count:,} ({csat_count/total*100:.1f}%)")
print(f"   CSAT=0 : {total-csat_count:,} ({(total-csat_count)/total*100:.1f}%)")
print()
print(f"DSAT (Dissatisfied Employees):")
print(f"   DSAT=1 : {dsat_count:,} ({dsat_count/total*100:.1f}%)")
print(f"   DSAT=0 : {total-dsat_count:,} ({(total-dsat_count)/total*100:.1f}%)")
print()
print(f"SLA BREACH:")
print(f"   Breached     : {sla_breach:,} ({sla_breach/total*100:.1f}%)")
print(f"   Not Breached : {total-sla_breach:,} ({(total-sla_breach)/total*100:.1f}%)")
print()
print(f"NPS DISTRIBUTION:")
for sent in ['Positive','Negative','Neutral']:
    sub = df[df['Predicted_Sentiment']==sent]
    avg = sub['NPS_Score'].mean()
    print(f"   {sent:10s} → Avg NPS: {avg:.1f}")
    for cat,cnt in sub['NPS_Category'].value_counts().items():
        pct = cnt/len(sub)*100
        print(f"      {cat:12s}: {cnt:,} ({pct:.1f}%)")
print()
print("[OK] STEP 3 - Percentages shown!")
print()




# ============================================================
# STEP 4 - SHOW SAMPLE COMMENTS
# ============================================================
print("=" * 65)
print("   STEP 4 - SAMPLE COMMENTS")
print("=" * 65)
print()

for sentiment in ['Positive','Neutral','Negative']:
    print(f"{sentiment.upper()} FEEDBACK SAMPLES (5):")
    print("-" * 65)
    samples = df[df['Predicted_Sentiment']==sentiment]\
        ['Customer_Feedback'].sample(5, random_state=42).values
    for i, fb in enumerate(samples, 1):
        print(f"[{i}] {fb[:120]}...")
        print()
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
        nps        = 9
        nps_cat    = 'Promoter'
    elif prob <= 0.35:
        sentiment  = 'Negative'
        confidence = round((1-prob) * 100, 2)
        csat, dsat = 0, 1
        nps        = 2
        nps_cat    = 'Detractor'
    else:
        sentiment  = 'Neutral'
        confidence = round(max(prob, 1-prob) * 100, 2)
        csat, dsat = 0, 0
        nps        = 6
        nps_cat    = 'Passive'

    return sentiment, confidence, csat, dsat, nps, nps_cat

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
    sent, conf, csat, dsat, nps, nps_cat = predict_sentiment(
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
print("   STEP 7 - PREDICTED VS ACTUAL")
print("=" * 65)
print()

correct   = sum(
    1 for pred, actual in
    zip(sentiments, df['Predicted_Sentiment'])
    if pred == actual
)
accuracy  = correct / total * 100
pred_pos  = sentiments.count('Positive')
pred_neg  = sentiments.count('Negative')
pred_neu  = sentiments.count('Neutral')
pred_csat = sum(csat_preds)
pred_dsat = sum(dsat_preds)

print(f"ACTUAL (from dataset):")
print(f"   Positive : {pos_count:,} ({pos_count/total*100:.1f}%)")
print(f"   Negative : {neg_count:,} ({neg_count/total*100:.1f}%)")
print(f"   Neutral  : {neu_count:,} ({neu_count/total*100:.1f}%)")
print(f"   CSAT%    : {csat_count/total*100:.1f}%")
print(f"   DSAT%    : {dsat_count/total*100:.1f}%")
print()
print(f"PREDICTED (by model):")
print(f"   Positive : {pred_pos:,} ({pred_pos/total*100:.1f}%)")
print(f"   Negative : {pred_neg:,} ({pred_neg/total*100:.1f}%)")
print(f"   Neutral  : {pred_neu:,} ({pred_neu/total*100:.1f}%)")
print(f"   CSAT%    : {pred_csat/total*100:.1f}%")
print(f"   DSAT%    : {pred_dsat/total*100:.1f}%")
print()
print(f"Model Accuracy : {accuracy:.1f}%")
print()
print("[OK] STEP 7 - Comparison done!")
print()




# ============================================================
# STEP 8 - SAMPLE RESULTS (50 feedbacks)
# ============================================================
print("=" * 65)
print("   STEP 8 - SAMPLE RESULTS (50 feedbacks)")
print("=" * 65)
print()

sample    = df.sample(50, random_state=42).reset_index(drop=True)
correct_s = 0
wrong_s   = 0

print("50 predictions vs actual:")
print("=" * 65)

for i in range(50):
    fb          = sample['Customer_Feedback'].iloc[i]
    employee    = sample['Employee_Name'].iloc[i]
    dept        = sample['Department'].iloc[i]
    issue       = sample['Issue_Category'].iloc[i]
    priority    = sample['Priority'].iloc[i]
    sla         = sample['SLA_Breached'].iloc[i]
    rating      = sample['Star_Rating'].iloc[i]
    actual_sent = sample['Predicted_Sentiment'].iloc[i]
    actual_csat = sample['CSAT'].iloc[i]
    actual_dsat = sample['DSAT'].iloc[i]
    actual_nps  = sample['NPS_Score'].iloc[i]
    actual_cat  = sample['NPS_Category'].iloc[i]

    sent, conf, csat, dsat, nps, nps_cat = predict_sentiment(fb)
    bar = "#" * int(conf // 5)

    if sent == actual_sent:
        correct_s += 1
        match = "[CORRECT]"
    else:
        wrong_s += 1
        match = "[WRONG]  "

    print(f"[{i+1:2d}] Employee  : {employee} ({dept})")
    print(f"     Issue    : {issue} | Priority:{priority} | SLA:{sla}")
    print(f"     Feedback : {fb[:80]}...")
    print(f"     Predicted: {sent:10s} | {bar} {conf}%")
    print(f"     CSAT:{csat} DSAT:{dsat} | NPS:{nps} {nps_cat}")
    print(f"     Actual   : {actual_sent:10s} | Rating:{rating} "
          f"CSAT:{actual_csat} DSAT:{actual_dsat} "
          f"NPS:{actual_nps} {actual_cat} | {match}")
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
print(f"   Total Feedbacks : {total:,}")
print(f"   Positive        : {pos_count:,} ({pos_count/total*100:.1f}%)")
print(f"   Negative        : {neg_count:,} ({neg_count/total*100:.1f}%)")
print(f"   Neutral         : {neu_count:,} ({neu_count/total*100:.1f}%)")
print(f"   CSAT%           : {csat_count/total*100:.1f}%")
print(f"   DSAT%           : {dsat_count/total*100:.1f}%")
print(f"   SLA Breach%     : {sla_breach/total*100:.1f}%")
print(f"   Model Accuracy  : {accuracy:.1f}%")
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
    'SentimentIQ - Internal Employee Feedback Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Sentiment Distribution
axes[0,0].pie(
    [pos_count, neg_count, neu_count],
    labels=[f'Positive\n{pos_count:,}',
            f'Negative\n{neg_count:,}',
            f'Neutral\n{neu_count:,}'],
    colors=['#22c55e','#ef4444','#3b82f6'],
    autopct='%1.1f%%', startangle=90
)
axes[0,0].set_title('Sentiment Distribution',
                     fontweight='bold')

# Graph 2 - CSAT vs DSAT
cats = ['CSAT\n(Satisfied)',
        'DSAT\n(Dissatisfied)',
        'Neutral']
vals = [csat_count, dsat_count, neu_count]
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

# Graph 6 - NPS Distribution
nps_data = df.groupby(
    ['Predicted_Sentiment','NPS_Category']
).size().unstack(fill_value=0)
nps_data.plot(
    kind='bar', ax=axes[1,2],
    color=['#ef4444','#22c55e','#eab308']
)
axes[1,2].set_title('NPS by Sentiment',
                     fontweight='bold')
axes[1,2].set_ylabel('Count')
axes[1,2].tick_params(axis='x', rotation=0)
axes[1,2].legend(loc='upper right')

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

df['Model_Sentiment'] = sentiments
df['Confidence']      = confidences
df['Model_CSAT']      = csat_preds
df['Model_DSAT']      = dsat_preds

df.to_csv('internal_predicted_results.csv', index=False)
print("[OK] Saved to internal_predicted_results.csv")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   SENTIMENTIQ - INTERNAL ANALYSIS COMPLETE")
print("=" * 65)
print()
print(f"   Dataset         : Internal_Employee_Feedback_Balanced.csv")
print(f"   Total Feedbacks : {total:,}")
print(f"   Positive        : {pos_count:,} ({pos_count/total*100:.1f}%)")
print(f"   Negative        : {neg_count:,} ({neg_count/total*100:.1f}%)")
print(f"   Neutral         : {neu_count:,} ({neu_count/total*100:.1f}%)")
print(f"   CSAT%           : {csat_count/total*100:.1f}%")
print(f"   DSAT%           : {dsat_count/total*100:.1f}%")
print(f"   SLA Breach%     : {sla_breach/total*100:.1f}%")
print(f"   Model Accuracy  : {accuracy:.1f}%")
print(f"   Time Taken      : {elapsed:.1f}s")
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
