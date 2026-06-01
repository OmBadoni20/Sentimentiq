# ============================================================
# SENTIMENTIQ - BIDIRECTIONAL LSTM SENTIMENT ANALYSIS
# Model     : Bidirectional LSTM (TensorFlow/Keras)
# Dataset   : IMDB Movie Reviews (18,000 reviews)
# Classes   : Positive / Negative / Neutral
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']            = ''
os.environ['REQUESTS_CA_BUNDLE']        = ''
os.environ['PYTHONHTTPSVERIFY']         = '0'
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'
os.environ['TF_CPP_MIN_LOG_LEVEL']      = '2'




# ============================================================
# STEP 1 - INSTALLING DEPENDENCIES
# ============================================================
# Run in CMD before running this script:
# pip install tensorflow keras pandas numpy matplotlib seaborn
#     scikit-learn --trusted-host pypi.org
#     --trusted-host files.pythonhosted.org




# ============================================================
# STEP 2 - IMPORTING LIBRARIES
# ============================================================
import pandas                as pd
import numpy                 as np
import matplotlib.pyplot     as plt
import seaborn               as sns
import re
import random
import time
import warnings
import pickle

from collections             import Counter
from sklearn.metrics         import (classification_report,
                                     confusion_matrix,
                                     accuracy_score)

import tensorflow as tf
from tensorflow.keras.models         import Sequential
from tensorflow.keras.layers         import (Embedding,
                                             Bidirectional,
                                             LSTM,
                                             Dense,
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
print("   SENTIMENTIQ - BIDIRECTIONAL LSTM (TENSORFLOW)")
print("=" * 65)
print()
print(f"   TensorFlow : {tf.__version__}")
print(f"   MAX_WORDS  : {MAX_WORDS:,}")
print(f"   MAX_LEN    : {MAX_LEN}")
print(f"   EMBED_DIM  : {EMBED_DIM}")
print(f"   LSTM_UNITS : {LSTM_UNITS}")
print(f"   EPOCHS     : {NUM_EPOCHS}")
print(f"   BATCH_SIZE : {BATCH_SIZE}")
print(f"   LR         : {LR}")
print()
print("[OK] STEP 2 - Libraries imported!")
print()




# ============================================================
# STEP 3 - LOADING DATASET
# ============================================================
print("=" * 65)
print("   STEP 3 - LOADING DATASET")
print("=" * 65)
print()

print("Loading IMDB_18k.csv...")
print()

df = pd.read_csv("IMDB_18k.csv")
df.columns = ["review", "sentiment"]
df["label"] = df["sentiment"].map({
    "positive": 1,
    "negative": 0
})
df = df.dropna().reset_index(drop=True)

print(f"[OK] Dataset loaded!")
print(f"   Total reviews : {len(df):,}")
print()
print("First 5 reviews:")
print("-" * 65)
for i in range(5):
    label = "Positive" if df['label'][i] == 1 else "Negative"
    print(f"Review   : {df['review'][i][:100]}...")
    print(f"Sentiment: {label}")
    print()




# ============================================================
# STEP 4 - EXPLORING DATASET
# ============================================================
print("=" * 65)
print("   STEP 4 - EXPLORING DATASET")
print("=" * 65)
print()

print(f"Dataset Shape : {df.shape}")
print()

pos_count = len(df[df['label'] == 1])
neg_count = len(df[df['label'] == 0])

print("Sentiment Distribution:")
print(f"   Positive : {pos_count:,} ({pos_count/len(df)*100:.1f}%)")
print(f"   Negative : {neg_count:,} ({neg_count/len(df)*100:.1f}%)")
print()

df['review_length'] = df['review'].apply(
    lambda x: len(str(x).split())
)
print("Review Length Statistics:")
print(f"   Minimum : {df['review_length'].min():,} words")
print(f"   Maximum : {df['review_length'].max():,} words")
print(f"   Average : {df['review_length'].mean():.0f} words")
print(f"   Median  : {df['review_length'].median():.0f} words")
print()
print("[OK] STEP 4 - Exploration complete!")
print()




# ============================================================
# STEP 5 - BALANCING DATASET
# ============================================================
print("=" * 65)
print("   STEP 5 - BALANCING DATASET")
print("=" * 65)
print()

print(f"Before balancing:")
print(f"   Positive : {pos_count:,}")
print(f"   Negative : {neg_count:,}")
print()

min_count   = min(pos_count, neg_count)
df_pos      = df[df['label'] == 1].sample(
                  min_count, random_state=SEED)
df_neg      = df[df['label'] == 0].sample(
                  min_count, random_state=SEED)
df_balanced = pd.concat([df_pos, df_neg]).sample(
                  frac=1, random_state=SEED
              ).reset_index(drop=True)

print(f"After balancing:")
print(f"   Positive : {len(df_balanced[df_balanced['label']==1]):,}")
print(f"   Negative : {len(df_balanced[df_balanced['label']==0]):,}")
print(f"   Total    : {len(df_balanced):,}")
print()
print("[OK] STEP 5 - Dataset balanced!")
print()




# ============================================================
# STEP 6 - PREPROCESSING TEXT
# ============================================================
print("=" * 65)
print("   STEP 6 - PREPROCESSING TEXT")
print("=" * 65)
print()

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r'<.*?>',         ' ', text)
    text = re.sub(r'http\S+',       ' ', text)
    text = re.sub(r'[^a-zA-Z\s]',   ' ', text)
    text = re.sub(r'\s+',           ' ', text).strip()
    return text

