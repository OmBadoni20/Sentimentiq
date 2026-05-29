# ============================================================
# SENTIMENTIQ — SENTIMENT ANALYSIS USING TF-IDF + SVM
# Dataset: IMDB Movie Reviews
# ============================================================




# ============================================================
# STEP 1 — INSTALLING DEPENDENCIES
# ============================================================
# Run in CMD before running this script:
# pip install scikit-learn pandas numpy matplotlib seaborn
#     --trusted-host pypi.org
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

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm                      import LinearSVC
from sklearn.model_selection          import train_test_split
from sklearn.metrics                  import (classification_report,
                                               confusion_matrix,
                                               accuracy_score)

warnings.filterwarnings('ignore')

print("=" * 60)
print("   SENTIMENTIQ — TF-IDF + SVM SENTIMENT ANALYSIS")
print("=" * 60)
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
    text = re.sub(r'<.*?>',       ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+',         ' ', text).strip()
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
# STEP 7 — TF-IDF VECTORIZATION
# ============================================================
print("=" * 60)
print("   STEP 7 — TF-IDF VECTORIZATION")
print("=" * 60)
print()

print("What is TF-IDF?")
print("   TF  = Term Frequency")
print("       = How often word appears in review")
print("   IDF = Inverse Document Frequency")
print("       = How unique word is across all reviews")
print()
print("   'amazing' → HIGH score (unique, important)")
print("   'the'     → LOW score  (common, not important)")
print()

X = df_balanced['clean_review']
y = df_balanced['sentiment']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Data Split:")
print(f"   Training : {len(X_train)} reviews (80%)")
print(f"   Testing  : {len(X_test)}  reviews (20%)")
print()

tfidf = TfidfVectorizer(
    max_features = 10000,
    ngram_range  = (1, 2),
    stop_words   = 'english',
    min_df       = 2
)

print("Vectorizing text...")
X_train_tfidf = tfidf.fit_transform(X_train)
X_test_tfidf  = tfidf.transform(X_test)

print(f"✅ STEP 7 — Vectorization complete!")
print(f"   Training matrix : {X_train_tfidf.shape}")
print(f"   Testing matrix  : {X_test_tfidf.shape}")
print()




# ============================================================
# STEP 8 — TRAINING SVM MODEL
# ============================================================
print("=" * 60)
print("   STEP 8 — TRAINING SVM MODEL")
print("=" * 60)
print()

print("What is SVM?")
print("   Support Vector Machine")
print("   Finds best boundary between")
print("   Positive and Negative reviews")
print("   Very powerful for text!")
print()
print("Training model...")
print()

start_time = time.time()

model = LinearSVC(C=1.0, max_iter=1000, random_state=42)
model.fit(X_train_tfidf, y_train)

train_time = time.time() - start_time
print(f"✅ STEP 8 — Model trained in {train_time:.1f} seconds!")
print()




# ============================================================
# STEP 9 — EVALUATING MODEL
# ============================================================
print("=" * 60)
print("   STEP 9 — EVALUATING MODEL")
print("=" * 60)
print()

y_pred   = model.predict(X_test_tfidf)
accuracy = accuracy_score(y_test, y_pred) * 100

print(f"Model Accuracy: {accuracy:.2f}%")
print()
print("Classification Report:")
print("-" * 60)
print(classification_report(y_test, y_pred))
print("✅ STEP 9 — Evaluation complete!")
print()




# ============================================================
# STEP 10 — ADDING NEUTRAL CLASS
# ============================================================
print("=" * 60)
print("   STEP 10 — ADDING NEUTRAL PREDICTION")
print("=" * 60)
print()

def predict_sentiment(text):
    clean      = preprocess(text)
    vector     = tfidf.transform([clean])
    score      = model.decision_function(vector)[0]
    confidence = abs(score)

    if confidence < 0.5:
        return "Neutral", round(50 + confidence * 10, 1)
    elif score > 0:
        conf = min(99, round(60 + confidence * 10, 1))
        return "Positive", conf
    else:
        conf = min(99, round(60 + confidence * 10, 1))
        return "Negative", conf

print("✅ STEP 10 — Neutral class added!")
print("   High confidence  → Positive or Negative")
print("   Low confidence   → Neutral")
print()




# ============================================================
# STEP 11 — SAMPLE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 11 — SAMPLE RESULTS")
print("=" * 60)
print()

test_df = pd.DataFrame({
    'review'   : X_test.values,
    'actual'   : y_test.values,
    'predicted': y_pred
}).reset_index(drop=True)

print("Sample Predictions:")
print("-" * 60)

for i in range(10):
    review    = test_df['review'][i][:120] + "..."
    actual    = test_df['actual'][i]
    predicted = test_df['predicted'][i]
    emoji     = "😊" if predicted == "Positive" else "😠"
    match     = "✅" if actual == predicted else "❌"

    print(f"Review {i+1}: {review}")
    print(f"Actual   : {actual}")
    print(f"Predicted: {emoji} {predicted} {match}")
    print()

print("✅ STEP 11 — Sample results shown!")
print()




# ============================================================
# STEP 12 — VISUALIZATIONS
# ============================================================
print("=" * 60)
print("   STEP 12 — GENERATING VISUALIZATIONS")
print("=" * 60)
print()

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle(
    'SentimentIQ — TF-IDF + SVM Results',
    fontsize=16, fontweight='bold'
)

# Graph 1 — Pie Chart
pos_c = (y_pred == 'Positive').sum()
neg_c = (y_pred == 'Negative').sum()
axes[0, 0].pie(
    [pos_c, neg_c],
    labels  = [f'Positive\n{pos_c}', f'Negative\n{neg_c}'],
    colors  = ['#22c55e', '#ef4444'],
    autopct = '%1.1f%%',
    startangle = 90
)
axes[0, 0].set_title(
    'Predicted Sentiment Distribution',
    fontweight='bold'
)

# Graph 2 — Actual vs Predicted
categories       = ['Positive', 'Negative']
actual_counts    = [(y_test == 'Positive').sum(),
                    (y_test == 'Negative').sum()]
predicted_counts = [(y_pred == 'Positive').sum(),
                    (y_pred == 'Negative').sum()]
x     = np.arange(len(categories))
width = 0.35
axes[0, 1].bar(x - width/2, actual_counts,
               width, label='Actual',    color='#6366f1')
axes[0, 1].bar(x + width/2, predicted_counts,
               width, label='Predicted', color='#22d3ee')
axes[0, 1].set_title('Actual vs Predicted', fontweight='bold')
axes[0, 1].set_xticks(x)
axes[0, 1].set_xticklabels(categories)
axes[0, 1].legend()
axes[0, 1].set_ylabel('Count')

# Graph 3 — Confusion Matrix
cm = confusion_matrix(
    y_test, y_pred,
    labels=['Positive', 'Negative']
)
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Blues',
    xticklabels=['Positive', 'Negative'],
    yticklabels=['Positive', 'Negative'],
    ax=axes[1, 0]
)
axes[1, 0].set_title('Confusion Matrix', fontweight='bold')
axes[1, 0].set_xlabel('Predicted')
axes[1, 0].set_ylabel('Actual')

