# ============================================================
# SENTIMENTIQ - PREDICT ON IT FEEDBACK WITHOUT SCORES
# Input  : IT_Feedback_WITHOUT_Scores.csv
# Output : IT_Predicted_Results.csv with full scores
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
print("   SENTIMENTIQ - PREDICT ON IT FEEDBACK")
print("   No sentiment column — model predicts all!")
print("=" * 65)
print()




# ============================================================
# STEP 1 - LOAD SAVED MODEL
# ============================================================
print("=" * 65)
print("   STEP 1 - LOADING SAVED MODEL")
print("=" * 65)
print()

print("Loading model... please wait...")
model     = tf.keras.models.load_model('best_bilstm_model.h5')
tokenizer = pickle.load(open('tokenizer.pkl', 'rb'))

print("[OK] Model loaded!")
print("[OK] Tokenizer loaded!")
print()




# ============================================================
# STEP 2 - LOAD IT FEEDBACK WITHOUT SCORES
# ============================================================
print("=" * 65)
print("   STEP 2 - LOADING IT FEEDBACK WITHOUT SCORES")
print("=" * 65)
print()

df = pd.read_csv("IT_Feedback_WITHOUT_Scores.csv")

print(f"[OK] Dataset loaded!")
print(f"   Total rows : {len(df):,}")
print(f"   Columns    : {list(df.columns)}")
print()
print("NOTE: No sentiment column!")
print("Model will predict sentiment + CSAT + DSAT!")
print()
print("First 5 rows:")
print("-" * 65)
for i in range(5):
    print(f"Company  : {df['Client_Company'].iloc[i]}")
    print(f"Industry : {df['Industry'].iloc[i]}")
    print(f"Feedback : {df['Client_Feedback'].iloc[i][:100]}...")
    print()




# ============================================================
# STEP 3 - HELPER FUNCTIONS
# ============================================================
print("=" * 65)
print("   STEP 3 - SETTING UP FUNCTIONS")
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
    padded   = pad_sequences(sequence, maxlen=MAX_LEN,
                             padding='post', truncating='post')
    prob     = float(model.predict(padded, verbose=0)[0][0])
    if prob >= 0.65:
        return "Positive", round(prob * 100, 2)
    elif prob <= 0.35:
        return "Negative", round((1 - prob) * 100, 2)
    else:
        return "Neutral",  round(max(prob, 1-prob) * 100, 2)

def get_scores(sentiment, confidence):
    if sentiment == "Positive":
        if confidence >= 90:   csat = 10
        elif confidence >= 80: csat = 9
        elif confidence >= 70: csat = 8
        else:                  csat = 7
        return csat, 0, 1, 0
    elif sentiment == "Negative":
        if confidence >= 90:   dsat = 10
        elif confidence >= 80: dsat = 9
        elif confidence >= 70: dsat = 8
        else:                  dsat = 7
        return 0, dsat, 0, 1
    else:
        return 5, 5, 0, 0

print("[OK] STEP 3 - Functions ready!")
print()




# ============================================================
# STEP 4 - PREDICT SENTIMENT AND SCORES
# ============================================================
print("=" * 65)
print("   STEP 4 - PREDICTING SENTIMENT + CSAT + DSAT")
print("=" * 65)
print()

total      = len(df)
sentiments = []
confidences= []
csat_scales= []
dsat_scales= []
csat_flags = []
dsat_flags = []
start      = time.time()

print(f"Analysing {total:,} feedbacks...")
print()

for i, feedback in enumerate(df['Client_Feedback']):
    sent, conf                          = predict_sentiment(str(feedback))
    csat_sc, dsat_sc, csat_fl, dsat_fl  = get_scores(sent, conf)

    sentiments.append(sent)
    confidences.append(conf)
    csat_scales.append(csat_sc)
    dsat_scales.append(dsat_sc)
    csat_flags.append(csat_fl)
    dsat_flags.append(dsat_fl)

    if (i+1) % 1000 == 0 or (i+1) == total:
        elapsed = time.time() - start
        pct     = (i+1) / total * 100
        print(f"   Progress: {i+1:,}/{total:,} "
              f"({pct:.1f}%) | Time: {elapsed:.0f}s")

elapsed = time.time() - start

df['Predicted_Sentiment'] = sentiments
df['Confidence']          = confidences
df['CSAT_Score_Scale']    = csat_scales
df['DSAT_Score_Scale']    = dsat_scales
df['CSAT_Flag']           = csat_flags
df['DSAT_Flag']           = dsat_flags

print()
print(f"[OK] STEP 4 - Done in {elapsed:.1f}s!")
print()




