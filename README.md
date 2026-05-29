# ============================================================
# SENTIMENTIQ — SENTIMENT ANALYSIS USING LSTM
# Dataset: IMDB Movie Reviews
# ============================================================




# ============================================================
# STEP 1 — INSTALLING DEPENDENCIES
# ============================================================
# Run in CMD before running this script:
# pip install tensorflow keras pandas numpy matplotlib seaborn
#     scikit-learn --trusted-host pypi.org
#     --trusted-host files.pythonhosted.org




# ============================================================
# STEP 2 — IMPORTING LIBRARIES
# ============================================================
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
print("   SENTIMENTIQ — LSTM SENTIMENT ANALYSIS")
print("=" * 60)
print()
print(f"   TensorFlow Version: {tf.__version__}")
print()
print("✅ STEP 2 — All libraries imported successfully!")
print()




# ============================================================
# STEP 3 — LOADING DATASET
# ============================================================
print("=" * 60)
print("   STEP 3 — LOADING IMDB DATASET")
print("=" * 60)
print()

df = pd.read_csv("IMDB_small.csv")
df.columns = ["review", "sentiment"]
df["sentiment"] = df["sentiment"].map({
    "positive": "Positive",
    "negative": "Negative"
})

print(f"✅ STEP 3 — Dataset loaded!")
print(f"   Total reviews: {len(df)}")
print()
print("First 3 reviews:")
print("-" * 60)
for i in range(3):
    print(f"Review   : {df['review'][i][:100]}...")
    print(f"Sentiment: {df['sentiment'][i]}")
    print()




# ============================================================
# STEP 4 — EXPLORING DATASET
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

df['review_length'] = df['review'].apply(
    lambda x: len(x.split())
)
print("Review Length Statistics:")
print(f"   Minimum : {df['review_length'].min()} words")
print(f"   Maximum : {df['review_length'].max()} words")
print(f"   Average : {df['review_length'].mean():.0f} words")
print()
print("✅ STEP 4 — Exploration complete!")
print()




# ============================================================
# STEP 5 — BALANCING DATASET
# ============================================================
print("=" * 60)
print("   STEP 5 — BALANCING DATASET")
print("=" * 60)
print()

pos = len(df[df['sentiment'] == 'Positive'])
neg = len(df[df['sentiment'] == 'Negative'])

print(f"Before balancing:")
print(f"   Positive: {pos}")
print(f"   Negative: {neg}")
print()

min_count   = min(pos, neg)
df_pos      = df[df['sentiment'] == 'Positive'].sample(
                  min_count, random_state=42)
df_neg      = df[df['sentiment'] == 'Negative'].sample(
                  min_count, random_state=42)
df_balanced = pd.concat([df_pos, df_neg]).reset_index(drop=True)
df_balanced = df_balanced.sample(
                  frac=1, random_state=42).reset_index(drop=True)

print(f"After balancing:")
print(f"   Positive: {len(df_balanced[df_balanced['sentiment'] == 'Positive'])}")
print(f"   Negative: {len(df_balanced[df_balanced['sentiment'] == 'Negative'])}")
print(f"   Total   : {len(df_balanced)}")
print()
print("✅ STEP 5 — Dataset balanced!")
print()




# ============================================================
# STEP 6 — PREPROCESSING TEXT
# ============================================================
print("=" * 60)
print("   STEP 6 — PREPROCESSING TEXT")
print("=" * 60)
print()

