# ============================================================
# SENTIMENTIQ — LSTM WITH NEUTRAL CLASS
# ============================================================

import ssl
import os
ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['PYTHONHTTPSVERIFY'] = '0'

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import time
import re

from sklearn.model_selection   import train_test_split
from sklearn.metrics           import (classification_report,
                                        confusion_matrix,
                                        accuracy_score)
from sklearn.preprocessing     import LabelEncoder

import tensorflow as tf
from tensorflow.keras.models         import Sequential
from tensorflow.keras.layers         import (Embedding, LSTM,
                                              Dense, Dropout,
                                              SpatialDropout1D)
from tensorflow.keras.preprocessing.text     import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks      import EarlyStopping

warnings.filterwarnings('ignore')

print("=" * 60)
print("   LSTM SENTIMENT ANALYSIS — WITH NEUTRAL")
print("=" * 60)
print()




# ============================================================
# STEP 3 — LOAD DATASET
# ============================================================
print("Loading dataset...")
df = pd.read_csv("IMDB_small.csv")
df.columns = ["review", "sentiment"]
df["sentiment"] = df["sentiment"].map({
    "positive": "Positive",
    "negative": "Negative"
})
print(f"✅ Dataset loaded! Total: {len(df)}")
print()




# ============================================================
# STEP 4 — EXPLORE DATASET
# ============================================================
print("=" * 60)
print("   STEP 4 — EXPLORING DATASET")
print("=" * 60)
print()
print(f"Dataset Shape : {df.shape}")
print()
print("Sentiment Distribution:")
print(df['sentiment'].value_counts())
print()
df['review_length'] = df['review'].apply(lambda x: len(x.split()))
print("Review Length Statistics:")
print(f"   Minimum : {df['review_length'].min()} words")
print(f"   Maximum : {df['review_length'].max()} words")
print(f"   Average : {df['review_length'].mean():.0f} words")
print()
print("✅ STEP 4 — Exploration complete!")
print()




# ============================================================
# STEP 5 — BALANCE DATASET
# ============================================================
print("=" * 60)
print("   STEP 5 — BALANCING DATASET")
print("=" * 60)
print()
pos = len(df[df['sentiment'] == 'Positive'])
neg = len(df[df['sentiment'] == 'Negative'])
print(f"Before: Positive={pos}, Negative={neg}")

min_count   = min(pos, neg)
df_pos      = df[df['sentiment'] == 'Positive'].sample(min_count, random_state=42)
df_neg      = df[df['sentiment'] == 'Negative'].sample(min_count, random_state=42)
df_balanced = pd.concat([df_pos, df_neg]).reset_index(drop=True)
df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"After : Positive={len(df_balanced[df_balanced['sentiment']=='Positive'])}, Negative={len(df_balanced[df_balanced['sentiment']=='Negative'])}")
print(f"Total : {len(df_balanced)}")
print()
print("✅ STEP 5 — Balanced!")
print()




# ============================================================
# STEP 6 — PREPROCESS
# ============================================================
print("=" * 60)
print("   STEP 6 — PREPROCESSING")
print("=" * 60)
print()

