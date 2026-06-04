# ============================================================
# SENTIMENTIQ - ROBERTA BASE FINE TUNED
# Works with Internal only, External only, or Both!
# Classes  : Positive / Negative / Neutral
# Expected : 88-93% accuracy
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']            = ''
os.environ['REQUESTS_CA_BUNDLE']        = ''
os.environ['PYTHONHTTPSVERIFY']         = '0'
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'
os.environ['TRANSFORMERS_VERIFY_SSL']   = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL']      = '2'

import pandas            as pd
import numpy             as np
import matplotlib.pyplot as plt
import seaborn           as sns
import time
import warnings

warnings.filterwarnings('ignore')

# ============================================================
# CONFIGURE HERE - Choose which datasets to use
# ============================================================
USE_INTERNAL = True   # Set False to skip internal
USE_EXTERNAL = True   # Set False to skip external
# ============================================================

print("=" * 65)
print("   SENTIMENTIQ - ROBERTA BASE FINE TUNED")
print("   Best model for IT feedback!")
print("   Positive / Negative / Neutral")
print("=" * 65)
print()
print(f"   USE_INTERNAL : {USE_INTERNAL}")
print(f"   USE_EXTERNAL : {USE_EXTERNAL}")
print()




# ============================================================
# STEP 1 - IMPORT LIBRARIES
# ============================================================
# Run this first in CMD:
# pip install transformers torch datasets accelerate
#     --trusted-host pypi.org
#     --trusted-host files.pythonhosted.org

print("=" * 65)
print("   STEP 1 - IMPORTING LIBRARIES")
print("=" * 65)
print()

import torch
from torch.utils.data        import Dataset, DataLoader
from transformers            import (
    RobertaTokenizer,
    RobertaForSequenceClassification,
    AdamW,
    get_linear_schedule_with_warmup
)
from sklearn.model_selection import train_test_split
from sklearn.metrics         import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

device = torch.device(
    'cuda' if torch.cuda.is_available() else 'cpu'
)
print(f"[OK] Libraries imported!")
print(f"[OK] Device : {device}")
if device.type == 'cpu':
    print("     Running on CPU")
    print("     Training will take 30-45 minutes")
else:
    print("     Running on GPU - fast!")
print()

label2id    = {'Negative':0, 'Neutral':1, 'Positive':2}
id2label    = {0:'Negative', 1:'Neutral', 2:'Positive'}
SEED        = 42
MAX_LEN     = 128
BATCH_SIZE  = 16
EPOCHS      = 4
LR          = 2e-5

torch.manual_seed(SEED)
np.random.seed(SEED)




# ============================================================
# STEP 2 - LOAD DATASETS
# ============================================================
print("=" * 65)
print("   STEP 2 - LOADING DATASETS")
print("=" * 65)
print()

datasets    = []
df_internal = None
df_external = None

if USE_INTERNAL:
    try:
        df_internal = pd.read_csv(
            "Internal_Employee_Feedback_Balanced.csv"
        )
        df_int_train = df_internal.copy()
        df_int_train['text']   = df_int_train['Customer_Feedback']
        df_int_train['label']  = df_int_train['Predicted_Sentiment']\
            .map(label2id)
        df_int_train['source'] = 'Internal'
        datasets.append(
            df_int_train[['text','label',
                          'Predicted_Sentiment','source']]
        )
        print(f"[OK] Internal loaded : {len(df_internal):,} rows")
    except FileNotFoundError:
        print("[SKIP] Internal file not found!")
        USE_INTERNAL = False

if USE_EXTERNAL:
    try:
        df_external = pd.read_csv(
            "External_Client_Feedback_Balanced.csv"
        )
        df_ext_train = df_external.copy()
        df_ext_train['text']   = df_ext_train['Client_Feedback']
        df_ext_train['label']  = df_ext_train['Predicted_Sentiment']\
            .map(label2id)
        df_ext_train['source'] = 'External'
        datasets.append(
            df_ext_train[['text','label',
                          'Predicted_Sentiment','source']]
        )
        print(f"[OK] External loaded : {len(df_external):,} rows")
    except FileNotFoundError:
        print("[SKIP] External file not found!")
        USE_EXTERNAL = False

if len(datasets) == 0:
    print()
    print("ERROR: No datasets found!")
    print("Please add at least one CSV file!")
    exit()

df_all = pd.concat(
    datasets, ignore_index=True
).sample(frac=1, random_state=SEED).reset_index(drop=True)