def preprocess(text):
    text = text.lower()
    text = re.sub(r'<.*?>',    ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+',      ' ', text).strip()
    return text

print("Preprocessing steps:")
print("   ✅ Converting to lowercase")
print("   ✅ Removing HTML tags")
print("   ✅ Removing special characters")
print("   ✅ Removing extra spaces")
print()

df_balanced['clean_review'] = df_balanced['review'].apply(
    preprocess
)

print("Example:")
print(f"Before: {df_balanced['review'][0][:150]}")
print()
print(f"After : {df_balanced['clean_review'][0][:150]}")
print()
print("✅ STEP 6 — Preprocessing complete!")
print()




# ============================================================
# STEP 7 — TOKENIZATION
# ============================================================
print("=" * 60)
print("   STEP 7 — TOKENIZATION")
print("=" * 60)
print()

print("What is Tokenization?")
print("   Converts words to numbers so LSTM can read them")
print("   Example:")
print("   'good movie' → [45, 123]")
print("   'bad film'   → [67, 89]")
print()

# Settings
MAX_WORDS   = 10000   # vocabulary size
MAX_LEN     = 200     # max review length

# Tokenizer
tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
tokenizer.fit_on_texts(df_balanced['clean_review'])

# Convert to sequences
X = tokenizer.texts_to_sequences(df_balanced['clean_review'])
X = pad_sequences(X, maxlen=MAX_LEN, padding='post',
                  truncating='post')

# Encode labels
le = LabelEncoder()
y  = le.fit_transform(df_balanced['sentiment'])

print(f"Tokenization Settings:")
print(f"   Vocabulary size : {MAX_WORDS} words")
print(f"   Max review length: {MAX_LEN} words")
print(f"   Vocabulary found : {len(tokenizer.word_index)} words")
print()
print(f"Input shape  : {X.shape}")
print()
print("✅ STEP 7 — Tokenization complete!")
print()




# ============================================================
# STEP 8 — SPLITTING DATA
# ============================================================
print("=" * 60)
print("   STEP 8 — SPLITTING DATA")
print("=" * 60)
print()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Data Split:")
print(f"   Training set : {len(X_train)} reviews (80%)")
print(f"   Testing set  : {len(X_test)}  reviews (20%)")
print()
print("✅ STEP 8 — Data split complete!")
print()




# ============================================================
# STEP 9 — BUILDING LSTM MODEL
# ============================================================
print("=" * 60)
print("   STEP 9 — BUILDING LSTM MODEL")
print("=" * 60)
print()

print("What is LSTM?")
print("   Long Short Term Memory")
print("   A type of Neural Network that reads")
print("   text word by word and remembers context")
print("   Perfect for understanding sentences!")
print()

model = Sequential([
    Embedding(
        input_dim    = MAX_WORDS,
        output_dim   = 128,
        input_length = MAX_LEN
    ),
    SpatialDropout1D(0.3),
    LSTM(
        units          = 128,
        dropout        = 0.2,
        recurrent_dropout = 0.2
    ),
    Dense(64,  activation='relu'),
    Dropout(0.3),
    Dense(1,   activation='sigmoid')
])

model.compile(
    optimizer = 'adam',
    loss      = 'binary_crossentropy',
    metrics   = ['accuracy']
)

print("Model Architecture:")
model.summary()
print()
print("✅ STEP 9 — Model built!")
print()




# ============================================================
# STEP 10 — TRAINING THE MODEL
# ============================================================
print("=" * 60)
print("   STEP 10 — TRAINING LSTM MODEL")
print("=" * 60)
print()

print("Training started...")
print("This may take 10-15 minutes on CPU...")
print()

early_stop = EarlyStopping(
    monitor   = 'val_loss',
    patience  = 3,
    restore_best_weights = True
)

start_time = time.time()

history = model.fit(
    X_train, y_train,
    epochs          = 10,
    batch_size      = 64,
    validation_split = 0.2,
    callbacks       = [early_stop],
    verbose         = 1
)

train_time = time.time() - start_time
print()
print(f"✅ STEP 10 — Training complete in {train_time:.1f} seconds!")
print()




# ============================================================
# STEP 11 — EVALUATING THE MODEL
# ============================================================
print("=" * 60)
print("   STEP 11 — EVALUATING MODEL")
print("=" * 60)
print()

y_pred_prob = model.predict(X_test)
y_pred      = (y_pred_prob > 0.5).astype(int).flatten()

accuracy = accuracy_score(y_test, y_pred) * 100
print(f"Model Accuracy: {accuracy:.2f}%")
print()

print("Classification Report:")
print("-" * 60)
print(classification_report(
    y_test, y_pred,
    target_names=le.classes_
))

print("✅ STEP 11 — Evaluation complete!")
print()




# ============================================================
# STEP 12 — ADDING NEUTRAL CLASS
# ============================================================
print("=" * 60)
print("   STEP 12 — ADDING NEUTRAL PREDICTION")
print("=" * 60)
print()

def predict_sentiment(text):
    clean    = preprocess(text)
    sequence = tokenizer.texts_to_sequences([clean])
    padded   = pad_sequences(
                   sequence, maxlen=MAX_LEN,
                   padding='post', truncating='post'
               )
    prob     = model.predict(padded, verbose=0)[0][0]

    if prob >= 0.65:
        return "Positive", round(prob * 100, 1)
    elif prob <= 0.35:
        return "Negative", round((1 - prob) * 100, 1)
    else:
        return "Neutral", round(
            max(prob, 1-prob) * 100, 1
        )

print("✅ STEP 12 — Neutral class added!")
print("   Positive if confidence >= 65%")
print("   Negative if confidence <= 35%")
print("   Neutral  if between 35% and 65%")
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
    actual  = test_labels[i]
    emoji   = "😊" if sentiment == "Positive" else "😠" if sentiment == "Negative" else "😐"
    match   = "✅" if sentiment == actual or sentiment == "Neutral" else "❌"

    print(f"Review {i+1}: {test_reviews[i][:120]}...")
    print(f"Predicted: {emoji} {sentiment} ({confidence}%)")
    print(f"Actual   : {actual} {match}")
    print()

print("✅ STEP 13 — Sample results shown!")
print()




# ============================================================
# STEP 14 — VISUALIZATIONS
# ============================================================
print("=" * 60)
print("   STEP 14 — GENERATING VISUALIZATIONS")
print("=" * 60)
print()

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle(
    'SentimentIQ — LSTM Analysis Results',
    fontsize=16, fontweight='bold'
)

# Graph 1 — Training History
axes[0, 0].plot(history.history['accuracy'],
                label='Train Accuracy', color='#6366f1')
axes[0, 0].plot(history.history['val_accuracy'],
                label='Val Accuracy',   color='#22d3ee')
axes[0, 0].set_title('Training History', fontweight='bold')
axes[0, 0].set_xlabel('Epoch')
axes[0, 0].set_ylabel('Accuracy')
axes[0, 0].legend()

# Graph 2 — Loss History
axes[0, 1].plot(history.history['loss'],
                label='Train Loss', color='#ef4444')
axes[0, 1].plot(history.history['val_loss'],
                label='Val Loss',   color='#f59e0b')
axes[0, 1].set_title('Loss History', fontweight='bold')
axes[0, 1].set_xlabel('Epoch')
axes[0, 1].set_ylabel('Loss')
axes[0, 1].legend()

# Graph 3 — Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Blues',
    xticklabels = le.classes_,
    yticklabels = le.classes_,
    ax          = axes[1, 0]
)
axes[1, 0].set_title('Confusion Matrix', fontweight='bold')
axes[1, 0].set_xlabel('Predicted')
axes[1, 0].set_ylabel('Actual')