def preprocess(text):
    text = text.lower()
    text = re.sub(r'<.*?>',       ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+',         ' ', text).strip()
    return text

df_balanced['clean_review'] = df_balanced['review'].apply(preprocess)
print("✅ STEP 6 — Preprocessing complete!")
print()




# ============================================================
# STEP 7 — TOKENIZATION
# ============================================================
print("=" * 60)
print("   STEP 7 — TOKENIZATION")
print("=" * 60)
print()

MAX_WORDS = 10000
MAX_LEN   = 200

tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
tokenizer.fit_on_texts(df_balanced['clean_review'])

X = tokenizer.texts_to_sequences(df_balanced['clean_review'])
X = pad_sequences(X, maxlen=MAX_LEN, padding='post', truncating='post')

le = LabelEncoder()
y  = le.fit_transform(df_balanced['sentiment'])

print(f"Vocabulary size  : {MAX_WORDS}")
print(f"Max review length: {MAX_LEN}")
print(f"Input shape      : {X.shape}")
print()
print("✅ STEP 7 — Tokenization complete!")
print()




# ============================================================
# STEP 8 — SPLIT DATA
# ============================================================
print("=" * 60)
print("   STEP 8 — SPLITTING DATA")
print("=" * 60)
print()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training : {len(X_train)} reviews")
print(f"Testing  : {len(X_test)} reviews")
print()
print("✅ STEP 8 — Split complete!")
print()




# ============================================================
# STEP 9 — BUILD LSTM MODEL
# ============================================================
print("=" * 60)
print("   STEP 9 — BUILDING LSTM MODEL")
print("=" * 60)
print()

model = Sequential([
    Embedding(MAX_WORDS, 128, input_length=MAX_LEN),
    SpatialDropout1D(0.3),
    LSTM(128, dropout=0.2, recurrent_dropout=0.2),
    Dense(64, activation='relu'),
    Dropout(0.3),
    Dense(1,  activation='sigmoid')
])

model.compile(
    optimizer = 'adam',
    loss      = 'binary_crossentropy',
    metrics   = ['accuracy']
)

model.summary()
print()
print("✅ STEP 9 — Model built!")
print()




# ============================================================
# STEP 10 — TRAIN MODEL
# ============================================================
print("=" * 60)
print("   STEP 10 — TRAINING MODEL")
print("=" * 60)
print()

early_stop = EarlyStopping(
    monitor='val_loss', patience=3,
    restore_best_weights=True
)

start_time = time.time()

history = model.fit(
    X_train, y_train,
    epochs           = 10,
    batch_size       = 64,
    validation_split = 0.2,
    callbacks        = [early_stop],
    verbose          = 1
)

train_time = time.time() - start_time
print()
print(f"✅ STEP 10 — Training complete in {train_time:.1f} seconds!")
print()




# ============================================================
# STEP 11 — EVALUATE
# ============================================================
print("=" * 60)
print("   STEP 11 — EVALUATING MODEL")
print("=" * 60)
print()

y_pred_prob = model.predict(X_test)
y_pred      = (y_pred_prob > 0.5).astype(int).flatten()
accuracy    = accuracy_score(y_test, y_pred) * 100

print(f"✅ Accuracy: {accuracy:.2f}%")
print()
print("Classification Report:")
print("-" * 60)
print(classification_report(y_test, y_pred, target_names=le.classes_))
print()




# ============================================================
# STEP 12 — PREDICT WITH NEUTRAL
# ============================================================
print("=" * 60)
print("   STEP 12 — PREDICTION WITH NEUTRAL CLASS")
print("=" * 60)
print()

def predict_sentiment(text):
    clean    = preprocess(text)
    sequence = tokenizer.texts_to_sequences([clean])
    padded   = pad_sequences(
                   sequence, maxlen=MAX_LEN,
                   padding='post', truncating='post'
               )
    prob = model.predict(padded, verbose=0)[0][0]

    # Neutral zone between 0.35 and 0.65
    if prob >= 0.65:
        return "Positive", round(prob * 100, 1)
    elif prob <= 0.35:
        return "Negative", round((1 - prob) * 100, 1)
    else:
        return "Neutral", round(max(prob, 1-prob) * 100, 1)

print("Neutral threshold: 0.35 to 0.65")
print("Below 0.35  → Negative")
print("Above 0.65  → Positive")
print("In between  → Neutral")
print()
print("✅ STEP 12 — Neutral class added!")
print()




# ============================================================
# STEP 13 — SAMPLE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 13 — SAMPLE RESULTS")
print("=" * 60)
print()

test_reviews = df_balanced['review'].values
test_labels  = df_balanced['sentiment'].values

print("Sample Predictions:")
print("-" * 60)
for i in range(10):
    sentiment, confidence = predict_sentiment(test_reviews[i])
    actual = test_labels[i]
    emoji  = "😊" if sentiment == "Positive" else "😠" if sentiment == "Negative" else "😐"
    match  = "✅" if sentiment == actual or sentiment == "Neutral" else "❌"
    print(f"Review   : {test_reviews[i][:100]}...")
    print(f"Predicted: {emoji} {sentiment} ({confidence}%)")
    print(f"Actual   : {actual} {match}")
    print()

print("✅ STEP 13 — Done!")
print()




# ============================================================
# STEP 14 — VISUALIZATIONS
# ============================================================
print("=" * 60)
print("   STEP 14 — VISUALIZATIONS")
print("=" * 60)
print()

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('LSTM With Neutral — Results', fontsize=16, fontweight='bold')

# Graph 1 — Training Accuracy
axes[0, 0].plot(history.history['accuracy'],     label='Train', color='#6366f1')
axes[0, 0].plot(history.history['val_accuracy'], label='Val',   color='#22d3ee')
axes[0, 0].set_title('Training Accuracy', fontweight='bold')
axes[0, 0].set_xlabel('Epoch')
axes[0, 0].set_ylabel('Accuracy')
axes[0, 0].legend()

# Graph 2 — Training Loss
axes[0, 1].plot(history.history['loss'],     label='Train Loss', color='#ef4444')
axes[0, 1].plot(history.history['val_loss'], label='Val Loss',   color='#f59e0b')
axes[0, 1].set_title('Training Loss', fontweight='bold')
axes[0, 1].set_xlabel('Epoch')
axes[0, 1].set_ylabel('Loss')
axes[0, 1].legend()

# Graph 3 — Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=le.classes_,
            yticklabels=le.classes_,
            ax=axes[1, 0])