print("Preprocessing steps:")
print("   - Converting to lowercase")
print("   - Removing HTML tags")
print("   - Removing URLs")
print("   - Removing special characters")
print("   - Removing extra spaces")
print()

df_balanced['clean'] = df_balanced['review'].apply(preprocess)

print("Example:")
print(f"Before : {df_balanced['review'].iloc[0][:120]}...")
print()
print(f"After  : {df_balanced['clean'].iloc[0][:120]}...")
print()
print("[OK] STEP 6 - Preprocessing complete!")
print()




# ============================================================
# STEP 7 - TOKENIZATION
# ============================================================
print("=" * 65)
print("   STEP 7 - TOKENIZATION")
print("=" * 65)
print()

print("What is Tokenization?")
print("   Converts words to numbers")
print("   'good movie' -> [45, 123]")
print("   'bad film'   -> [67, 89]")
print()

tokenizer = Tokenizer(
    num_words = MAX_WORDS,
    oov_token = "<OOV>"
)
tokenizer.fit_on_texts(df_balanced['clean'])

X = tokenizer.texts_to_sequences(df_balanced['clean'])
X = pad_sequences(
    X,
    maxlen     = MAX_LEN,
    padding    = 'post',
    truncating = 'post'
)
y = df_balanced['label'].values

# Save tokenizer
pickle.dump(tokenizer, open('tokenizer.pkl', 'wb'))

print(f"Tokenization Settings:")
print(f"   Vocabulary size  : {MAX_WORDS:,}")
print(f"   Words found      : {len(tokenizer.word_index):,}")
print(f"   Max length       : {MAX_LEN}")
print(f"   Input shape      : {X.shape}")
print()
print("[OK] STEP 7 - Tokenization complete!")
print("[OK] Tokenizer saved as tokenizer.pkl")
print()




# ============================================================
# STEP 8 - SPLITTING DATA
# ============================================================
print("=" * 65)
print("   STEP 8 - SPLITTING DATA")
print("=" * 65)
print()

split   = int(0.8 * len(X))
X_train = X[:split]
X_test  = X[split:]
y_train = y[:split]
y_test  = y[split:]

# Convert to list to avoid numpy scalar issues
y_test_list = y_test.tolist()

print(f"Data Split:")
print(f"   Training : {len(X_train):,} reviews (80%)")
print(f"   Testing  : {len(X_test):,}  reviews (20%)")
print()
print("[OK] STEP 8 - Split complete!")
print()