# ============================================================
# STEP 5 - SAMPLE RESULTS
# ============================================================
print("=" * 65)
print("   STEP 5 - SAMPLE RESULTS (50 feedbacks)")
print("=" * 65)
print()

sample = df.sample(50, random_state=42).reset_index(drop=True)

pos_count = 0
neg_count = 0
neu_count = 0

for i in range(50):
    feedback = sample['Client_Feedback'].iloc[i]
    company  = sample['Client_Company'].iloc[i]
    industry = sample['Industry'].iloc[i]
    sent     = sample['Predicted_Sentiment'].iloc[i]
    conf     = sample['Confidence'].iloc[i]
    csat_sc  = sample['CSAT_Score_Scale'].iloc[i]
    dsat_sc  = sample['DSAT_Score_Scale'].iloc[i]
    bar      = "#" * int(conf // 5)

    if sent == "Positive": pos_count += 1
    elif sent == "Negative": neg_count += 1
    else: neu_count += 1

    print(f"[{i+1:2d}] Company   : {company} ({industry})")
    print(f"     Feedback  : {feedback[:80]}...")
    print(f"     Sentiment : {sent:10s} | {bar} {conf}%")
    print(f"     CSAT Score: {csat_sc}/10 | DSAT Score: {dsat_sc}/10")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Positive : {pos_count}")
print(f"   Negative : {neg_count}")
print(f"   Neutral  : {neu_count}")
print()




# ============================================================
# STEP 6 - BUSINESS INSIGHTS
# ============================================================
print("=" * 65)
print("   STEP 6 - BUSINESS INSIGHTS")
print("=" * 65)
print()

pos_total  = sentiments.count('Positive')
neg_total  = sentiments.count('Negative')
neu_total  = sentiments.count('Neutral')
csat_pct   = sum(csat_flags) / total * 100
dsat_pct   = sum(dsat_flags) / total * 100
avg_conf   = sum(confidences) / total
avg_csat   = sum(s for s in csat_scales if s > 0) / max(sum(csat_flags), 1)
avg_dsat   = sum(s for s in dsat_scales if s > 0) / max(sum(dsat_flags), 1)

print(f"Total Feedbacks  : {total:,}")
print()
print(f"Sentiment Breakdown:")
print(f"   Positive : {pos_total:,} ({pos_total/total*100:.1f}%)")
print(f"   Negative : {neg_total:,} ({neg_total/total*100:.1f}%)")
print(f"   Neutral  : {neu_total:,} ({neu_total/total*100:.1f}%)")
print()
print(f"CSAT/DSAT Scores:")
print(f"   CSAT%          : {csat_pct:.1f}%")
print(f"   DSAT%          : {dsat_pct:.1f}%")
print(f"   Avg CSAT Scale : {avg_csat:.1f}/10")
print(f"   Avg DSAT Scale : {avg_dsat:.1f}/10")
print(f"   Avg Confidence : {avg_conf:.1f}%")
print()

print("CSAT% by Industry:")
ind_csat = df.groupby('Industry')['CSAT_Flag'].mean()*100
for ind, val in ind_csat.sort_values(ascending=False).items():
    bar = "#" * int(val/5)
    print(f"   {ind:25s} : {val:.1f}% {bar}")
print()

print("DSAT% by Industry:")
ind_dsat = df.groupby('Industry')['DSAT_Flag'].mean()*100
for ind, val in ind_dsat.sort_values(ascending=False).items():
    bar = "#" * int(val/5)
    print(f"   {ind:25s} : {val:.1f}% {bar}")
print()

print("Manager Performance (CSAT Score):")
mgr_csat = df.groupby('Project_Manager')['CSAT_Score_Scale'].mean()
for mgr, val in mgr_csat.sort_values(ascending=False).items():
    print(f"   {mgr:20s} : {val:.1f}/10")
print()

print("DSAT% by Project Type:")
proj_dsat = df.groupby('Project_Type')['DSAT_Flag'].mean()*100
for proj, val in proj_dsat.sort_values(ascending=False).head(5).items():
    print(f"   {proj:30s} : {val:.1f}%")
print()




# ============================================================
# STEP 7 - VISUALIZATIONS
# ============================================================
print("=" * 65)
print("   STEP 7 - GENERATING VISUALIZATIONS")
print("=" * 65)
print()

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle(
    'SentimentIQ - IT Feedback WITHOUT Scores Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Sentiment Distribution
axes[0,0].pie([pos_total, neg_total, neu_total],
    labels=[f'Positive\n{pos_total:,}',
            f'Negative\n{neg_total:,}',
            f'Neutral\n{neu_total:,}'],
    colors=['#22c55e','#ef4444','#3b82f6'],
    autopct='%1.1f%%', startangle=90)
axes[0,0].set_title('Predicted Sentiment Distribution',
                     fontweight='bold')

# Graph 2 - CSAT DSAT Bar
cats  = ['CSAT\n(Satisfied)', 'DSAT\n(Dissatisfied)', 'Neutral']
vals  = [sum(csat_flags), sum(dsat_flags), neu_total]
cols  = ['#22c55e','#ef4444','#3b82f6']
bars  = axes[0,1].bar(cats, vals, color=cols)
axes[0,1].set_title('CSAT vs DSAT Count', fontweight='bold')
axes[0,1].set_ylabel('Number of Clients')
for bar, val in zip(bars, vals):
    axes[0,1].text(bar.get_x()+bar.get_width()/2,
                   bar.get_height()+5, f'{val:,}',
                   ha='center', fontweight='bold')

# Graph 3 - CSAT by Industry
ind_csat.sort_values().plot(kind='barh',
                             ax=axes[0,2], color='#22c55e')
axes[0,2].set_title('CSAT% by Industry', fontweight='bold')
axes[0,2].set_xlabel('CSAT %')

# Graph 4 - DSAT by Industry
ind_dsat.sort_values(ascending=False).plot(
    kind='bar', ax=axes[1,0], color='#ef4444')
axes[1,0].set_title('DSAT% by Industry', fontweight='bold')
axes[1,0].set_ylabel('DSAT %')
axes[1,0].tick_params(axis='x', rotation=45)

# Graph 5 - Manager Performance
mgr_csat.sort_values(ascending=False).plot(
    kind='bar', ax=axes[1,1], color='#6366f1')
axes[1,1].set_title('CSAT Score by Manager', fontweight='bold')
axes[1,1].set_ylabel('Avg CSAT Score (0-10)')
axes[1,1].tick_params(axis='x', rotation=45)

# Graph 6 - Confidence Distribution
axes[1,2].hist(confidences, bins=20,
               color='#6366f1', edgecolor='white')
axes[1,2].axvline(avg_conf, color='red', linestyle='--',
                  label=f'Mean: {avg_conf:.1f}%')
axes[1,2].set_title('Confidence Distribution', fontweight='bold')
axes[1,2].set_xlabel('Confidence %')
axes[1,2].set_ylabel('Count')
axes[1,2].legend()

plt.tight_layout()
plt.savefig('it_without_scores_graph.png',
            dpi=150, bbox_inches='tight')
print("[OK] Graph saved as it_without_scores_graph.png")
plt.show()
print()




# ============================================================
# STEP 8 - SAVE RESULTS
# ============================================================
print("=" * 65)
print("   STEP 8 - SAVING RESULTS")
print("=" * 65)
print()

df.to_csv('IT_Predicted_Results.csv', index=False)
print("[OK] Results saved to IT_Predicted_Results.csv")
print()
print("New columns added by model:")
print("   Predicted_Sentiment : Positive/Negative/Neutral")
print("   Confidence          : Model confidence %")
print("   CSAT_Score_Scale    : 0 to 10")
print("   DSAT_Score_Scale    : 0 to 10")
print("   CSAT_Flag           : 1=Satisfied 0=Not")
print("   DSAT_Flag           : 1=Dissatisfied 0=Not")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   PREDICTION COMPLETE - IT FEEDBACK WITHOUT SCORES")
print("=" * 65)
print()
print(f"   Dataset        : IT_Feedback_WITHOUT_Scores.csv")
print(f"   Total rows     : {total:,}")
print(f"   Positive       : {pos_total:,} ({pos_total/total*100:.1f}%)")
print(f"   Negative       : {neg_total:,} ({neg_total/total*100:.1f}%)")
print(f"   Neutral        : {neu_total:,} ({neu_total/total*100:.1f}%)")
print(f"   CSAT%          : {csat_pct:.1f}%")
print(f"   DSAT%          : {dsat_pct:.1f}%")
print(f"   Avg CSAT Scale : {avg_csat:.1f}/10")
print(f"   Avg DSAT Scale : {avg_dsat:.1f}/10")
print(f"   Avg Confidence : {avg_conf:.1f}%")
print(f"   Time Taken     : {elapsed:.1f}s")
print()
print("   Output Files:")
print("   IT_Predicted_Results.csv      - Full results")
print("   it_without_scores_graph.png   - Graphs")
print("=" * 65)
