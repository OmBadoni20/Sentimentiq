# ============================================================
# SENTIMENTIQ — SENTIMENT ANALYSIS USING DISTILBERT
# Dataset: IMDB Movie Reviews
# Model: distilbert-base-uncased-finetuned-sst-2-english
# ============================================================




# ============================================================
# STEP 1 — INSTALL DEPENDENCIES
# ============================================================
# Run this in terminal before running this script:
# pip install transformers torch pandas matplotlib seaborn datasets scikit-learn




# ============================================================
# STEP 2 — IMPORT LIBRARIES
# ============================================================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from transformers import pipeline
from datasets import load_dataset
from sklearn.metrics import classification_report, confusion_matrix
import warnings
import time
import os

warnings.filterwarnings('ignore')

print("=" * 60)
print("   SENTIMENTIQ — DISTILBERT SENTIMENT ANALYSIS")
print("=" * 60)
print()
print("✅ STEP 2 — All libraries imported successfully!")
print()




# ============================================================
# STEP 3 — LOAD DATASET
# ============================================================
print("=" * 60)
print("   STEP 3 — LOADING IMDB DATASET")
print("=" * 60)
print()
print("Loading IMDB Movie Reviews dataset...")
print("Please wait...")
print()

# Load 500 reviews from IMDB test set
dataset = load_dataset("imdb", split="test[:500]")

# Convert to pandas DataFrame
df = pd.DataFrame(dataset)
df.columns = ["review", "label"]

# Map numeric labels to text
df["actual_sentiment"] = df["label"].map({0: "Negative", 1: "Positive"})

print(f"✅ STEP 3 — Dataset loaded successfully!")
print(f"   Total reviews loaded: {len(df)}")
print()




# ============================================================
# STEP 4 — EXPLORE DATASET
# ============================================================
print("=" * 60)
print("   STEP 4 — EXPLORING DATASET")
print("=" * 60)
print()

print("First 5 reviews:")
print("-" * 60)
for i in range(5):
    review_short = df['review'][i][:100] + "..."
    print(f"Review {i+1}: {review_short}")
    print(f"Actual Sentiment: {df['actual_sentiment'][i]}")
    print()

print(f"Dataset Shape: {df.shape}")
print()
print("Sentiment Distribution:")
print(df['actual_sentiment'].value_counts())
print()

# Review length stats
df['review_length'] = df['review'].apply(lambda x: len(x.split()))
print("Review Length Statistics (words):")
print(f"   Minimum  : {df['review_length'].min()} words")
print(f"   Maximum  : {df['review_length'].max()} words")
print(f"   Average  : {df['review_length'].mean():.0f} words")
print()
print("✅ STEP 4 — Dataset exploration complete!")
print()




# ============================================================
# STEP 5 — BALANCE DATASET
# ============================================================
print("=" * 60)
print("   STEP 5 — BALANCING DATASET")
print("=" * 60)
print()

# Count each class
pos_count = len(df[df['actual_sentiment'] == 'Positive'])
neg_count = len(df[df['actual_sentiment'] == 'Negative'])

print(f"Before balancing:")
print(f"   Positive reviews: {pos_count}")
print(f"   Negative reviews: {neg_count}")
print()

# Balance dataset — equal positive and negative
min_count = min(pos_count, neg_count)
df_positive = df[df['actual_sentiment'] == 'Positive'].sample(min_count, random_state=42)
df_negative = df[df['actual_sentiment'] == 'Negative'].sample(min_count, random_state=42)
df_balanced = pd.concat([df_positive, df_negative]).reset_index(drop=True)
df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"After balancing:")
print(f"   Positive reviews: {len(df_balanced[df_balanced['actual_sentiment'] == 'Positive'])}")
print(f"   Negative reviews: {len(df_balanced[df_balanced['actual_sentiment'] == 'Negative'])}")
print(f"   Total reviews   : {len(df_balanced)}")
print()
print("✅ STEP 5 — Dataset balanced successfully!")
print()




# ============================================================
# STEP 6 — PREPROCESSING TEXT
# ============================================================
print("=" * 60)
print("   STEP 6 — PREPROCESSING TEXT")
print("=" * 60)
print()

def preprocess_text(text):
    # Remove HTML tags (IMDB reviews have <br /> tags)
    text = text.replace("<br />", " ")
    text = text.replace("<br>", " ")
    # Remove extra spaces
    text = " ".join(text.split())
    # Truncate to 400 words (DistilBERT limit)
    words = text.split()
    if len(words) > 400:
        text = " ".join(words[:400])
    return text

print("Preprocessing reviews...")
print("   - Removing HTML tags")
print("   - Removing extra spaces")
print("   - Truncating to 400 words")
print()

df_balanced['clean_review'] = df_balanced['review'].apply(preprocess_text)

# Show before and after
print("Example — Before preprocessing:")
print(f"   {df_balanced['review'][0][:150]}...")
print()
print("Example — After preprocessing:")
print(f"   {df_balanced['clean_review'][0][:150]}...")
print()
print("✅ STEP 6 — Preprocessing complete!")
print()




