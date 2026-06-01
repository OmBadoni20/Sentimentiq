# ============================================================
# SENTIMENTIQ - TRAIN ON IT FEEDBACK WITH SCORES
# Input  : IT_Feedback_WITH_Scores.csv
# Model  : BiLSTM TensorFlow
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']            = ''
os.environ['REQUESTS_CA_BUNDLE']        = ''
os.environ['PYTHONHTTPSVERIFY']         = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL']      = '2'

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

SEED       = 42
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
print("   SENTIMENTIQ - TRAIN ON IT FEEDBACK WITH SCORES")
print("=" * 65)
print()




# ============================================================
# STEP 1 - LOAD IT FEEDBACK WITH SCORES
# ============================================================
print("=" * 65)
print("   STEP 1 - LOADING IT FEEDBACK WITH SCORES")
print("=" * 65)
print()

df = pd.read_csv("IT_Feedback_WITH_Scores.csv")

print(f"[OK] Dataset loaded!")
print(f"   Total rows : {len(df):,}")
print(f"   Columns    : {list(df.columns)}")
print()

# Show first 5 rows
print("First 5 rows:")
print("-" * 65)
for i in range(5):
    print(f"Company  : {df['Client_Company'].iloc[i]}")
    print(f"Feedback : {df['Client_Feedback'].iloc[i][:100]}...")
    print(f"Rating   : {df['Star_Rating'].iloc[i]}")
    print(f"CSAT     : {df['CSAT_Score_Scale'].iloc[i]}/10")
    print(f"DSAT     : {df['DSAT_Score_Scale'].iloc[i]}/10")
    print(f"CSAT Flag: {df['CSAT_Flag'].iloc[i]}")
    print(f"DSAT Flag: {df['DSAT_Flag'].iloc[i]}")
    print()




# ============================================================
# STEP 2 - EXPLORE DATASET
# ============================================================
print("=" * 65)
print("   STEP 2 - EXPLORING DATASET")
print("=" * 65)
print()

print(f"Dataset Shape : {df.shape}")
print()

print("Rating Distribution:")
ratings = df['Star_Rating'].value_counts().sort_index()
for r, c in ratings.items():
    bar = "#" * int(c/100)
    print(f"   {r} star : {c:,} {bar}")
print()

csat_pct = df['CSAT_Flag'].mean() * 100
dsat_pct = df['DSAT_Flag'].mean() * 100
print(f"Overall CSAT : {csat_pct:.1f}%")
print(f"Overall DSAT : {dsat_pct:.1f}%")
print()

print("CSAT Score Scale Distribution:")
print(df['CSAT_Score_Scale'].value_counts().sort_index())
print()

print("DSAT Score Scale Distribution:")
print(df['DSAT_Score_Scale'].value_counts().sort_index())
print()

print("Industry Distribution:")
print(df['Industry'].value_counts())
print()

print("[OK] STEP 2 - Exploration complete!")
print()




# ============================================================
# STEP 3 - PREPARE LABELS
# ============================================================
print("=" * 65)
print("   STEP 3 - PREPARING LABELS")
print("=" * 65)
print()

print("Using CSAT_Flag as label:")
print("   CSAT_Flag = 1 → Positive (satisfied)")
print("   CSAT_Flag = 0 → Negative (not satisfied)")
print()

df['label'] = df['CSAT_Flag']

pos = len(df[df['label'] == 1])
neg = len(df[df['label'] == 0])
print(f"Positive (Satisfied)    : {pos:,}")
print(f"Negative (Unsatisfied)  : {neg:,}")
print()
print("[OK] STEP 3 - Labels ready!")
print()




# ============================================================
# STEP 4 - BALANCE DATASET
# ============================================================
print("=" * 65)
print("   STEP 4 - BALANCING DATASET")
print("=" * 65)
print()

min_count   = min(pos, neg)
df_pos      = df[df['label'] == 1].sample(min_count, random_state=SEED)
df_neg      = df[df['label'] == 0].sample(min_count, random_state=SEED)
df_balanced = pd.concat([df_pos, df_neg]).sample(
                  frac=1, random_state=SEED
              ).reset_index(drop=True)

print(f"After balancing:")
print(f"   Positive : {len(df_balanced[df_balanced['label']==1]):,}")
print(f"   Negative : {len(df_balanced[df_balanced['label']==0]):,}")
print(f"   Total    : {len(df_balanced):,}")
print()
print("[OK] STEP 4 - Balanced!")
print()




# ============================================================
# STEP 5 - PREPROCESSING
# ============================================================
print("=" * 65)
print("   STEP 5 - PREPROCESSING TEXT")
print("=" * 65)
print()

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r'<.*?>',         ' ', text)
    text = re.sub(r'http\S+',       ' ', text)
    text = re.sub(r'[^a-zA-Z\s]',   ' ', text)
    text = re.sub(r'\s+',           ' ', text).strip()
    return text

