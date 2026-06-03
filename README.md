# ============================================================
# HUGGINGFACE SSL TEST
# Run this first to check if HuggingFace works!
# ============================================================

import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.environ['CURL_CA_BUNDLE']            = ''
os.environ['REQUESTS_CA_BUNDLE']        = ''
os.environ['PYTHONHTTPSVERIFY']         = '0'
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'
os.environ['TRANSFORMERS_VERIFY_SSL']   = '0'

print("=" * 65)
print("   HUGGINGFACE SSL TEST")
print("=" * 65)
print()
print("Trying to connect to HuggingFace...")
print("This may take 1-2 minutes first time...")
print()

try:
    from transformers import pipeline

    print("[OK] Transformers library imported!")
    print()
    print("Downloading DistilBERT model...")
    print("First time = 250MB download")
    print("After that = loads from local cache!")
    print()

    classifier = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english"
    )

    print("[OK] Model downloaded and loaded!")
    print()

    # Test 3 sentences
    tests = [
        "Outstanding service! Issue resolved immediately!",
        "Terrible support. SLA breached, no response at all.",
        "Average experience, issue resolved eventually."
    ]

    print("TEST PREDICTIONS:")
    print("-" * 65)
    for text in tests:
        result = classifier(text)[0]
        label  = result['label']
        score  = round(result['score'] * 100, 2)
        print(f"Text     : {text}")
        print(f"Sentiment: {label} ({score}%)")
        print()

    print("=" * 65)
    print("   SSL ISSUE IS RESOLVED!")
    print("   HuggingFace is working!")
    print("   Run full code now!")
    print("=" * 65)

except Exception as e:
    print("=" * 65)
    print("   SSL ISSUE STILL EXISTS!")
    print(f"   Error: {e}")
    print()
    print("   Solutions:")
    print("   1. Use mobile hotspot instead of NTT WiFi")
    print("   2. Request IT to whitelist huggingface.co")
    print("   3. Download model at home and copy via USB")
    print("=" * 65)