# ============================================================
# STEP 9 - BUILDING BIDIRECTIONAL LSTM MODEL
# ============================================================
print("=" * 65)
print("   STEP 9 - BUILDING BIDIRECTIONAL LSTM MODEL")
print("=" * 65)
print()

print("What is BiLSTM?")
print("   Bidirectional Long Short Term Memory")
print()
print("   Normal LSTM reads ONE direction:")
print("   'This movie was great'")
print("    ->    ->    ->    ->")
print()
print("   BiLSTM reads BOTH directions:")
print("   'This movie was great'")
print("    ->    ->    ->    ->")
print("    <-    <-    <-    <-")
print("   Combines both = better understanding!")
print()

model = Sequential([
    Embedding(
        input_dim    = MAX_WORDS,
        output_dim   = EMBED_DIM,
        input_length = MAX_LEN
    ),
    SpatialDropout1D(0.3),
    Bidirectional(LSTM(
        LSTM_UNITS,
        dropout           = 0.2,
        recurrent_dropout = 0.2,
        return_sequences  = True
    )),
    Bidirectional(LSTM(
        64,
        dropout           = 0.2,
        recurrent_dropout = 0.2
    )),
    Dense(64, activation='relu'),
    Dropout(0.4),
    Dense(1, activation='sigmoid')
])

model.compile(
    optimizer = tf.keras.optimizers.Adam(learning_rate=LR),
    loss      = 'binary_crossentropy',
    metrics   = ['accuracy']
)

print("Model Architecture:")
model.summary()
print()
print("[OK] STEP 9 - Model built!")
print()




# ============================================================
# STEP 10 - TRAINING THE MODEL
# ============================================================
print("=" * 65)
print("   STEP 10 - TRAINING BILSTM MODEL")
print("=" * 65)
print()
print("Training started...")
print("Watch live accuracy and loss below:")
print()

early_stop = EarlyStopping(
    monitor              = 'val_loss',
    patience             = 3,
    restore_best_weights = True,
    verbose              = 1
)

checkpoint = ModelCheckpoint(
    'best_bilstm_model.h5',
    monitor        = 'val_accuracy',
    save_best_only = True,
    verbose        = 1
)

reduce_lr = ReduceLROnPlateau(
    monitor  = 'val_loss',
    factor   = 0.5,
    patience = 2,
    verbose  = 1
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
print(f"[OK] STEP 10 - Training complete in {train_time:.1f}s!")
print()




# ============================================================
# STEP 11 - EVALUATING MODEL
# ============================================================
print("=" * 65)
print("   STEP 11 - EVALUATING MODEL")
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
    target_names=['Negative', 'Positive']
))
print("[OK] STEP 11 - Evaluation complete!")
print()




# ============================================================
# STEP 12 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 12 - PREDICTION FUNCTION")
print("=" * 65)
print()

idx2label = {0: 'Negative', 1: 'Positive'}

def predict_sentiment(text):
    clean    = preprocess(text)
    sequence = tokenizer.texts_to_sequences([clean])
    padded   = pad_sequences(
                   sequence,
                   maxlen     = MAX_LEN,
                   padding    = 'post',
                   truncating = 'post'
               )
    prob = float(model.predict(padded, verbose=0)[0][0])

    if prob >= 0.65:
        return "Positive", round(prob * 100, 2)
    elif prob <= 0.35:
        return "Negative", round((1 - prob) * 100, 2)
    else:
        return "Neutral", round(max(prob, 1-prob) * 100, 2)

print("Prediction Logic:")
print("   prob >= 0.65 -> Positive")
print("   prob <= 0.35 -> Negative")
print("   in between   -> Neutral")
print()
print("[OK] STEP 12 - Prediction function ready!")
print()




# ============================================================
# STEP 13 - SAMPLE RESULTS FROM DATASET (50 reviews)
# ============================================================
print("=" * 65)
print("   STEP 13 - SAMPLE RESULTS FROM DATASET")
print("=" * 65)
print()

sample_indices = random.sample(range(len(X_test)), 50)

correct_count = 0
neutral_count = 0
wrong_count   = 0

print("Showing predictions for 50 random reviews:")
print("=" * 65)