# ============================================================
# STEP 7 — LOAD DISTILBERT MODEL
# ============================================================
print("=" * 60)
print("   STEP 7 — LOADING DISTILBERT MODEL")
print("=" * 60)
print()
print("Model: distilbert-base-uncased-finetuned-sst-2-english")
print()
print("About this model:")
print("   - DistilBERT = smaller, faster version of BERT")
print("   - Fine-tuned on SST-2 (Stanford Sentiment Treebank)")
print("   - Runs on CPU — no GPU needed")
print("   - Size: ~250MB")
print()
print("Loading model... (first time downloads ~250MB)")
print("Please wait...")
print()

start_time = time.time()

sentiment_model = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    device=-1,      # -1 = CPU
    truncation=True,
    max_length=512
)

load_time = time.time() - start_time
print(f"✅ STEP 7 — Model loaded in {load_time:.1f} seconds!")
print()




# ============================================================
# STEP 8 — RUN SENTIMENT ANALYSIS
# ============================================================
print("=" * 60)
print("   STEP 8 — RUNNING SENTIMENT ANALYSIS")
print("=" * 60)
print()
print(f"Analysing {len(df_balanced)} reviews...")
print("This may take a few minutes on CPU...")
print()

def get_sentiment(text):
    result = sentiment_model(text, truncation=True, max_length=512)[0]
    label = result['label']
    score = result['score']

    if label == 'POSITIVE' and score >= 0.65:
        return 'Positive', round(score * 100, 1)
    elif label == 'NEGATIVE' and score >= 0.65:
        return 'Negative', round(score * 100, 1)
    else:
        return 'Neutral', round(score * 100, 1)

# Analyse all reviews with progress
sentiments = []
confidences = []
total = len(df_balanced)

start_time = time.time()

for i, review in enumerate(df_balanced['clean_review']):
    sentiment, confidence = get_sentiment(review)
    sentiments.append(sentiment)
    confidences.append(confidence)

    # Show progress every 10 reviews
    if (i + 1) % 10 == 0 or (i + 1) == total:
        elapsed = time.time() - start_time
        percent = (i + 1) / total * 100
        bar = "█" * int(percent / 5) + "░" * (20 - int(percent / 5))
        print(f"   [{bar}] {percent:.0f}% ({i+1}/{total}) — {elapsed:.0f}s elapsed")

df_balanced['predicted_sentiment'] = sentiments
df_balanced['confidence'] = confidences

analysis_time = time.time() - start_time
print()
print(f"✅ STEP 8 — Analysis complete in {analysis_time:.1f} seconds!")
print()




# ============================================================
# STEP 9 — EVALUATE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 9 — EVALUATING RESULTS")
print("=" * 60)
print()

# Count predictions
pos = len(df_balanced[df_balanced['predicted_sentiment'] == 'Positive'])
neg = len(df_balanced[df_balanced['predicted_sentiment'] == 'Negative'])
neu = len(df_balanced[df_balanced['predicted_sentiment'] == 'Neutral'])
total = len(df_balanced)

print("Sentiment Distribution:")
print(f"   😊 Positive : {pos} reviews ({pos/total*100:.1f}%)")
print(f"   😠 Negative : {neg} reviews ({neg/total*100:.1f}%)")
print(f"   😐 Neutral  : {neu} reviews ({neu/total*100:.1f}%)")
print()

print(f"Average Confidence: {df_balanced['confidence'].mean():.1f}%")
print(f"Highest Confidence: {df_balanced['confidence'].max():.1f}%")
print(f"Lowest Confidence : {df_balanced['confidence'].min():.1f}%")
print()

# Accuracy — compare predicted vs actual
# Map neutral to closest actual
df_balanced['predicted_for_accuracy'] = df_balanced['predicted_sentiment'].map({
    'Positive': 'Positive',
    'Negative': 'Negative',
    'Neutral': 'Positive'  # neutral mapped to positive for comparison
})

correct = (df_balanced['predicted_for_accuracy'] == df_balanced['actual_sentiment']).sum()
accuracy = correct / total * 100
print(f"Accuracy vs Actual Labels: {accuracy:.1f}%")
print()

# Classification Report
print("Classification Report:")
print("-" * 60)
print(classification_report(
    df_balanced['actual_sentiment'],
    df_balanced['predicted_for_accuracy'],
    target_names=['Negative', 'Positive']
))

print("✅ STEP 9 — Evaluation complete!")
print()




# ============================================================
# STEP 10 — SAMPLE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 10 — SAMPLE RESULTS")
print("=" * 60)
print()

print("Sample Predictions:")
print("-" * 60)

for i in range(10):
    review_short = df_balanced['clean_review'].iloc[i][:120] + "..."
    predicted = df_balanced['predicted_sentiment'].iloc[i]
    actual = df_balanced['actual_sentiment'].iloc[i]
    confidence = df_balanced['confidence'].iloc[i]

    emoji = "😊" if predicted == "Positive" else "😠" if predicted == "Negative" else "😐"
    match = "✅" if predicted == actual or predicted == "Neutral" else "❌"

    print(f"Review {i+1}:")
    print(f"   Text      : {review_short}")
    print(f"   Predicted : {emoji} {predicted} ({confidence}%)")
    print(f"   Actual    : {actual} {match}")
    print()

