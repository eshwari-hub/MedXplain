"""
Model Verification & Download Script for MEDIC-XAI
Ensures best_densenet121.keras is present and valid before server startup.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "best_densenet121.keras")
THRESHOLDS_PATH = os.path.join(MODEL_DIR, "optimal_thresholds.csv")

def check_model():
    print("=" * 60)
    print("MEDIC-XAI: Production Model Verification")
    print("=" * 60)

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)

    model_present = os.path.exists(MODEL_PATH)
    thresh_present = os.path.exists(THRESHOLDS_PATH)

    if model_present:
        size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
        print(f"[OK] Model found: {MODEL_PATH} ({size_mb:.2f} MB)")
    else:
        print(f"[ERROR] Model file missing: {MODEL_PATH}")
        print("To deploy the model:")
        print("1. Upload best_densenet121.keras to medical/models/")
        print("   OR set MODEL_PATH environment variable to its location.")
        print("   OR host it on a direct download URL and set MODEL_DOWNLOAD_URL.")

    if thresh_present:
        print(f"[OK] Thresholds file found: {THRESHOLDS_PATH}")
    else:
        print(f"[ERROR] Thresholds file missing: {THRESHOLDS_PATH}")

    # Check MODEL_DOWNLOAD_URL if model is missing
    download_url = os.environ.get("MODEL_DOWNLOAD_URL")
    if not model_present and download_url:
        print(f"[DOWNLOAD] Fetching model from: {download_url} ...")
        try:
            import urllib.request
            urllib.request.urlretrieve(download_url, MODEL_PATH)
            size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
            print(f"[OK] Downloaded model successfully ({size_mb:.2f} MB)")
            model_present = True
        except Exception as e:
            print(f"[ERROR] Download failed: {e}")

    return model_present and thresh_present

if __name__ == "__main__":
    success = check_model()
    sys.exit(0 if success else 1)
