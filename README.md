# ============================================================
# SENTIMENTIQ - MODEL FOR EXTERNAL CLIENT FEEDBACK
# Dataset : External_Client_Feedback_Balanced.csv
# Shows   : CSAT% DSAT% Positive% Negative%
#           Sample comments for each
#           Model trained and evaluated
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']       = ''
os.environ['REQUESTS_CA_BUNDLE']   = ''
os.environ['PYTHONHTTPSVERIFY']    = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import pandas                as pd
import numpy                 as np
import matplotlib.pyplot     as plt
import seaborn               as sns
import re
import random
import time
import warnings
import pickle

from sklearn.metrics import (classification_report,
                             confusion_matrix,
                             accuracy_score)

import tensorflow as tf
from tensorflow.keras.models         import Sequential
from tensorflow.keras.layers         import (Embedding,
                                             Bidirectional,
                                             LSTM, Dense,
                                             Dropout,
                                             SpatialDropout1D)
from tensorflow.keras.preprocessing.text     import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks      import (EarlyStopping,
                                             ModelCheckpoint,
                                             ReduceLROnPlateau)

warnings.filterwarnings('ignore')

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

MAX_WORDS  = 20000
MAX_LEN    = 200
EMBED_DIM  = 128
LSTM_UNITS = 128
NUM_EPOCHS = 10
BATCH_SIZE = 64
LR         = 0.001

print("=" * 65)
print("   SENTIMENTIQ - EXTERNAL CLIENT FEEDBACK ANALYSIS")
print("=" * 65)
print()




# ============================================================
# STEP 1 - LOAD DATASET
# ============================================================
print("=" * 65)
print("   STEP 1 - LOADING DATASET")
print("=" * 65)
print()

df = pd.read_csv("External_Client_Feedback_Balanced.csv")
print(f"[OK] Dataset loaded!")
print(f"   Total rows    : {len(df):,}")
print(f"   Total columns : {len(df.columns)}")
print()




# ============================================================
# STEP 2 - SHOW PERCENTAGES
# ============================================================
print("=" * 65)
print("   STEP 2 - CSAT DSAT PERCENTAGES")
print("=" * 65)
print()

total     = len(df)
pos_count = len(df[df['Predicted_Sentiment']=='Positive'])
neg_count = len(df[df['Predicted_Sentiment']=='Negative'])
csat_count = df['CSAT'].sum()
dsat_count = df['DSAT'].sum()

pos_pct  = pos_count  / total * 100
neg_pct  = neg_count  / total * 100
csat_pct = csat_count / total * 100
dsat_pct = dsat_count / total * 100

print(f"FEEDBACK SENTIMENT:")
print(f"   Positive : {pos_count:,} ({pos_pct:.1f}%)")
print(f"   Negative : {neg_count:,} ({neg_pct:.1f}%)")
print()
print(f"CSAT (Satisfied Clients):")
print(f"   CSAT = 1 : {csat_count:,} ({csat_pct:.1f}%) ← positive feedback")
print(f"   CSAT = 0 : {total-csat_count:,} ({100-csat_pct:.1f}%)")
print()
print(f"DSAT (Dissatisfied Clients):")
print(f"   DSAT = 1 : {dsat_count:,} ({dsat_pct:.1f}%) ← negative feedback")
print(f"   DSAT = 0 : {total-dsat_count:,} ({100-dsat_pct:.1f}%)")
print()
print(f"NPS DISTRIBUTION:")
nps = df.groupby(['Predicted_Sentiment','NPS_Category']).size()
for (sent,cat), count in nps.items():
    pct = count/total*100
    print(f"   {sent:10s} → {cat:10s} : {count:,} ({pct:.1f}%)")
print()




# ============================================================
# STEP 3 - SHOW SAMPLE COMMENTS
# ============================================================
print("=" * 65)
print("   STEP 3 - SAMPLE COMMENTS")
print("=" * 65)
print()