print("✅ STEP 10 — Sample results shown!")
print()




# ============================================================
# STEP 11 — VISUALIZATIONS
# ============================================================
print("=" * 60)
print("   STEP 11 — GENERATING VISUALIZATIONS")
print("=" * 60)
print()

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('SentimentIQ — IMDB Review Analysis', fontsize=16, fontweight='bold')

# Graph 1 — Pie Chart
colors = ['#22c55e', '#ef4444', '#3b82f6']
sizes  = [pos, neg, neu]
labels = [f'Positive\n{pos}', f'Negative\n{neg}', f'Neutral\n{neu}']
axes[0, 0].pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
axes[0, 0].set_title('Sentiment Distribution', fontweight='bold')

# Graph 2 — Bar Chart
sentiment_counts = df_balanced['predicted_sentiment'].value_counts()
bars = axes[0, 1].bar(sentiment_counts.index, sentiment_counts.values, color=['#22c55e', '#ef4444', '#3b82f6'])
axes[0, 1].set_title('Sentiment Count', fontweight='bold')
axes[0, 1].set_xlabel('Sentiment')
axes[0, 1].set_ylabel('Number of Reviews')
for bar, val in zip(bars, sentiment_counts.values):
    axes[0, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, str(val), ha='center', fontweight='bold')

# Graph 3 — Confidence Distribution
axes[1, 0].hist(df_balanced['confidence'], bins=20, color='#6366f1', edgecolor='white')
axes[1, 0].set_title('Confidence Score Distribution', fontweight='bold')
axes[1, 0].set_xlabel('Confidence (%)')
axes[1, 0].set_ylabel('Number of Reviews')
axes[1, 0].axvline(df_balanced['confidence'].mean(), color='red', linestyle='--', label=f"Mean: {df_balanced['confidence'].mean():.1f}%")
axes[1, 0].legend()

# Graph 4 — Confusion Matrix
cm = confusion_matrix(
    df_balanced['actual_sentiment'],
    df_balanced['predicted_for_accuracy'],
    labels=['Positive', 'Negative']
)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Positive', 'Negative'],
            yticklabels=['Positive', 'Negative'],
            ax=axes[1, 1])
axes[1, 1].set_title('Confusion Matrix', fontweight='bold')
axes[1, 1].set_xlabel('Predicted')
axes[1, 1].set_ylabel('Actual')

plt.tight_layout()
plt.savefig('sentiment_graph.png', dpi=150, bbox_inches='tight')
print("✅ Graph saved as sentiment_graph.png")
plt.show()
print()




# ============================================================
# STEP 12 — SAVE RESULTS TO CSV
# ============================================================
print("=" * 60)
print("   STEP 12 — SAVING RESULTS")
print("=" * 60)
print()

# Save full results
output_df = df_balanced[['review', 'clean_review', 'actual_sentiment', 'predicted_sentiment', 'confidence']]
output_df.columns = ['Original Review', 'Clean Review', 'Actual Sentiment', 'Predicted Sentiment', 'Confidence (%)']
output_df.to_csv('sentiment_results.csv', index=False)

print("✅ Results saved to sentiment_results.csv")
print()
print("File contains:")
print("   - Original Review")
print("   - Clean Review")
print("   - Actual Sentiment")
print("   - Predicted Sentiment")
print("   - Confidence %")
print()




# ============================================================
# STEP 13 — TEST WITH CUSTOM INPUT
# ============================================================
print("=" * 60)
print("   STEP 13 — TEST WITH CUSTOM REVIEW")
print("=" * 60)
print()

custom_reviews = [
    "This movie was absolutely fantastic! The acting was superb and the story was gripping.",
    "Worst movie I have ever seen. Complete waste of time and money.",
    "It was okay. Some parts were good but overall nothing special.",
    "The cinematography was beautiful but the plot was very confusing.",
    "I loved every single minute of this film. A masterpiece!"
]

print("Testing with custom reviews:")
print("-" * 60)

for i, review in enumerate(custom_reviews):
    sentiment, confidence = get_sentiment(review)
    emoji = "😊" if sentiment == "Positive" else "😠" if sentiment == "Negative" else "😐"
    print(f"Review {i+1}: {review}")
    print(f"Result  : {emoji} {sentiment} ({confidence}%)")
    print()

print("=" * 60)
print("   ✅ ANALYSIS COMPLETE!")
print("=" * 60)
print()
print("Output files:")
print("   📊 sentiment_graph.png   — Visualizations")
print("   📄 sentiment_results.csv — Full results")
print()
print("Summary:")
print(f"   Total Reviews Analysed : {total}")
print(f"   Positive               : {pos} ({pos/total*100:.1f}%)")
print(f"   Negative               : {neg} ({neg/total*100:.1f}%)")
print(f"   Neutral                : {neu} ({neu/total*100:.1f}%)")
print(f"   Accuracy               : {accuracy:.1f}%")
print(f"   Avg Confidence         : {df_balanced['confidence'].mean():.1f}%")
print("=" * 60)
