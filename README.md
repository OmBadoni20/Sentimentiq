# ============================================================
# SENTIMENTIQ - BILSTM SENTIMENT ANALYSIS
# Model   : Bidirectional LSTM (PyTorch)
# Dataset : IMDB Movie Reviews (18,000 reviews)
# Classes : Positive / Negative / Neutral
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']            = ''
os.environ['REQUESTS_CA_BUNDLE']        = ''
os.environ['PYTHONHTTPSVERIFY']         = '0'
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'




# ============================================================
# STEP 1 - INSTALLING DEPENDENCIES
# ============================================================
# Run in CMD before running this script:
# pip install torch pandas numpy matplotlib seaborn
#     scikit-learn --trusted-host pypi.org
#     --trusted-host files.pythonhosted.org




# ============================================================
# STEP 2 - IMPORTING LIBRARIES
# ============================================================
import torch
import torch.nn              as nn
import torch.optim           as optim
from torch.utils.data        import Dataset, DataLoader

import pandas                as pd
import numpy                 as np
import matplotlib.pyplot     as plt
import seaborn               as sns
import re
import random
import time
import warnings

from collections             import Counter
from sklearn.metrics         import (classification_report,
                                     confusion_matrix,
                                     accuracy_score)

warnings.filterwarnings('ignore')

# Reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# Hyperparameters
MAX_LEN    = 200
VOCAB_SIZE = 20000
EMBED_DIM  = 128
HIDDEN_DIM = 256
NUM_EPOCHS = 15
BATCH_SIZE = 64
LR         = 1e-3
DEVICE     = torch.device(
    'cuda' if torch.cuda.is_available() else 'cpu'
)

print("=" * 65)
print("   SENTIMENTIQ - BILSTM SENTIMENT ANALYSIS")
print("=" * 65)
print()
print(f"   Device     : {DEVICE}")
print(f"   PyTorch    : {torch.__version__}")
print(f"   MAX_LEN    : {MAX_LEN}")
print(f"   VOCAB_SIZE : {VOCAB_SIZE:,}")
print(f"   EMBED_DIM  : {EMBED_DIM}")
print(f"   HIDDEN_DIM : {HIDDEN_DIM}")
print(f"   EPOCHS     : {NUM_EPOCHS}")
print(f"   BATCH SIZE : {BATCH_SIZE}")
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
    # Truncate to MAX_LEN words
    words = text.split()[:MAX_LEN]
    return ' '.join(words)

print("Preprocessing steps:")
print("   - Converting to lowercase")
print("   - Removing HTML tags")
print("   - Removing URLs")
print("   - Removing special characters")
print("   - Truncating to MAX_LEN words")
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
# STEP 7 - BUILDING VOCABULARY
# ============================================================
print("=" * 65)
print("   STEP 7 - BUILDING VOCABULARY")
print("=" * 65)
print()

print("What is Vocabulary?")
print("   Maps every word to a unique number")
print("   'good'    -> 45")
print("   'bad'     -> 67")
print("   'amazing' -> 123")
print()

all_words   = []
for text in df_balanced['clean']:
    all_words.extend(text.split())

word_counts = Counter(all_words)
vocab       = ['<PAD>', '<UNK>'] + [
    w for w, c in word_counts.most_common(VOCAB_SIZE - 2)
    if c >= 2
]
word2idx    = {w: i for i, w in enumerate(vocab)}
idx2word    = {i: w for w, i in word2idx.items()}

print(f"Vocabulary Settings:")
print(f"   Max vocabulary : {VOCAB_SIZE:,}")
print(f"   Actual words   : {len(vocab):,}")
print(f"   Total words    : {len(all_words):,}")
print(f"   Unique words   : {len(word_counts):,}")
print()

def encode(text):
    tokens = text.split()[:MAX_LEN]
    ids    = [word2idx.get(t, 1) for t in tokens]
    ids    = ids + [0] * (MAX_LEN - len(ids))
    return ids