# Graph 4 — Sentiment Distribution
pos_count = (y_pred == 1).sum()
neg_count = (y_pred == 0).sum()
axes[1, 1].pie(
    [pos_count, neg_count],
    labels  = [f'Positive\n{pos_count}',
               f'Negative\n{neg_count}'],
    colors  = ['#22c55e', '#ef4444'],
    autopct = '%1.1f%%',
    startangle = 90
)
axes[1, 1].set_title(
    'Predicted Sentiment Distribution',
    fontweight='bold'
)

plt.tight_layout()
plt.savefig('lstm_graph.png', dpi=150, bbox_inches='tight')
print("✅ Graph saved as lstm_graph.png")
plt.show()
print()




# ============================================================
# STEP 15 — TEST WITH CUSTOM REVIEWS
# ============================================================
print("=" * 60)
print("   STEP 15 — TEST WITH CUSTOM REVIEWS")
print("=" * 60)
print()

custom_reviews = [
    "This movie was absolutely fantastic! Best film I have seen.",
    "Terrible movie. Complete waste of time and money.",
    "It was okay. Some parts were good but nothing special.",
    "The acting was brilliant and story kept me engaged.",
    "I fell asleep halfway. Extremely boring and predictable."
]

print("Testing with custom reviews:")
print("-" * 60)

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
for i in range(len(X_test)):
    sentiment, confidence = predict_sentiment(
        df_balanced['review'].iloc[i]
    )
    results.append({
        'Review'             : df_balanced['review'].iloc[i],
        'Actual Sentiment'   : df_balanced['sentiment'].iloc[i],
        'Predicted Sentiment': sentiment,
        'Confidence'         : confidence
    })

results_df = pd.DataFrame(results)
results_df.to_csv('lstm_results.csv', index=False)
print("✅ Results saved to lstm_results.csv")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 60)
print("   ✅ LSTM ANALYSIS COMPLETE!")
print("=" * 60)
print()
print(f"   Model         : LSTM Neural Network")
print(f"   Dataset       : IMDB Movie Reviews")
print(f"   Total Reviews : {len(df_balanced)}")
print(f"   Training Size : {len(X_train)}")
print(f"   Testing Size  : {len(X_test)}")
print(f"   Accuracy      : {accuracy:.2f}%")
print(f"   Training Time : {train_time:.1f} seconds")
print()
print("   Output Files:")
print("   📊 lstm_graph.png   — Visualizations")
print("   📄 lstm_results.csv — Full results")
print("=" * 60)