df_balanced['clean'] = df_balanced['Client_Feedback'].apply(preprocess)

print("Example:")
print(f"Before : {df_balanced['Client_Feedback'].iloc[0][:120]}...")
print(f"After  : {df_balanced['clean'].iloc[0][:120]}...")
print()
print("[OK] STEP 5 - Preprocessing complete!")
print()




# ============================================================
# STEP 6 - TOKENIZATION
# ============================================================
print("=" * 65)
print("   STEP 6 - TOKENIZATION")
print("=" * 65)
print()

tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
tokenizer.fit_on_texts(df_balanced['clean'])

X = tokenizer.texts_to_sequences(df_balanced['clean'])
X = pad_sequences(X, maxlen=MAX_LEN,
                  padding='post', truncating='post')
y = df_balanced['label'].values

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
# STEP 8 - BUILD MODEL
# ============================================================
print("=" * 65)
print("   STEP 8 - BUILDING BILSTM MODEL")
print("=" * 65)
print()

model = Sequential([
    Embedding(MAX_WORDS, EMBED_DIM, input_length=MAX_LEN),
    SpatialDropout1D(0.3),
    Bidirectional(LSTM(LSTM_UNITS, dropout=0.2,
                       recurrent_dropout=0.2,
                       return_sequences=True)),
    Bidirectional(LSTM(64, dropout=0.2,
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
print("Training on IT Feedback WITH Scores...")
print("Watch live progress below:")
print()

early_stop = EarlyStopping(monitor='val_loss', patience=3,
                            restore_best_weights=True, verbose=1)
checkpoint = ModelCheckpoint('best_bilstm_model.h5',
                              monitor='val_accuracy',
                              save_best_only=True, verbose=1)
reduce_lr  = ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                                patience=2, verbose=1)

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
print(classification_report(y_test, y_pred,
      target_names=['Negative','Positive']))
print("[OK] STEP 10 - Evaluation complete!")
print()




# ============================================================
# STEP 11 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 11 - PREDICTION FUNCTION")
print("=" * 65)
print()

idx2label = {0: 'Negative', 1: 'Positive'}

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

print("[OK] STEP 11 - Functions ready!")
print()




# ============================================================
# STEP 12 - SAMPLE RESULTS WITH VERIFICATION
# ============================================================
print("=" * 65)
print("   STEP 12 - SAMPLE RESULTS WITH SCORE VERIFICATION")
print("=" * 65)
print()

sample     = df.sample(50, random_state=SEED).reset_index(drop=True)
correct    = 0
neutral    = 0
wrong      = 0

print("50 sample predictions vs actual CSAT/DSAT scores:")
print("=" * 65)

for i in range(50):
    feedback    = sample['Client_Feedback'].iloc[i]
    company     = sample['Client_Company'].iloc[i]
    industry    = sample['Industry'].iloc[i]
    actual_rat  = sample['Star_Rating'].iloc[i]
    actual_csat = sample['CSAT_Score_Scale'].iloc[i]
    actual_dsat = sample['DSAT_Score_Scale'].iloc[i]
    actual_flag = sample['CSAT_Flag'].iloc[i]
    actual      = "Positive" if actual_flag == 1 else "Negative"

    sent, conf  = predict_sentiment(feedback)
    csat_sc, dsat_sc, csat_fl, dsat_fl = get_scores(sent, conf)
    bar         = "#" * int(conf // 5)

    if sent == actual:
        correct += 1
        match = "[CORRECT]"
    elif sent == "Neutral":
        neutral += 1
        match = "[NEUTRAL]"
    else:
        wrong += 1
        match = "[WRONG]  "

    print(f"[{i+1:2d}] Company   : {company} ({industry})")
    print(f"     Feedback  : {feedback[:80]}...")
    print(f"     Predicted : {sent:10s} | {bar} {conf}%")
    print(f"     CSAT Pred : {csat_sc}/10 | DSAT Pred : {dsat_sc}/10")
    print(f"     Actual    : Rating={actual_rat} | "
          f"CSAT={actual_csat}/10 | DSAT={actual_dsat}/10 | {match}")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Correct  : {correct}/50 ({correct/50*100:.1f}%)")
print(f"   Neutral  : {neutral}/50 ({neutral/50*100:.1f}%)")
print(f"   Wrong    : {wrong}/50  ({wrong/50*100:.1f}%)")
print()




# ============================================================
# STEP 13 - BUSINESS INSIGHTS
# ============================================================
print("=" * 65)
print("   STEP 13 - BUSINESS INSIGHTS")
print("=" * 65)
print()

print(f"Overall CSAT    : {df['CSAT_Flag'].mean()*100:.1f}%")
print(f"Overall DSAT    : {df['DSAT_Flag'].mean()*100:.1f}%")
print(f"Avg CSAT Scale  : {df[df['CSAT_Score_Scale']>0]['CSAT_Score_Scale'].mean():.1f}/10")
print(f"Avg DSAT Scale  : {df[df['DSAT_Score_Scale']>0]['DSAT_Score_Scale'].mean():.1f}/10")
print()

print("CSAT% by Industry:")
for ind, val in df.groupby('Industry')['CSAT_Flag'].mean().sort_values(ascending=False).items():
    print(f"   {ind:25s} : {val*100:.1f}%")
print()

print("DSAT% by Industry:")
for ind, val in df.groupby('Industry')['DSAT_Flag'].mean().sort_values(ascending=False).items():
    print(f"   {ind:25s} : {val*100:.1f}%")
print()

print("Best Performing Managers (CSAT):")
for mgr, val in df.groupby('Project_Manager')['CSAT_Score_Scale'].mean().sort_values(ascending=False).items():
    print(f"   {mgr:20s} : {val:.1f}/10")
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
fig.suptitle('SentimentIQ - IT Feedback WITH Scores Analysis',
             fontsize=16, fontweight='bold')

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
axes[0,0].set_ylim(50, 100)
axes[0,0].legend()
axes[0,0].grid(alpha=0.3)

# Graph 2 - Loss
axes[0,1].plot(epochs_range, history.history['loss'],
               'o-', label='Train', color='#7F77DD', linewidth=2)
axes[0,1].plot(epochs_range, history.history['val_loss'],
               's--', label='Val', color='#F5A623', linewidth=2)
axes[0,1].set_title('Training vs Validation Loss', fontweight='bold')
axes[0,1].set_xlabel('Epoch')
axes[0,1].set_ylabel('Loss')
axes[0,1].legend()
axes[0,1].grid(alpha=0.3)

# Graph 3 - Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Negative','Positive'],
            yticklabels=['Negative','Positive'],
            ax=axes[0,2])
axes[0,2].set_title('Confusion Matrix', fontweight='bold')
axes[0,2].set_xlabel('Predicted')
axes[0,2].set_ylabel('Actual')

# Graph 4 - CSAT DSAT Distribution
csat_c = df['CSAT_Flag'].sum()
dsat_c = df['DSAT_Flag'].sum()
neu_c  = len(df) - csat_c - dsat_c
axes[1,0].pie([csat_c, dsat_c, neu_c],
    labels=[f'CSAT\n{csat_c:,}', f'DSAT\n{dsat_c:,}',
            f'Neutral\n{neu_c:,}'],
    colors=['#22c55e','#ef4444','#3b82f6'],
    autopct='%1.1f%%', startangle=90)
axes[1,0].set_title('CSAT vs DSAT Distribution', fontweight='bold')

# Graph 5 - CSAT by Industry
ind_csat = df.groupby('Industry')['CSAT_Flag'].mean()*100
ind_csat.sort_values().plot(kind='barh', ax=axes[1,1], color='#22c55e')
axes[1,1].set_title('CSAT% by Industry', fontweight='bold')
axes[1,1].set_xlabel('CSAT %')

# Graph 6 - Manager Performance
mgr = df.groupby('Project_Manager')['CSAT_Score_Scale'].mean()
mgr.sort_values(ascending=False).plot(kind='bar', ax=axes[1,2],
                                       color='#6366f1')
axes[1,2].set_title('CSAT Score by Manager', fontweight='bold')
axes[1,2].set_ylabel('Avg CSAT Score (0-10)')
axes[1,2].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.savefig('it_with_scores_graph.png', dpi=150, bbox_inches='tight')
print("[OK] Graph saved as it_with_scores_graph.png")
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
print("   TRAINING COMPLETE - IT FEEDBACK WITH SCORES")
print("=" * 65)
print()
print(f"   Dataset        : IT_Feedback_WITH_Scores.csv")
print(f"   Total rows     : {len(df):,}")
print(f"   Training size  : {len(X_train):,}")
print(f"   Testing size   : {len(X_test):,}")
print(f"   Accuracy       : {accuracy:.2f}%")
print(f"   Training Time  : {train_time:.1f}s")
print(f"   Overall CSAT   : {csat_pct:.1f}%")
print(f"   Overall DSAT   : {dsat_pct:.1f}%")
print()
print("   Output Files:")
print("   best_bilstm_model.h5     - Best model")
print("   bilstm_tf_model.h5       - Final model")
print("   tokenizer.pkl            - Tokenizer")
print("   it_with_scores_graph.png - Graphs")
print("=" * 65)