print("[OK] STEP 7 - Vocabulary built!")
print()




# ============================================================
# STEP 8 - PREPARING DATA
# ============================================================
print("=" * 65)
print("   STEP 8 - PREPARING DATA")
print("=" * 65)
print()

idx2label = {0: 'Negative', 1: 'Positive'}

X = [encode(t) for t in df_balanced['clean']]
y = df_balanced['label'].tolist()

# 80% train 20% test
split       = int(0.8 * len(X))
X_train     = X[:split]
X_test      = X[split:]
y_train     = y[:split]
y_test      = y[split:]

print(f"Data Split:")
print(f"   Training : {len(X_train):,} reviews (80%)")
print(f"   Testing  : {len(X_test):,}  reviews (20%)")
print()

class ReviewDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.long)
        self.y = torch.tensor(y, dtype=torch.long)
    def __len__(self):
        return len(self.X)
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_loader = DataLoader(
    ReviewDataset(X_train, y_train),
    batch_size=BATCH_SIZE, shuffle=True
)
test_loader  = DataLoader(
    ReviewDataset(X_test, y_test),
    batch_size=BATCH_SIZE, shuffle=False
)

print("[OK] STEP 8 - Data prepared!")
print()




# ============================================================
# STEP 9 - BUILDING BILSTM MODEL
# ============================================================
print("=" * 65)
print("   STEP 9 - BUILDING BILSTM MODEL")
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

class BiLSTMModel(nn.Module):
    def __init__(self):
        super(BiLSTMModel, self).__init__()
        self.embedding = nn.Embedding(
            len(vocab), EMBED_DIM, padding_idx=0
        )
        self.lstm = nn.LSTM(
            EMBED_DIM,
            HIDDEN_DIM,
            num_layers    = 2,
            bidirectional = True,
            batch_first   = True,
            dropout       = 0.3
        )
        self.dropout = nn.Dropout(0.4)
        self.fc1     = nn.Linear(HIDDEN_DIM * 2, 128)
        self.fc2     = nn.Linear(128, 2)
        self.relu    = nn.ReLU()
        self.bn      = nn.BatchNorm1d(128)

    def forward(self, x):
        emb      = self.dropout(self.embedding(x))
        out, _   = self.lstm(emb)
        out      = out[:, -1, :]
        out      = self.dropout(out)
        out      = self.relu(self.bn(self.fc1(out)))
        out      = self.fc2(out)
        return out

model     = BiLSTMModel().to(DEVICE)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(
    model.parameters(), lr=LR, weight_decay=1e-5
)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', patience=2, factor=0.5
)

total_params = sum(
    p.numel() for p in model.parameters()
    if p.requires_grad
)

print("Model Architecture:")
print(model)
print()
print(f"   Vocabulary Size : {len(vocab):,}")
print(f"   Total Params    : {total_params:,}")
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
print("Training started... please wait...")
print()

train_acc_history = []
val_acc_history   = []
loss_history      = []
best_val_acc      = 0
start_time        = time.time()

for epoch in range(NUM_EPOCHS):
    # Training
    model.train()
    total_loss    = 0
    correct_train = 0
    total_train   = 0

    for X_batch, y_batch in train_loader:
        X_batch = X_batch.to(DEVICE)
        y_batch = y_batch.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(X_batch)
        loss    = criterion(outputs, y_batch)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        total_loss    += loss.item()
        preds          = outputs.argmax(dim=1)
        correct_train += (preds == y_batch).sum().item()
        total_train   += y_batch.size(0)

    train_acc = correct_train / total_train

    # Validation
    model.eval()
    correct_val = 0
    total_val   = 0
    val_loss    = 0

    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch  = X_batch.to(DEVICE)
            y_batch  = y_batch.to(DEVICE)
            outputs  = model(X_batch)
            loss     = criterion(outputs, y_batch)
            val_loss += loss.item()
            preds    = outputs.argmax(dim=1)
            correct_val += (preds == y_batch).sum().item()
            total_val   += y_batch.size(0)

    val_acc      = correct_val / total_val
    avg_val_loss = val_loss / len(test_loader)

    scheduler.step(avg_val_loss)

    train_acc_history.append(train_acc)
    val_acc_history.append(val_acc)
    loss_history.append(total_loss / len(train_loader))

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), 'best_model.pt')

    print(f"Epoch {epoch+1:2d}/{NUM_EPOCHS} | "
          f"Loss: {total_loss/len(train_loader):.4f} | "
          f"Train: {train_acc*100:.2f}% | "
          f"Val: {val_acc*100:.2f}% | "
          f"Best: {best_val_acc*100:.2f}%")