print("POSITIVE FEEDBACK SAMPLES (10):")
print("-" * 65)
pos_samples = df[df['Predicted_Sentiment']=='Positive']\
    ['Client_Feedback'].sample(10, random_state=SEED).values
for i, fb in enumerate(pos_samples, 1):
    print(f"[{i:2d}] {fb[:120]}...")
    print()

print()
print("NEGATIVE FEEDBACK SAMPLES (10):")
print("-" * 65)
neg_samples = df[df['Predicted_Sentiment']=='Negative']\
    ['Client_Feedback'].sample(10, random_state=SEED).values
for i, fb in enumerate(neg_samples, 1):
    print(f"[{i:2d}] {fb[:120]}...")
    print()




# ============================================================
# STEP 4 - PREPROCESSING
# ============================================================
print("=" * 65)
print("   STEP 4 - PREPROCESSING TEXT")
print("=" * 65)
print()

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r'<.*?>',       ' ', text)
    text = re.sub(r'http\S+',     ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+',         ' ', text).strip()
    return text

df['clean'] = df['Client_Feedback'].apply(preprocess)

print("Before:", df['Client_Feedback'].iloc[0][:100])
print("After :", df['clean'].iloc[0][:100])
print()
print("[OK] STEP 4 - Preprocessing done!")
print()




# ============================================================
# STEP 5 - PREPARE LABELS
# ============================================================
print("=" * 65)
print("   STEP 5 - PREPARING LABELS")
print("=" * 65)
print()

print("Label mapping:")
print("   Positive → 1")
print("   Negative → 0")
print()

df['label'] = df['Predicted_Sentiment'].map({
    'Positive': 1,
    'Negative': 0
})

print(f"Label distribution:")
print(f"   1 (Positive) : {df['label'].sum():,}")
print(f"   0 (Negative) : {(df['label']==0).sum():,}")
print()
print("[OK] STEP 5 - Labels ready!")
print()




# ============================================================
# STEP 6 - TOKENIZATION
# ============================================================
print("=" * 65)
print("   STEP 6 - TOKENIZATION")
print("=" * 65)
print()

tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
tokenizer.fit_on_texts(df['clean'])

X = tokenizer.texts_to_sequences(df['clean'])
X = pad_sequences(X, maxlen=MAX_LEN,
                  padding='post', truncating='post')
y = df['label'].values

pickle.dump(tokenizer, open('tokenizer.pkl', 'wb'))

print(f"Vocabulary : {len(tokenizer.word_index):,} words")
print(f"Shape      : {X.shape}")
print()
print("[OK] STEP 6 - Tokenizer saved!")
print()




# ============================================================
# STEP 7 - SPLIT DATA
# ============================================================
print("=" * 65)
print("   STEP 7 - SPLITTING DATA")
print("=" * 65)
print()

split       = int(0.8 * len(X))
X_train     = X[:split]
X_test      = X[split:]
y_train     = y[:split]
y_test      = y[split:]
y_test_list = y_test.tolist()

print(f"Training : {len(X_train):,} (80%)")
print(f"Testing  : {len(X_test):,}  (20%)")
print()
print("[OK] STEP 7 - Split complete!")
print()




# ============================================================
# STEP 8 - BUILD BILSTM MODEL
# ============================================================
print("=" * 65)
print("   STEP 8 - BUILDING BILSTM MODEL")
print("=" * 65)
print()

model = Sequential([
    Embedding(MAX_WORDS, EMBED_DIM, input_length=MAX_LEN),
    SpatialDropout1D(0.3),
    Bidirectional(LSTM(LSTM_UNITS,
                       dropout=0.2,
                       recurrent_dropout=0.2,
                       return_sequences=True)),
    Bidirectional(LSTM(64,
                       dropout=0.2,
                       recurrent_dropout=0.2)),
    Dense(64, activation='relu'),
    Dropout(0.4),
    Dense(1,  activation='sigmoid')
])

model.compile(
    optimizer = tf.keras.optimizers.Adam(learning_rate=LR),
    loss      = 'binary_crossentropy',
    metrics   = ['accuracy']
)

model.summary()
print()
print("[OK] STEP 8 - Model built!")
print()




# ============================================================
# STEP 9 - TRAINING
# ============================================================
print("=" * 65)
print("   STEP 9 - TRAINING MODEL")
print("=" * 65)
print()
print("Training on Client Feedback dataset...")
print("Watch live progress below:")
print()

early_stop = EarlyStopping(
    monitor='val_loss', patience=3,
    restore_best_weights=True, verbose=1
)
checkpoint = ModelCheckpoint(
    'best_bilstm_model.h5',
    monitor='val_accuracy',
    save_best_only=True, verbose=1
)
reduce_lr  = ReduceLROnPlateau(
    monitor='val_loss', factor=0.5,
    patience=2, verbose=1
)

start_time = time.time()

history = model.fit(
    X_train, y_train,
    epochs           = NUM_EPOCHS,
    batch_size       = BATCH_SIZE,
    validation_split = 0.2,
    callbacks        = [early_stop, checkpoint, reduce_lr],
    verbose          = 1
)

train_time = time.time() - start_time
print()
print(f"[OK] Training done in {train_time:.1f}s!")
print()




# ============================================================
# STEP 10 - EVALUATE
# ============================================================
print("=" * 65)
print("   STEP 10 - EVALUATING MODEL")
print("=" * 65)
print()

y_pred_prob = model.predict(X_test, verbose=0)
y_pred      = (y_pred_prob > 0.5).astype(int).flatten()
accuracy    = accuracy_score(y_test, y_pred) * 100

print(f"Model Accuracy : {accuracy:.2f}%")
print()
print("Classification Report:")
print("-" * 65)
print(classification_report(
    y_test, y_pred,
    target_names=['Negative','Positive']
))
print("[OK] STEP 10 - Evaluation done!")
print()




# ============================================================
# STEP 11 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 11 - PREDICTION FUNCTION")
print("=" * 65)
print()

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
        # NPS linked to positive
        nps = random.randint(7, 10)
        nps_cat = 'Promoter' if nps >= 9 else 'Passive'
    elif prob <= 0.35:
        sentiment  = 'Negative'
        confidence = round((1 - prob) * 100, 2)
        csat, dsat = 0, 1
        # NPS linked to negative
        nps = random.randint(0, 6)
        nps_cat = 'Detractor'
    else:
        sentiment  = 'Neutral'
        confidence = round(max(prob, 1-prob) * 100, 2)
        csat, dsat = 0, 0
        nps = random.randint(5, 7)
        nps_cat = 'Passive'

    return sentiment, confidence, csat, dsat, nps, nps_cat

print("Logic:")
print("   Positive  → CSAT=1 DSAT=0 NPS 7-10 Promoter/Passive")
print("   Negative  → CSAT=0 DSAT=1 NPS 0-6  Detractor")
print("   Neutral   → CSAT=0 DSAT=0 NPS 5-7  Passive")
print()
print("[OK] STEP 11 - Function ready!")
print()




# ============================================================
# STEP 12 - SAMPLE RESULTS WITH CSAT DSAT NPS
# ============================================================
print("=" * 65)
print("   STEP 12 - SAMPLE RESULTS (50 feedbacks)")
print("=" * 65)
print()

sample      = df.sample(50, random_state=SEED).reset_index(drop=True)
correct     = 0
wrong       = 0

pos_correct = 0
neg_correct = 0

print("50 predictions with CSAT DSAT NPS:")
print("=" * 65)

for i in range(50):
    fb           = sample['Client_Feedback'].iloc[i]
    company      = sample['Client_Company'].iloc[i]
    actual_sent  = sample['Predicted_Sentiment'].iloc[i]
    actual_csat  = sample['CSAT'].iloc[i]
    actual_dsat  = sample['DSAT'].iloc[i]
    actual_nps   = sample['NPS_Score'].iloc[i]
    actual_npscat= sample['NPS_Category'].iloc[i]

    sent, conf, csat, dsat, nps, nps_cat = predict_sentiment(fb)
    bar   = "#" * int(conf // 5)

    if sent == actual_sent:
        correct += 1
        match = "[CORRECT]"
        if sent == 'Positive': pos_correct += 1
        else:                  neg_correct += 1
    else:
        wrong += 1
        match = "[WRONG]  "

    print(f"[{i+1:2d}] Company   : {company}")
    print(f"     Feedback  : {fb[:80]}...")
    print(f"     Predicted : {sent:10s} | {bar} {conf}%")
    print(f"     CSAT      : {csat} | DSAT : {dsat}")
    print(f"     NPS Score : {nps} | Category : {nps_cat}")
    print(f"     Actual    : {actual_sent:10s} | CSAT:{actual_csat} DSAT:{actual_dsat} NPS:{actual_nps} {actual_npscat} | {match}")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Total    : 50")
print(f"   Correct  : {correct} ({correct/50*100:.1f}%)")
print(f"   Wrong    : {wrong}  ({wrong/50*100:.1f}%)")
print()




# ============================================================
# STEP 13 - BUSINESS INSIGHTS
# ============================================================
print("=" * 65)
print("   STEP 13 - BUSINESS INSIGHTS")
print("=" * 65)
print()

pos_total  = len(df[df['Predicted_Sentiment']=='Positive'])
neg_total  = len(df[df['Predicted_Sentiment']=='Negative'])
csat_total = df['CSAT'].sum()
dsat_total = df['DSAT'].sum()

print(f"Overall Summary:")
print(f"   Total Feedbacks  : {total:,}")
print(f"   Positive         : {pos_total:,} ({pos_total/total*100:.1f}%)")
print(f"   Negative         : {neg_total:,} ({neg_total/total*100:.1f}%)")
print(f"   CSAT%            : {csat_total/total*100:.1f}%")
print(f"   DSAT%            : {dsat_total/total*100:.1f}%")
print()

print("CSAT% by Industry:")
for ind, val in df.groupby('Industry')['CSAT'].mean().sort_values(ascending=False).items():
    bar = "#" * int(val*20)
    print(f"   {ind:20s} : {val*100:.1f}% {bar}")
print()

print("DSAT% by Industry:")
for ind, val in df.groupby('Industry')['DSAT'].mean().sort_values(ascending=False).items():
    bar = "#" * int(val*20)
    print(f"   {ind:20s} : {val*100:.1f}% {bar}")
print()

print("Best Agent by CSAT:")
for agent, val in df.groupby('Assigned_Agent')['CSAT'].mean().sort_values(ascending=False).items():
    print(f"   {agent:20s} : {val*100:.1f}%")
print()

print("NPS by Sentiment:")
for sent in ['Positive','Negative']:
    avg_nps = df[df['Predicted_Sentiment']==sent]['NPS_Score'].mean()
    print(f"   {sent:10s} → Avg NPS: {avg_nps:.1f}")
print()

sla_breach = len(df[df['SLA_Breached']=='Yes'])
print(f"SLA Breach% : {sla_breach/total*100:.1f}%")
print()




# ============================================================
# STEP 14 - VISUALIZATIONS
# ============================================================
print("=" * 65)
print("   STEP 14 - GENERATING VISUALIZATIONS")
print("=" * 65)
print()

epochs_range = range(1, len(history.history['accuracy'])+1)

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle(
    'SentimentIQ - External Client Feedback Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Training Accuracy
axes[0,0].plot(epochs_range,
               [a*100 for a in history.history['accuracy']],
               'o-', label='Train', color='#1D9E75', linewidth=2)
axes[0,0].plot(epochs_range,
               [a*100 for a in history.history['val_accuracy']],
               's--', label='Val', color='#D85A30', linewidth=2)
axes[0,0].set_title('Training vs Validation Accuracy', fontweight='bold')
axes[0,0].set_xlabel('Epoch')
axes[0,0].set_ylabel('Accuracy (%)')
axes[0,0].set_ylim(50,100)
axes[0,0].legend()
axes[0,0].grid(alpha=0.3)

# Graph 2 - CSAT vs DSAT
axes[0,1].pie(
    [csat_total, dsat_total],
    labels=[f'CSAT\n{csat_total:,}\n({csat_total/total*100:.1f}%)',
            f'DSAT\n{dsat_total:,}\n({dsat_total/total*100:.1f}%)'],
    colors=['#22c55e','#ef4444'],
    autopct='%1.1f%%', startangle=90
)
axes[0,1].set_title('CSAT vs DSAT Distribution', fontweight='bold')

# Graph 3 - Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Negative','Positive'],
            yticklabels=['Negative','Positive'],
            ax=axes[0,2])
axes[0,2].set_title('Confusion Matrix', fontweight='bold')
axes[0,2].set_xlabel('Predicted')
axes[0,2].set_ylabel('Actual')

# Graph 4 - CSAT by Industry
ind_csat = df.groupby('Industry')['CSAT'].mean()*100
ind_csat.sort_values().plot(kind='barh', ax=axes[1,0], color='#22c55e')
axes[1,0].set_title('CSAT% by Industry', fontweight='bold')
axes[1,0].set_xlabel('CSAT %')

# Graph 5 - NPS Distribution
nps_counts = df.groupby(['Predicted_Sentiment','NPS_Category']).size().unstack()
nps_counts.plot(kind='bar', ax=axes[1,1],
                color=['#ef4444','#22c55e','#eab308'])
axes[1,1].set_title('NPS Category by Sentiment', fontweight='bold')
axes[1,1].set_ylabel('Count')
axes[1,1].tick_params(axis='x', rotation=0)

# Graph 6 - DSAT by Industry
ind_dsat = df.groupby('Industry')['DSAT'].mean()*100
ind_dsat.sort_values(ascending=False).plot(
    kind='bar', ax=axes[1,2], color='#ef4444')
axes[1,2].set_title('DSAT% by Industry', fontweight='bold')
axes[1,2].set_ylabel('DSAT %')
axes[1,2].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.savefig('client_feedback_graph.png', dpi=150, bbox_inches='tight')
print("[OK] Graph saved as client_feedback_graph.png")
plt.show()
print()




# ============================================================
# STEP 15 - SAVE MODEL
# ============================================================
print("=" * 65)
print("   STEP 15 - SAVING MODEL")
print("=" * 65)
print()

model.save('bilstm_tf_model.h5')
print("[OK] Model saved : bilstm_tf_model.h5")
print("[OK] Best model  : best_bilstm_model.h5")
print("[OK] Tokenizer   : tokenizer.pkl")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   ANALYSIS COMPLETE")
print("=" * 65)
print()
print(f"   Dataset          : External_Client_Feedback_Balanced.csv")
print(f"   Total Feedbacks  : {total:,}")
print(f"   Positive         : {pos_total:,} ({pos_total/total*100:.1f}%)")
print(f"   Negative         : {neg_total:,} ({neg_total/total*100:.1f}%)")
print(f"   CSAT%            : {csat_total/total*100:.1f}%")
print(f"   DSAT%            : {dsat_total/total*100:.1f}%")
print(f"   Model Accuracy   : {accuracy:.2f}%")
print(f"   Training Time    : {train_time:.1f}s")
print()
print("   Links:")
print("   Positive → CSAT=1, DSAT=0, NPS 7-10, Promoter/Passive")
print("   Negative → CSAT=0, DSAT=1, NPS 0-6,  Detractor")
print()
print("   Output Files:")
print("   best_bilstm_model.h5      - Best model")
print("   bilstm_tf_model.h5        - Final model")
print("   tokenizer.pkl             - Tokenizer")
print("   client_feedback_graph.png - Graphs")
print("=" * 65)