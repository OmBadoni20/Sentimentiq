# ============================================================
# SENTIMENTIQ - LOAD AND PREDICT (NO TRAINING!)
# Just loads saved model and shows results
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
import pandas  as pd
import numpy   as np
import matplotlib.pyplot as plt
import seaborn as sns
import pickle
import random
import re
import warnings
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

warnings.filterwarnings('ignore')

MAX_LEN   = 200
idx2label = {0: 'Negative', 1: 'Positive'}
SEED      = 42
random.seed(SEED)

print("=" * 65)
print("   SENTIMENTIQ - LOADING SAVED MODEL")
print("   NO TRAINING - Instant predictions!")
print("=" * 65)
print()

# ============================================================
# LOAD MODEL AND TOKENIZER
# ============================================================
print("Loading saved model and tokenizer...")
print()

model     = tf.keras.models.load_model('best_bilstm_model.h5')
tokenizer = pickle.load(open('tokenizer.pkl', 'rb'))

print("[OK] Model loaded successfully!")
print("[OK] Tokenizer loaded successfully!")
print()
print(f"   Model    : Bidirectional LSTM (TensorFlow)")
print(f"   Classes  : Positive / Negative / Neutral")
print()




# ============================================================
# HELPER FUNCTIONS
# ============================================================
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




# ============================================================
# LOAD DATASET FOR SAMPLE RESULTS
# ============================================================
print("=" * 65)
print("   LOADING DATASET")
print("=" * 65)
print()

df = pd.read_csv("IMDB_full.csv")
df.columns = ["review", "sentiment"]
df["label"] = df["sentiment"].map({
    "positive": 1,
    "negative": 0
})
df = df.dropna().reset_index(drop=True)

print(f"[OK] Dataset loaded!")
print(f"   Total reviews : {len(df):,}")
print()




# ============================================================
# SHOW 50 SAMPLE RESULTS FROM DATASET
# ============================================================
print("=" * 65)
print("   SAMPLE RESULTS FROM DATASET (50 reviews)")
print("=" * 65)
print()

sample = df.sample(50, random_state=SEED).reset_index(drop=True)

correct_count = 0
neutral_count = 0
wrong_count   = 0

for rank in range(50):
    review    = sample['review'].iloc[rank]
    actual    = "Positive" if sample['label'].iloc[rank] == 1 else "Negative"
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

    print(f"[{rank+1:2d}] Review    : {review[:85]}...")
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




# ============================================================
# EVALUATE ON TEST SET
# ============================================================
print("=" * 65)
print("   EVALUATING ON TEST DATA")
print("=" * 65)
print()

# Prepare test data
from tensorflow.keras.preprocessing.sequence import pad_sequences

df_sample = df.sample(2000, random_state=SEED).reset_index(drop=True)
df_sample['clean'] = df_sample['review'].apply(preprocess)

X_eval = tokenizer.texts_to_sequences(df_sample['clean'])
X_eval = pad_sequences(X_eval, maxlen=MAX_LEN, padding='post', truncating='post')
y_eval = df_sample['label'].values

y_prob = model.predict(X_eval, verbose=0)
y_pred = (y_prob > 0.5).astype(int).flatten()
acc    = accuracy_score(y_eval, y_pred) * 100

print(f"Evaluation on 2000 random reviews:")
print(f"   Accuracy : {acc:.2f}%")
print()
print("Classification Report:")
print("-" * 65)
print(classification_report(
    y_eval, y_pred,
    target_names=['Negative', 'Positive']
))




# ============================================================
# VISUALIZATIONS
# ============================================================
print("=" * 65)
print("   GENERATING VISUALIZATIONS")
print("=" * 65)
print()

fig, axes = plt.subplots(1, 3, figsize=(15, 5))
fig.suptitle(
    'SentimentIQ - BiLSTM Results (Loaded Model)',
    fontsize=14, fontweight='bold'
)

# Graph 1 - Confusion Matrix
cm = confusion_matrix(y_eval, y_pred)
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Blues',
    xticklabels = ['Negative', 'Positive'],
    yticklabels = ['Negative', 'Positive'],
    ax          = axes[0]
)
axes[0].set_title('Confusion Matrix', fontweight='bold')
axes[0].set_xlabel('Predicted')
axes[0].set_ylabel('Actual')

# Graph 2 - Predicted Distribution
pos_c = int((y_pred == 1).sum())
neg_c = int((y_pred == 0).sum())
axes[1].pie(
    [pos_c, neg_c],
    labels     = [f'Positive\n{pos_c}', f'Negative\n{neg_c}'],
    colors     = ['#22c55e', '#ef4444'],
    autopct    = '%1.1f%%',
    startangle = 90
)
axes[1].set_title('Predicted Distribution', fontweight='bold')

# Graph 3 - Confidence Distribution
confidences = []
for p in y_prob.flatten():
    p_val = float(p)
    if p_val >= 0.5:
        confidences.append(round(p_val * 100, 2))
    else:
        confidences.append(round((1 - p_val) * 100, 2))

axes[2].hist(confidences, bins=20, color='#6366f1', edgecolor='white')
axes[2].axvline(
    np.mean(confidences), color='red',
    linestyle='--',
    label=f'Mean: {np.mean(confidences):.1f}%'
)
axes[2].set_title('Confidence Distribution', fontweight='bold')
axes[2].set_xlabel('Confidence (%)')
axes[2].set_ylabel('Count')
axes[2].legend()

plt.tight_layout()
plt.savefig('predict_graph.png', dpi=150, bbox_inches='tight')
print("[OK] Graph saved as predict_graph.png")
plt.show()
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   PREDICTION COMPLETE")
print("=" * 65)
print()
print(f"   Model loaded from  : best_bilstm_model.h5")
print(f"   Tokenizer from     : tokenizer.pkl")
print(f"   Dataset            : IMDB_full.csv")
print(f"   Sample results     : 50 reviews shown")
print(f"   Evaluation acc     : {acc:.2f}%")
print(f"   Correct (sample)   : {correct_count}/50")
print(f"   Output graph       : predict_graph.png")
print("=" * 65)