for rank, idx in enumerate(sample_indices, 1):
    review    = df_balanced['review'].iloc[split + idx]
    actual    = idx2label[y_test_list[idx]]
    sentiment, confidence = predict_sentiment(review)
    bar       = "#" * int(confidence // 5)

    if sentiment == actual:
        correct_count += 1
        match = "[CORRECT]"
    elif sentiment == "Neutral":
        neutral_count += 1
        match = "[NEUTRAL]"
    else:
        wrong_count += 1
        match = "[WRONG]  "

    print(f"[{rank:2d}] Review    : {review[:85]}...")
    print(f"     Predicted : {sentiment:10s} | {bar} {confidence}%")
    print(f"     Actual    : {actual:10s} | {match}")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Total shown  : 50")
print(f"   Correct      : {correct_count}")
print(f"   Neutral      : {neutral_count}")
print(f"   Wrong        : {wrong_count}")
print(f"   Sample Acc   : {correct_count/50*100:.1f}%")
print()
print("[OK] STEP 13 - Sample results shown!")
print()




# ============================================================
# STEP 14 - VISUALIZATIONS
# ============================================================
print("=" * 65)
print("   STEP 14 - GENERATING VISUALIZATIONS")
print("=" * 65)
print()

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle(
    'SentimentIQ - BiLSTM Sentiment Analysis (TensorFlow)',
    fontsize=16, fontweight='bold'
)

epochs_range = range(1, len(history.history['accuracy']) + 1)

# Graph 1 - Training vs Validation Accuracy
axes[0, 0].plot(
    epochs_range,
    [a * 100 for a in history.history['accuracy']],
    'o-', label='Train Accuracy',
    color='#1D9E75', linewidth=2, markersize=5
)
axes[0, 0].plot(
    epochs_range,
    [a * 100 for a in history.history['val_accuracy']],
    's--', label='Val Accuracy',
    color='#D85A30', linewidth=2, markersize=5
)
axes[0, 0].set_title(
    'Training vs Validation Accuracy',
    fontweight='bold'
)
axes[0, 0].set_xlabel('Epoch')
axes[0, 0].set_ylabel('Accuracy (%)')
axes[0, 0].set_ylim(50, 100)
axes[0, 0].legend()
axes[0, 0].grid(alpha=0.3)

# Graph 2 - Training vs Validation Loss
axes[0, 1].plot(
    epochs_range,
    history.history['loss'],
    'o-', label='Train Loss',
    color='#7F77DD', linewidth=2, markersize=5
)
axes[0, 1].plot(
    epochs_range,
    history.history['val_loss'],
    's--', label='Val Loss',
    color='#F5A623', linewidth=2, markersize=5
)
axes[0, 1].set_title(
    'Training vs Validation Loss',
    fontweight='bold'
)
axes[0, 1].set_xlabel('Epoch')
axes[0, 1].set_ylabel('Loss')
axes[0, 1].legend()
axes[0, 1].grid(alpha=0.3)

# Graph 3 - Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Blues',
    xticklabels = ['Negative', 'Positive'],
    yticklabels = ['Negative', 'Positive'],
    ax          = axes[0, 2]
)
axes[0, 2].set_title('Confusion Matrix', fontweight='bold')
axes[0, 2].set_xlabel('Predicted')
axes[0, 2].set_ylabel('Actual')

# Graph 4 - Predicted Distribution
pos_c = int((y_pred == 1).sum())
neg_c = int((y_pred == 0).sum())
axes[1, 0].pie(
    [pos_c, neg_c],
    labels     = [f'Positive\n{pos_c}',
                  f'Negative\n{neg_c}'],
    colors     = ['#22c55e', '#ef4444'],
    autopct    = '%1.1f%%',
    startangle = 90
)
axes[1, 0].set_title(
    'Predicted Distribution',
    fontweight='bold'
)

# Graph 5 - Confidence Distribution
# Fix: convert properly to float
confidences = []
for p in y_pred_prob.flatten():
    p_val = float(p)
    if p_val >= 0.5:
        confidences.append(round(p_val * 100, 2))
    else:
        confidences.append(round((1 - p_val) * 100, 2))