df_all = df_all.dropna(subset=['text','label'])
df_all['label'] = df_all['label'].astype(int)

print()
print(f"[OK] Total combined  : {len(df_all):,} rows")
print()
print("DISTRIBUTION:")
for sent, cnt in df_all['Predicted_Sentiment'].value_counts().items():
    pct = cnt/len(df_all)*100
    bar = "#" * int(pct/2)
    print(f"   {sent:10s} : {cnt:,} ({pct:.1f}%) {bar}")
print()
print("[OK] STEP 2 - Datasets loaded!")
print()




# ============================================================
# STEP 3 - LOAD TOKENIZER
# ============================================================
print("=" * 65)
print("   STEP 3 - LOADING ROBERTA TOKENIZER")
print("=" * 65)
print()

print("Downloading RoBERTa tokenizer...")
print("First time = ~500MB download")
print("After that = loads from cache!")
print()

tokenizer = RobertaTokenizer.from_pretrained('roberta-base')

print("[OK] Tokenizer loaded!")
print()




# ============================================================
# STEP 4 - PREPARE DATASET CLASS
# ============================================================
print("=" * 65)
print("   STEP 4 - PREPARING DATASET")
print("=" * 65)
print()

class FeedbackDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len):
        self.texts     = texts
        self.labels    = labels
        self.tokenizer = tokenizer
        self.max_len   = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            str(self.texts[idx]),
            max_length     = self.max_len,
            padding        = 'max_length',
            truncation     = True,
            return_tensors = 'pt'
        )
        return {
            'input_ids'     : encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels'        : torch.tensor(
                self.labels[idx], dtype=torch.long
            )
        }

train_texts, test_texts, train_labels, test_labels = \
    train_test_split(
        df_all['text'].tolist(),
        df_all['label'].tolist(),
        test_size    = 0.2,
        random_state = SEED,
        stratify     = df_all['label'].tolist()
    )

train_dataset = FeedbackDataset(
    train_texts, train_labels, tokenizer, MAX_LEN
)
test_dataset  = FeedbackDataset(
    test_texts, test_labels, tokenizer, MAX_LEN
)

train_loader  = DataLoader(
    train_dataset, batch_size=BATCH_SIZE, shuffle=True
)
test_loader   = DataLoader(
    test_dataset, batch_size=BATCH_SIZE, shuffle=False
)

print(f"Training samples : {len(train_dataset):,}")
print(f"Testing  samples : {len(test_dataset):,}")
print(f"Batch size       : {BATCH_SIZE}")
print(f"Max length       : {MAX_LEN}")
print()
print("[OK] STEP 4 - Dataset ready!")
print()




# ============================================================
# STEP 5 - LOAD ROBERTA MODEL
# ============================================================
print("=" * 65)
print("   STEP 5 - LOADING ROBERTA BASE MODEL")
print("=" * 65)
print()

print("Loading roberta-base...")
print()

model = RobertaForSequenceClassification.from_pretrained(
    'roberta-base',
    num_labels = 3,
    id2label   = id2label,
    label2id   = label2id
)
model = model.to(device)

total_params = sum(p.numel() for p in model.parameters())
trainable    = sum(
    p.numel() for p in model.parameters()
    if p.requires_grad
)

print(f"[OK] Model loaded!")
print(f"   Total parameters : {total_params:,}")
print(f"   Trainable params : {trainable:,}")
print(f"   Classes          : 3")
print()




# ============================================================
# STEP 6 - SET UP TRAINING
# ============================================================
print("=" * 65)
print("   STEP 6 - SETTING UP TRAINING")
print("=" * 65)
print()

optimizer    = AdamW(
    model.parameters(),
    lr           = LR,
    weight_decay = 0.01
)

total_steps  = len(train_loader) * EPOCHS
warmup_steps = int(0.1 * total_steps)

scheduler    = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps   = warmup_steps,
    num_training_steps = total_steps
)

print(f"Optimizer     : AdamW")
print(f"Learning rate : {LR}")
print(f"Epochs        : {EPOCHS}")
print(f"Total steps   : {total_steps:,}")
print(f"Warmup steps  : {warmup_steps:,}")
print()
print("[OK] STEP 6 - Training setup done!")
print()




# ============================================================
# STEP 7 - TRAIN THE MODEL
# ============================================================
print("=" * 65)
print("   STEP 7 - TRAINING ROBERTA BASE")
print("=" * 65)
print()
print("Fine tuning RoBERTa on our IT feedback...")
print("Watch progress below:")
print()