axes[1, 0].set_title('Confusion Matrix', fontweight='bold')
axes[1, 0].set_xlabel('Predicted')
axes[1, 0].set_ylabel('Actual')

# Graph 4 — Sentiment Counts
pos_c = sum(1 for i in range(len(test_reviews))
            if predict_sentiment(test_reviews[i])[0] == 'Positive')
neg_c = sum(1 for i in range(len(test_reviews))
            if predict_sentiment(test_reviews[i])[0] == 'Negative')
neu_c = sum(1 for i in range(len(test_reviews))
            if predict_sentiment(test_reviews[i])[0] == 'Neutral')

axes[1, 1].pie(
    [pos_c, neg_c, neu_c],
    labels  = [f'Positive\n{pos_c}', f'Negative\n{neg_c}', f'Neutral\n{neu_c}'],
    colors  = ['#22c55e', '#ef4444', '#3b82f6'],
    autopct = '%1.1f%%'
)
axes[1, 1].set_title('Sentiment Distribution', fontweight='bold')

plt.tight_layout()
plt.savefig('lstm_neutral_graph.png', dpi=150, bbox_inches='tight')
print("✅ Graph saved!")
plt.show()
print()




# ============================================================
# STEP 15 — CUSTOM REVIEWS
# ============================================================
print("=" * 60)
print("   STEP 15 — TEST CUSTOM REVIEWS")
print("=" * 60)
print()

custom_reviews = [
    "This movie was absolutely fantastic! Best film ever.",
    "Terrible movie. Complete waste of time and money.",
    "It was okay. Some parts were good but nothing special.",
    "The acting was brilliant and story kept me engaged.",
    "I fell asleep halfway. Extremely boring and predictable."
]

for i, review in enumerate(custom_reviews):
    sentiment, confidence = predict_sentiment(review)
    emoji = "😊" if sentiment == "Positive" else "😠" if sentiment == "Negative" else "😐"
    print(f"Review {i+1}: {review}")
    print(f"Result  : {emoji} {sentiment} ({confidence}%)")
    print()




# ============================================================
# STEP 16 — SAVE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 16 — SAVING RESULTS")
print("=" * 60)
print()

results = []
for i in range(len(df_balanced)):
    sentiment, confidence = predict_sentiment(df_balanced['review'].iloc[i])
    results.append({
        'Review'             : df_balanced['review'].iloc[i],
        'Actual Sentiment'   : df_balanced['sentiment'].iloc[i],
        'Predicted Sentiment': sentiment,
        'Confidence'         : confidence
    })

pd.DataFrame(results).to_csv('lstm_neutral_results.csv', index=False)
print("✅ Results saved to lstm_neutral_results.csv")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 60)
print("   ✅ LSTM WITH NEUTRAL — COMPLETE!")
print("=" * 60)
print(f"   Model    : LSTM Neural Network")
print(f"   Classes  : Positive / Negative / Neutral")
print(f"   Accuracy : {accuracy:.2f}% (on Pos/Neg only)")
print(f"   Training : {train_time:.1f} seconds")
print("=" * 60)