axes[1, 1].hist(
    confidences, bins=20,
    color='#6366f1', edgecolor='white'
)
axes[1, 1].axvline(
    np.mean(confidences),
    color='red', linestyle='--',
    label=f'Mean: {np.mean(confidences):.1f}%'
)
axes[1, 1].set_title(
    'Confidence Distribution',
    fontweight='bold'
)
axes[1, 1].set_xlabel('Confidence (%)')
axes[1, 1].set_ylabel('Count')
axes[1, 1].legend()

# Graph 6 - Actual vs Predicted
categories       = ['Negative', 'Positive']
actual_counts    = [
    int((y_test == 0).sum()),
    int((y_test == 1).sum())
]
predicted_counts = [
    int((y_pred == 0).sum()),
    int((y_pred == 1).sum())
]
x     = np.arange(len(categories))
width = 0.35
b1    = axes[1, 2].bar(
    x - width/2, actual_counts,
    width, label='Actual',    color='#6366f1'
)
b2    = axes[1, 2].bar(
    x + width/2, predicted_counts,
    width, label='Predicted', color='#22d3ee'
)
axes[1, 2].set_title(
    'Actual vs Predicted',
    fontweight='bold'
)
axes[1, 2].set_xticks(x)
axes[1, 2].set_xticklabels(categories)
axes[1, 2].legend()
axes[1, 2].set_ylabel('Count')
for bar in list(b1) + list(b2):
    axes[1, 2].text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 3,
        str(bar.get_height()),
        ha='center', fontsize=9
    )

plt.tight_layout()
plt.savefig('bilstm_tf_graph.png', dpi=150, bbox_inches='tight')
print("[OK] Graph saved as bilstm_tf_graph.png")
plt.show()
print()




# ============================================================
# STEP 15 - SAVE MODEL AND RESULTS
# ============================================================
print("=" * 65)
print("   STEP 15 - SAVING MODEL AND RESULTS")
print("=" * 65)
print()

model.save('bilstm_tf_model.h5')
print("[OK] Model saved as bilstm_tf_model.h5")
print()

results_df = pd.DataFrame({
    'Actual Sentiment'   : [idx2label[l] for l in y_test_list],
    'Predicted Sentiment': [idx2label[int(p)] for p in y_pred],
    'Confidence'         : confidences,
    'Correct'            : ['YES' if a == p else 'NO'
                            for a, p in zip(
                                y_test_list,
                                y_pred.tolist()
                            )]
})
results_df.to_csv('bilstm_tf_results.csv', index=False)
print("[OK] Results saved to bilstm_tf_results.csv")
print()

total    = len(results_df)
correct  = len(results_df[results_df['Correct'] == 'YES'])
avg_conf = results_df['Confidence'].mean()

print("Results Summary:")
print(f"   Total Predictions  : {total:,}")
print(f"   Correct            : {correct:,}")
print(f"   Wrong              : {total - correct:,}")
print(f"   Average Confidence : {avg_conf:.1f}%")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   ANALYSIS COMPLETE - BILSTM (TENSORFLOW)")
print("=" * 65)
print()
print(f"   Model           : Bidirectional LSTM (TensorFlow)")
print(f"   Dataset         : IMDB Movie Reviews")
print(f"   Total Reviews   : {len(df_balanced):,}")
print(f"   Training Size   : {len(X_train):,}")
print(f"   Testing Size    : {len(X_test):,}")
print(f"   Vocabulary Size : {MAX_WORDS:,}")
print(f"   Accuracy        : {accuracy:.2f}%")
print(f"   Training Time   : {train_time:.1f} seconds")
print()
print("   Output Files:")
print("   bilstm_tf_graph.png    - 6 Visualizations")
print("   bilstm_tf_results.csv  - Full results")
print("   bilstm_tf_model.h5     - Saved model")
print("   best_bilstm_model.h5   - Best model weights")
print("   tokenizer.pkl          - Saved tokenizer")
print("=" * 65)