train_time = time.time() - start_time
print()
print(f"[OK] STEP 10 - Training complete in {train_time:.1f}s!")
print(f"     Best Validation Accuracy: {best_val_acc*100:.2f}%")
print()




# ============================================================
# STEP 11 - EVALUATING MODEL
# ============================================================
print("=" * 65)
print("   STEP 11 - EVALUATING MODEL")
print("=" * 65)
print()

model.load_state_dict(torch.load('best_model.pt'))
model.eval()

all_preds  = []
all_labels = []
all_probs  = []

with torch.no_grad():
    for X_batch, y_batch in test_loader:
        X_batch = X_batch.to(DEVICE)
        outputs = model(X_batch)
        probs   = torch.softmax(outputs, dim=1)
        preds   = outputs.argmax(dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(y_batch.numpy())
        all_probs.extend(probs.cpu().numpy())

accuracy = accuracy_score(all_labels, all_preds) * 100

print(f"Model Accuracy : {accuracy:.2f}%")
print(f"Best Val Acc   : {best_val_acc*100:.2f}%")
print()
print("Classification Report:")
print("-" * 65)
print(classification_report(
    all_labels, all_preds,
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

def predict_sentiment(text):
    model.eval()
    clean  = preprocess(text)
    ids    = torch.tensor(
                 [encode(clean)],
                 dtype=torch.long
             ).to(DEVICE)
    with torch.no_grad():
        logits = model(ids)
        probs  = torch.softmax(logits, dim=1).squeeze()

    pred       = logits.argmax(dim=1).item()
    confidence = round(probs[pred].item() * 100, 2)
    label      = idx2label[pred]

    if confidence < 65:
        return "Neutral", confidence
    return label, confidence

print("Prediction Logic:")
print("   Confidence >= 65% -> Positive or Negative")
print("   Confidence <  65% -> Neutral")
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

# Take 50 random reviews from test set
sample_indices = random.sample(range(len(X_test)), 50)

correct_count = 0
neutral_count = 0

print(f"Showing predictions for 50 reviews from dataset:")
print("=" * 65)

for rank, idx in enumerate(sample_indices, 1):
    review    = df_balanced['review'].iloc[
                    split + idx
                ]
    actual    = idx2label[y_test[idx]]
    sentiment, confidence = predict_sentiment(review)
    bar       = "#" * int(confidence // 5)

    if sentiment == actual:
        correct_count += 1
        match = "[CORRECT]"
    elif sentiment == "Neutral":
        neutral_count += 1
        match = "[NEUTRAL]"
    else:
        match = "[WRONG]  "

    print(f"[{rank:2d}] Review   : {review[:85]}...")
    print(f"     Predicted: {sentiment:10s} | {bar} {confidence}%")
    print(f"     Actual   : {actual:10s} | {match}")
    print("-" * 65)

print()
print(f"Sample Summary:")
print(f"   Total shown  : 50")
print(f"   Correct      : {correct_count}")
print(f"   Neutral      : {neutral_count}")
print(f"   Wrong        : {50 - correct_count - neutral_count}")
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

epochs_range = range(1, NUM_EPOCHS + 1)

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle(
    'SentimentIQ - BiLSTM Sentiment Analysis',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Training vs Validation Accuracy
axes[0, 0].plot(
    epochs_range,
    [a * 100 for a in train_acc_history],
    'o-', label='Train Accuracy',
    color='#1D9E75', linewidth=2, markersize=5
)
axes[0, 0].plot(
    epochs_range,
    [a * 100 for a in val_acc_history],
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

# Graph 2 - Training Loss
axes[0, 1].plot(
    epochs_range, loss_history,
    'o-', color='#7F77DD',
    linewidth=2, markersize=5
)
axes[0, 1].set_title('Training Loss', fontweight='bold')
axes[0, 1].set_xlabel('Epoch')
axes[0, 1].set_ylabel('Loss')
axes[0, 1].grid(alpha=0.3)

# Graph 3 - Confusion Matrix
cm = confusion_matrix(all_labels, all_preds)
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
pos_c = sum(1 for p in all_preds if p == 1)
neg_c = sum(1 for p in all_preds if p == 0)
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
confidences = [round(max(p) * 100, 2) for p in all_probs]
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
actual_counts    = [all_labels.count(0), all_labels.count(1)]
predicted_counts = [
    list(all_preds).count(0),
    list(all_preds).count(1)
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
axes[1, 2].set_title('Actual vs Predicted', fontweight='bold')
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
plt.savefig('bilstm_graph.png', dpi=150, bbox_inches='tight')
print("[OK] Graph saved as bilstm_graph.png")
plt.show()
print()




# ============================================================
# STEP 15 - SAVE MODEL AND RESULTS
# ============================================================
print("=" * 65)
print("   STEP 15 - SAVING MODEL AND RESULTS")
print("=" * 65)
print()

# Save full model
torch.save({
    'model_state' : model.state_dict(),
    'vocab'       : vocab,
    'word2idx'    : word2idx,
    'idx2label'   : idx2label,
    'config'      : {
        'vocab_size' : len(vocab),
        'embed_dim'  : EMBED_DIM,
        'hidden_dim' : HIDDEN_DIM,
        'max_len'    : MAX_LEN
    }
}, 'bilstm_sentiment_model.pt')

print("[OK] Model saved as bilstm_sentiment_model.pt")
print()

# Save results
results_df = pd.DataFrame({
    'Actual Sentiment'   : [idx2label[l] for l in all_labels],
    'Predicted Sentiment': [idx2label[p] for p in all_preds],
    'Confidence'         : [round(max(p)*100, 2) for p in all_probs],
    'Correct'            : ['YES' if a == p else 'NO'
                            for a, p in zip(all_labels, all_preds)]
})
results_df.to_csv('bilstm_results.csv', index=False)
print("[OK] Results saved to bilstm_results.csv")
print()

total   = len(results_df)
correct = len(results_df[results_df['Correct'] == 'YES'])
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
print("   ANALYSIS COMPLETE - BILSTM SENTIMENT ANALYSIS")
print("=" * 65)
print()
print(f"   Model           : Bidirectional LSTM (PyTorch)")
print(f"   Dataset         : IMDB Movie Reviews")
print(f"   Total Reviews   : {len(df_balanced):,}")
print(f"   Training Size   : {len(X_train):,}")
print(f"   Testing Size    : {len(X_test):,}")
print(f"   Vocabulary Size : {len(vocab):,}")
print(f"   Total Params    : {total_params:,}")
print(f"   Accuracy        : {accuracy:.2f}%")
print(f"   Best Val Acc    : {best_val_acc*100:.2f}%")
print(f"   Training Time   : {train_time:.1f} seconds")
print()
print("   Output Files:")
print("   bilstm_graph.png           - 6 Visualizations")
print("   bilstm_results.csv         - Full results")
print("   bilstm_sentiment_model.pt  - Saved model")
print("=" * 65)