# Graph 4 — Top Words
feature_names  = tfidf.get_feature_names_out()
coefficients   = model.coef_[0]
top_pos_idx    = coefficients.argsort()[-10:][::-1]
top_neg_idx    = coefficients.argsort()[:10]
top_pos_words  = [feature_names[i] for i in top_pos_idx]
top_neg_words  = [feature_names[i] for i in top_neg_idx]
top_pos_scores = [coefficients[i]  for i in top_pos_idx]
top_neg_scores = [abs(coefficients[i]) for i in top_neg_idx]

y_axis = np.arange(10)
axes[1, 1].barh(y_axis + 0.2, top_pos_scores,
                0.4, color='#22c55e', label='Positive words')
axes[1, 1].barh(y_axis - 0.2, top_neg_scores,
                0.4, color='#ef4444', label='Negative words')
axes[1, 1].set_yticks(y_axis)
axes[1, 1].set_yticklabels(top_pos_words, fontsize=8)
axes[1, 1].set_title(
    'Top Positive & Negative Words',
    fontweight='bold'
)
axes[1, 1].legend()

plt.tight_layout()
plt.savefig('svm_graph.png', dpi=150, bbox_inches='tight')
print("✅ Graph saved as svm_graph.png")
plt.show()
print()




# ============================================================
# STEP 13 — TEST WITH CUSTOM REVIEWS
# ============================================================
print("=" * 60)
print("   STEP 13 — TEST WITH CUSTOM REVIEWS")
print("=" * 60)
print()

custom_reviews = [
    "This movie was absolutely fantastic! Best film ever.",
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
# STEP 14 — SAVE RESULTS
# ============================================================
print("=" * 60)
print("   STEP 14 — SAVING RESULTS")
print("=" * 60)
print()

results_df = pd.DataFrame({
    'Original Review'    : X_test.values,
    'Actual Sentiment'   : y_test.values,
    'Predicted Sentiment': y_pred,
    'Correct'            : ['✅' if a == p else '❌'
                            for a, p in zip(y_test.values, y_pred)]
})
results_df.to_csv('svm_results.csv', index=False)
print("✅ Results saved to svm_results.csv")
print()




# ============================================================
# FINAL SUMMARY
# ============================================================
print("=" * 60)
print("   ✅ TF-IDF + SVM ANALYSIS COMPLETE!")
print("=" * 60)
print()
print(f"   Model         : TF-IDF + SVM")
print(f"   Dataset       : IMDB Movie Reviews")
print(f"   Total Reviews : {len(df_balanced)}")
print(f"   Training Size : {len(X_train)}")
print(f"   Testing Size  : {len(X_test)}")
print(f"   Accuracy      : {accuracy:.2f}%")
print(f"   Training Time : {train_time:.1f} seconds")
print()
print("   Output Files:")
print("   📊 svm_graph.png   — Visualizations")
print("   📄 svm_results.csv — Full results")
print("=" * 60)