train_losses = []
train_accs   = []
val_accs     = []
best_val_acc = 0
best_epoch   = 0

for epoch in range(EPOCHS):
    print(f"EPOCH {epoch+1}/{EPOCHS}")
    print("-" * 65)

    # Training
    model.train()
    total_loss = 0
    correct    = 0
    total      = 0
    start      = time.time()

    for batch_idx, batch in enumerate(train_loader):
        input_ids      = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels         = batch['labels'].to(device)

        optimizer.zero_grad()

        outputs = model(
            input_ids      = input_ids,
            attention_mask = attention_mask,
            labels         = labels
        )

        loss        = outputs.loss
        logits      = outputs.logits
        predictions = torch.argmax(logits, dim=-1)

        total_loss += loss.item()
        correct    += (predictions == labels).sum().item()
        total      += labels.size(0)

        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            model.parameters(), 1.0
        )
        optimizer.step()
        scheduler.step()

        if (batch_idx+1) % 50 == 0:
            elapsed  = time.time() - start
            avg_loss = total_loss / (batch_idx+1)
            acc      = correct / total * 100
            print(f"   Batch {batch_idx+1:3d}/{len(train_loader)} | "
                  f"Loss: {avg_loss:.4f} | "
                  f"Acc: {acc:.1f}% | "
                  f"Time: {elapsed:.0f}s")

    train_loss = total_loss / len(train_loader)
    train_acc  = correct / total * 100
    train_losses.append(train_loss)
    train_accs.append(train_acc)

    # Validation
    model.eval()
    val_correct = 0
    val_total   = 0
    all_preds   = []
    all_labs    = []

    with torch.no_grad():
        for batch in test_loader:
            input_ids      = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels         = batch['labels'].to(device)

            outputs     = model(
                input_ids      = input_ids,
                attention_mask = attention_mask
            )
            predictions = torch.argmax(
                outputs.logits, dim=-1
            )

            val_correct += (
                predictions == labels
            ).sum().item()
            val_total   += labels.size(0)
            all_preds.extend(predictions.cpu().numpy())
            all_labs.extend(labels.cpu().numpy())

    val_acc = val_correct / val_total * 100
    val_accs.append(val_acc)

    print()
    print(f"   Train Loss : {train_loss:.4f}")
    print(f"   Train Acc  : {train_acc:.1f}%")
    print(f"   Val Acc    : {val_acc:.1f}%")
    print()

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_epoch   = epoch + 1
        model.save_pretrained('best_roberta_model')
        tokenizer.save_pretrained('best_roberta_model')
        print(f"   [SAVED] Best model! Val Acc: {val_acc:.1f}%")
        print()

print(f"[OK] Training complete!")
print(f"   Best Val Accuracy : {best_val_acc:.1f}%")
print(f"   Best Epoch        : {best_epoch}")
print()




# ============================================================
# STEP 8 - EVALUATE BEST MODEL
# ============================================================
print("=" * 65)
print("   STEP 8 - EVALUATING BEST MODEL")
print("=" * 65)
print()

print("Loading best saved model...")
model = RobertaForSequenceClassification.from_pretrained(
    'best_roberta_model'
)
model = model.to(device)
model.eval()

all_preds  = []
all_labels = []

with torch.no_grad():
    for batch in test_loader:
        input_ids      = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels         = batch['labels'].to(device)

        outputs     = model(
            input_ids      = input_ids,
            attention_mask = attention_mask
        )
        predictions = torch.argmax(
            outputs.logits, dim=-1
        )
        all_preds.extend(predictions.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

final_acc = accuracy_score(all_labels, all_preds) * 100

print(f"Final Accuracy : {final_acc:.1f}%")
print()
print("Classification Report:")
print("-" * 65)
print(classification_report(
    all_labels, all_preds,
    target_names=['Negative','Neutral','Positive']
))
print("[OK] STEP 8 - Evaluation done!")
print()




# ============================================================
# STEP 9 - PREDICTION FUNCTION
# ============================================================
print("=" * 65)
print("   STEP 9 - PREDICTION FUNCTION")
print("=" * 65)
print()

def predict_sentiment(text):
    model.eval()
    encoding = tokenizer(
        str(text),
        max_length     = MAX_LEN,
        padding        = 'max_length',
        truncation     = True,
        return_tensors = 'pt'
    )
    input_ids      = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        outputs    = model(
            input_ids      = input_ids,
            attention_mask = attention_mask
        )
        probs      = torch.softmax(outputs.logits, dim=-1)
        pred_class = torch.argmax(probs, dim=-1).item()
        confidence = round(
            probs[0][pred_class].item() * 100, 2
        )

    sentiment = id2label[pred_class]

    if sentiment == 'Positive':
        csat, dsat = 1, 0
        nps        = 9
        nps_cat    = 'Promoter'
    elif sentiment == 'Negative':
        csat, dsat = 0, 1
        nps        = 2
        nps_cat    = 'Detractor'
    else:
        csat, dsat = 0, 0
        nps        = 6
        nps_cat    = 'Passive'

    return sentiment, confidence, csat, dsat, nps, nps_cat

print("Logic:")
print("   Positive → CSAT=1 DSAT=0 NPS=9 Promoter")
print("   Negative → CSAT=0 DSAT=1 NPS=2 Detractor")
print("   Neutral  → CSAT=0 DSAT=0 NPS=6 Passive")
print()
print("[OK] STEP 9 - Function ready!")
print()




# ============================================================
# STEP 10 - PREDICT ON DATASETS
# ============================================================
print("=" * 65)
print("   STEP 10 - PREDICTING ON DATASETS")
print("=" * 65)
print()

int_acc = None
ext_acc = None

# Internal predictions
if USE_INTERNAL and df_internal is not None:
    total_int       = len(df_internal)
    int_sentiments  = []
    int_confidences = []
    int_csat_preds  = []
    int_dsat_preds  = []

    print(f"Predicting internal : {total_int:,} feedbacks...")
    start = time.time()

    for i, fb in enumerate(df_internal['Customer_Feedback']):
        sent, conf, csat, dsat, nps, nps_cat = \
            predict_sentiment(str(fb))
        int_sentiments.append(sent)
        int_confidences.append(conf)
        int_csat_preds.append(csat)
        int_dsat_preds.append(dsat)

        if (i+1) % 500 == 0 or (i+1) == total_int:
            elapsed = time.time() - start
            print(f"   {i+1:,}/{total_int:,} "
                  f"({(i+1)/total_int*100:.1f}%) | "
                  f"Time: {elapsed:.0f}s")

    int_correct = sum(
        1 for p, a in zip(
            int_sentiments,
            df_internal['Predicted_Sentiment']
        ) if p == a
    )
    int_acc = int_correct / total_int * 100

    df_internal['HF_Sentiment'] = int_sentiments
    df_internal['HF_Confidence']= int_confidences
    df_internal['HF_CSAT']      = int_csat_preds
    df_internal['HF_DSAT']      = int_dsat_preds

    int_csat = sum(int_csat_preds)
    int_dsat = sum(int_dsat_preds)
    int_pos  = int_sentiments.count('Positive')
    int_neg  = int_sentiments.count('Negative')
    int_neu  = int_sentiments.count('Neutral')
    int_sla  = len(df_internal[df_internal.SLA_Breached=='Yes'])

    print()
    print(f"[OK] Internal accuracy : {int_acc:.1f}%")
    print()

# External predictions
if USE_EXTERNAL and df_external is not None:
    total_ext       = len(df_external)
    ext_sentiments  = []
    ext_confidences = []
    ext_csat_preds  = []
    ext_dsat_preds  = []

    print(f"Predicting external : {total_ext:,} feedbacks...")
    start = time.time()

    for i, fb in enumerate(df_external['Client_Feedback']):
        sent, conf, csat, dsat, nps, nps_cat = \
            predict_sentiment(str(fb))
        ext_sentiments.append(sent)
        ext_confidences.append(conf)
        ext_csat_preds.append(csat)
        ext_dsat_preds.append(dsat)

        if (i+1) % 500 == 0 or (i+1) == total_ext:
            elapsed = time.time() - start
            print(f"   {i+1:,}/{total_ext:,} "
                  f"({(i+1)/total_ext*100:.1f}%) | "
                  f"Time: {elapsed:.0f}s")

    ext_correct = sum(
        1 for p, a in zip(
            ext_sentiments,
            df_external['Predicted_Sentiment']
        ) if p == a
    )
    ext_acc = ext_correct / total_ext * 100

    df_external['HF_Sentiment'] = ext_sentiments
    df_external['HF_Confidence']= ext_confidences
    df_external['HF_CSAT']      = ext_csat_preds
    df_external['HF_DSAT']      = ext_dsat_preds

    ext_csat = sum(ext_csat_preds)
    ext_dsat = sum(ext_dsat_preds)
    ext_pos  = ext_sentiments.count('Positive')
    ext_neg  = ext_sentiments.count('Negative')
    ext_neu  = ext_sentiments.count('Neutral')
    ext_sla  = len(df_external[df_external.SLA_Breached=='Yes'])

    print()
    print(f"[OK] External accuracy : {ext_acc:.1f}%")
    print()




# ============================================================
# STEP 11 - SHOW RESULTS
# ============================================================
print("=" * 65)
print("   STEP 11 - RESULTS")
print("=" * 65)
print()

if USE_INTERNAL and df_internal is not None:
    print("INTERNAL EMPLOYEE FEEDBACK:")
    print(f"   Total    : {total_int:,}")
    print(f"   Positive : {int_pos:,} ({int_pos/total_int*100:.1f}%)")
    print(f"   Negative : {int_neg:,} ({int_neg/total_int*100:.1f}%)")
    print(f"   Neutral  : {int_neu:,} ({int_neu/total_int*100:.1f}%)")
    print(f"   CSAT%    : {int_csat/total_int*100:.1f}%")
    print(f"   DSAT%    : {int_dsat/total_int*100:.1f}%")
    print(f"   SLA%     : {int_sla/total_int*100:.1f}%")
    print(f"   Accuracy : {int_acc:.1f}%")
    print()

if USE_EXTERNAL and df_external is not None:
    print("EXTERNAL CLIENT FEEDBACK:")
    print(f"   Total    : {total_ext:,}")
    print(f"   Positive : {ext_pos:,} ({ext_pos/total_ext*100:.1f}%)")
    print(f"   Negative : {ext_neg:,} ({ext_neg/total_ext*100:.1f}%)")
    print(f"   Neutral  : {ext_neu:,} ({ext_neu/total_ext*100:.1f}%)")
    print(f"   CSAT%    : {ext_csat/total_ext*100:.1f}%")
    print(f"   DSAT%    : {ext_dsat/total_ext*100:.1f}%")
    print(f"   SLA%     : {ext_sla/total_ext*100:.1f}%")
    print(f"   Accuracy : {ext_acc:.1f}%")
    print()

print("ACCURACY COMPARISON:")
if USE_INTERNAL:
    print(f"   Internal BiLSTM     : 54%")
    print(f"   Internal DistilBERT : 66%")
    print(f"   Internal RoBERTa    : {int_acc:.1f}%")
    print(f"   Improvement         : +{int_acc-54:.1f}%")
    print()
if USE_EXTERNAL:
    print(f"   External BiLSTM     : 62%")
    print(f"   External DistilBERT : 66%")
    print(f"   External RoBERTa    : {ext_acc:.1f}%")
    print(f"   Improvement         : +{ext_acc-62:.1f}%")
print()




# ============================================================
# STEP 12 - SAMPLE RESULTS (50 feedbacks)
# ============================================================
print("=" * 65)
print("   STEP 12 - SAMPLE RESULTS (50 feedbacks)")
print("=" * 65)
print()

if USE_INTERNAL and df_internal is not None:
    print("INTERNAL SAMPLES:")
    print("=" * 65)
    sample    = df_internal.sample(
        50, random_state=42
    ).reset_index(drop=True)
    correct_s = 0
    wrong_s   = 0

    for i in range(50):
        fb          = sample['Customer_Feedback'].iloc[i]
        employee    = sample['Employee_Name'].iloc[i]
        dept        = sample['Department'].iloc[i]
        issue       = sample['Issue_Category'].iloc[i]
        actual_sent = sample['Predicted_Sentiment'].iloc[i]
        actual_csat = sample['CSAT'].iloc[i]
        actual_dsat = sample['DSAT'].iloc[i]
        actual_nps  = sample['NPS_Score'].iloc[i]
        actual_cat  = sample['NPS_Category'].iloc[i]
        pred_sent   = sample['HF_Sentiment'].iloc[i]
        pred_c      = sample['HF_CSAT'].iloc[i]
        pred_d      = sample['HF_DSAT'].iloc[i]
        conf        = sample['HF_Confidence'].iloc[i]
        bar         = "#" * int(conf // 5)

        if pred_sent == actual_sent:
            correct_s += 1
            match = "[CORRECT]"
        else:
            wrong_s += 1
            match = "[WRONG]  "

        print(f"[{i+1:2d}] Employee  : {employee} ({dept})")
        print(f"     Issue    : {issue}")
        print(f"     Feedback : {fb[:80]}...")
        print(f"     Predicted: {pred_sent:10s} | {bar} {conf}%")
        print(f"     CSAT:{pred_c} DSAT:{pred_d}")
        print(f"     Actual   : {actual_sent:10s} | "
              f"CSAT:{actual_csat} DSAT:{actual_dsat} | "
              f"NPS:{actual_nps} {actual_cat} | {match}")
        print("-" * 65)

    print(f"\nInternal Sample: {correct_s}/50 ({correct_s/50*100:.1f}%)\n")

if USE_EXTERNAL and df_external is not None:
    print("EXTERNAL SAMPLES:")
    print("=" * 65)
    sample    = df_external.sample(
        50, random_state=42
    ).reset_index(drop=True)
    correct_s = 0
    wrong_s   = 0

    for i in range(50):
        fb          = sample['Client_Feedback'].iloc[i]
        company     = sample['Client_Company'].iloc[i]
        industry    = sample['Industry'].iloc[i]
        actual_sent = sample['Predicted_Sentiment'].iloc[i]
        actual_csat = sample['CSAT'].iloc[i]
        actual_dsat = sample['DSAT'].iloc[i]
        actual_nps  = sample['NPS_Score'].iloc[i]
        actual_cat  = sample['NPS_Category'].iloc[i]
        pred_sent   = sample['HF_Sentiment'].iloc[i]
        pred_c      = sample['HF_CSAT'].iloc[i]
        pred_d      = sample['HF_DSAT'].iloc[i]
        conf        = sample['HF_Confidence'].iloc[i]
        bar         = "#" * int(conf // 5)

        if pred_sent == actual_sent:
            correct_s += 1
            match = "[CORRECT]"
        else:
            wrong_s += 1
            match = "[WRONG]  "

        print(f"[{i+1:2d}] Company   : {company} ({industry})")
        print(f"     Feedback : {fb[:80]}...")
        print(f"     Predicted: {pred_sent:10s} | {bar} {conf}%")
        print(f"     CSAT:{pred_c} DSAT:{pred_d}")
        print(f"     Actual   : {actual_sent:10s} | "
              f"CSAT:{actual_csat} DSAT:{actual_dsat} | "
              f"NPS:{actual_nps} {actual_cat} | {match}")
        print("-" * 65)

    print(f"\nExternal Sample: {correct_s}/50 ({correct_s/50*100:.1f}%)\n")




# ============================================================
# STEP 13 - BUSINESS INSIGHTS
# ============================================================
print("=" * 65)
print("   STEP 13 - BUSINESS INSIGHTS")
print("=" * 65)
print()

if USE_INTERNAL and df_internal is not None:
    print("INTERNAL - CSAT% by Department:")
    for dept, val in df_internal.groupby('Department')['CSAT']\
            .mean().sort_values(ascending=False).items():
        bar = "#" * int(val*20)
        print(f"   {dept:20s} : {val*100:.1f}% {bar}")
    print()

    print("INTERNAL - DSAT% by Department:")
    for dept, val in df_internal.groupby('Department')['DSAT']\
            .mean().sort_values(ascending=False).items():
        bar = "#" * int(val*20)
        print(f"   {dept:20s} : {val*100:.1f}% {bar}")
    print()

    print("INTERNAL - CSAT% by Issue Category:")
    for issue, val in df_internal.groupby('Issue_Category')['CSAT']\
            .mean().sort_values(ascending=False).items():
        print(f"   {issue:25s} : {val*100:.1f}%")
    print()

    print("INTERNAL - Best Agent by CSAT%:")
    for agent, val in df_internal.groupby('Assigned_Agent')['CSAT']\
            .mean().sort_values(ascending=False).items():
        print(f"   {agent:20s} : {val*100:.1f}%")
    print()

    print("INTERNAL - SLA Breach by Priority:")
    for pri, grp in df_internal.groupby('Priority'):
        breach = len(grp[grp['SLA_Breached']=='Yes'])
        print(f"   {pri} : {breach:,}/{len(grp):,} "
              f"({breach/len(grp)*100:.1f}% breached)")
    print()

if USE_EXTERNAL and df_external is not None:
    print("EXTERNAL - CSAT% by Industry:")
    for ind, val in df_external.groupby('Industry')['CSAT']\
            .mean().sort_values(ascending=False).items():
        bar = "#" * int(val*20)
        print(f"   {ind:20s} : {val*100:.1f}% {bar}")
    print()

    print("EXTERNAL - DSAT% by Industry:")
    for ind, val in df_external.groupby('Industry')['DSAT']\
            .mean().sort_values(ascending=False).items():
        bar = "#" * int(val*20)
        print(f"   {ind:20s} : {val*100:.1f}% {bar}")
    print()

    print("EXTERNAL - CSAT% by Project Type:")
    for proj, val in df_external.groupby('Project_Type')['CSAT']\
            .mean().sort_values(ascending=False).items():
        print(f"   {proj:35s} : {val*100:.1f}%")
    print()

print("[OK] STEP 13 - Insights done!")
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
    'SentimentIQ - RoBERTa Fine Tuned Results',
    fontsize=16, fontweight='bold'
)

# Graph 1 - Internal or External Sentiment Pie
if USE_INTERNAL and df_internal is not None:
    axes[0,0].pie(
        [int_pos, int_neg, int_neu],
        labels=[f'Positive\n{int_pos:,}',
                f'Negative\n{int_neg:,}',
                f'Neutral\n{int_neu:,}'],
        colors=['#22c55e','#ef4444','#3b82f6'],
        autopct='%1.1f%%', startangle=90
    )
    axes[0,0].set_title('Internal Sentiment',
                         fontweight='bold')
elif USE_EXTERNAL and df_external is not None:
    axes[0,0].pie(
        [ext_pos, ext_neg, ext_neu],
        labels=[f'Positive\n{ext_pos:,}',
                f'Negative\n{ext_neg:,}',
                f'Neutral\n{ext_neu:,}'],
        colors=['#22c55e','#ef4444','#3b82f6'],
        autopct='%1.1f%%', startangle=90
    )
    axes[0,0].set_title('External Sentiment',
                         fontweight='bold')

# Graph 2 - External or Internal Sentiment Pie
if USE_EXTERNAL and df_external is not None:
    axes[0,1].pie(
        [ext_pos, ext_neg, ext_neu],
        labels=[f'Positive\n{ext_pos:,}',
                f'Negative\n{ext_neg:,}',
                f'Neutral\n{ext_neu:,}'],
        colors=['#22c55e','#ef4444','#3b82f6'],
        autopct='%1.1f%%', startangle=90
    )
    axes[0,1].set_title('External Sentiment',
                         fontweight='bold')
elif USE_INTERNAL and df_internal is not None:
    axes[0,1].pie(
        [int_pos, int_neg, int_neu],
        labels=[f'Positive\n{int_pos:,}',
                f'Negative\n{int_neg:,}',
                f'Neutral\n{int_neu:,}'],
        colors=['#22c55e','#ef4444','#3b82f6'],
        autopct='%1.1f%%', startangle=90
    )
    axes[0,1].set_title('Internal Sentiment',
                         fontweight='bold')

# Graph 3 - Accuracy Comparison
models   = ['BiLSTM', 'DistilBERT',
            'Twitter\nRoBERTa', 'Fine Tuned\nRoBERTa']
ref_acc  = int_acc if USE_INTERNAL else ext_acc
ref_base = 54 if USE_INTERNAL else 62
accs     = [ref_base, 66, 75, round(ref_acc, 1)]
bar_cols = ['#94a3b8','#60a5fa','#f97316','#22c55e']
bars3    = axes[0,2].bar(models, accs, color=bar_cols)
axes[0,2].set_title('Accuracy Comparison',
                     fontweight='bold')
axes[0,2].set_ylabel('Accuracy %')
axes[0,2].set_ylim(0, 100)
for bar, val in zip(bars3, accs):
    axes[0,2].text(
        bar.get_x()+bar.get_width()/2,
        bar.get_height()+1,
        f'{val}%',
        ha='center', fontweight='bold', fontsize=9
    )

# Graph 4 - CSAT by group
if USE_INTERNAL and df_internal is not None:
    dept_csat = df_internal.groupby(
        'Department'
    )['CSAT'].mean()*100
    dept_csat.sort_values().plot(
        kind='barh', ax=axes[1,0], color='#22c55e'
    )
    axes[1,0].set_title('CSAT% by Department',
                         fontweight='bold')
    axes[1,0].set_xlabel('CSAT %')
elif USE_EXTERNAL and df_external is not None:
    ind_csat = df_external.groupby(
        'Industry'
    )['CSAT'].mean()*100
    ind_csat.sort_values().plot(
        kind='barh', ax=axes[1,0], color='#22c55e'
    )
    axes[1,0].set_title('CSAT% by Industry',
                         fontweight='bold')
    axes[1,0].set_xlabel('CSAT %')

# Graph 5 - DSAT by group
if USE_INTERNAL and df_internal is not None:
    dept_dsat = df_internal.groupby(
        'Department'
    )['DSAT'].mean()*100
    dept_dsat.sort_values(ascending=False).plot(
        kind='bar', ax=axes[1,1], color='#ef4444'
    )
    axes[1,1].set_title('DSAT% by Department',
                         fontweight='bold')
    axes[1,1].set_ylabel('DSAT %')
    axes[1,1].tick_params(axis='x', rotation=45)
elif USE_EXTERNAL and df_external is not None:
    ind_dsat = df_external.groupby(
        'Industry'
    )['DSAT'].mean()*100
    ind_dsat.sort_values(ascending=False).plot(
        kind='bar', ax=axes[1,1], color='#ef4444'
    )
    axes[1,1].set_title('DSAT% by Industry',
                         fontweight='bold')
    axes[1,1].set_ylabel('DSAT %')
    axes[1,1].tick_params(axis='x', rotation=45)

# Graph 6 - Training Progress
epochs_range = range(1, EPOCHS+1)
axes[1,2].plot(
    epochs_range, train_accs,
    'o-', color='#2E75B6',
    linewidth=2, label='Train Acc'
)
axes[1,2].plot(
    epochs_range, val_accs,
    's--', color='#22c55e',
    linewidth=2, label='Val Acc'
)
axes[1,2].set_title('Training Progress',
                     fontweight='bold')
axes[1,2].set_xlabel('Epoch')
axes[1,2].set_ylabel('Accuracy %')
axes[1,2].set_ylim(0, 100)
axes[1,2].legend()
axes[1,2].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('roberta_finetuned_graph.png',
            dpi=150, bbox_inches='tight')
print("[OK] Graph saved as roberta_finetuned_graph.png")
plt.show()
print()




# ============================================================
# STEP 15 - SAVE ALL RESULTS
# ============================================================
print("=" * 65)
print("   STEP 15 - SAVING RESULTS")
print("=" * 65)
print()

if USE_INTERNAL and df_internal is not None:
    df_internal.to_csv(
        'roberta_internal_results.csv', index=False
    )
    print("[OK] Saved: roberta_internal_results.csv")

if USE_EXTERNAL and df_external is not None:
    df_external.to_csv(
        'roberta_external_results.csv', index=False
    )
    print("[OK] Saved: roberta_external_results.csv")

print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 65)
print("   SENTIMENTIQ - ROBERTA FINE TUNED COMPLETE")
print("=" * 65)
print()
print(f"   Datasets used:")
print(f"   Internal : {USE_INTERNAL}")
print(f"   External : {USE_EXTERNAL}")
print()

if USE_INTERNAL and df_internal is not None:
    print(f"   INTERNAL:")
    print(f"   Total    : {total_int:,}")
    print(f"   CSAT%    : {int_csat/total_int*100:.1f}%")
    print(f"   DSAT%    : {int_dsat/total_int*100:.1f}%")
    print(f"   Accuracy : {int_acc:.1f}%")
    print()

if USE_EXTERNAL and df_external is not None:
    print(f"   EXTERNAL:")
    print(f"   Total    : {total_ext:,}")
    print(f"   CSAT%    : {ext_csat/total_ext*100:.1f}%")
    print(f"   DSAT%    : {ext_dsat/total_ext*100:.1f}%")
    print(f"   Accuracy : {ext_acc:.1f}%")
    print()

print("   Model saved to : best_roberta_model/")
print("   Use this for   : all future predictions!")
print()
print("   NPS Links:")
print("   Positive → CSAT=1 DSAT=0 NPS=9 Promoter")
print("   Negative → CSAT=0 DSAT=1 NPS=2 Detractor")
print("   Neutral  → CSAT=0 DSAT=0 NPS=6 Passive")
print()
print("   Output Files:")
print("   best_roberta_model/          - Saved model")
print("   roberta_internal_results.csv")
print("   roberta_external_results.csv")
print("   roberta_finetuned_graph.png")
print("=" * 65)