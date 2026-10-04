"""
Model Verification & Download Script for MEDIC-XAI (Render & Cloud Deployment)
Ensures best_densenet121.keras is present and valid before server startup.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "best_densenet121.keras")
THRESHOLDS_PATH = os.path.join(MODEL_DIR, "optimal_thresholds.csv")

EXPECTED_MIN_SIZE_BYTES = 25 * 1024 * 1024  # At least 25 MB

def check_and_provision_model():
    print("=" * 70)
    print("MEDIC-XAI: Production Model Verification & Provisioning")
    print("=" * 70)

    os.makedirs(MODEL_DIR, exist_ok=True)

    # 1. Verify optimal thresholds
    if not os.path.exists(THRESHOLDS_PATH):
        print(f"[FATAL] Thresholds file missing: {THRESHOLDS_PATH}")
        return False
    print(f"[OK] Thresholds file present: {THRESHOLDS_PATH}")

    # 2. Check if model already exists and is valid
    if os.path.exists(MODEL_PATH):
        size_bytes = os.path.getsize(MODEL_PATH)
        if size_bytes >= EXPECTED_MIN_SIZE_BYTES:
            size_mb = size_bytes / (1024 * 1024)
            print(f"[OK] Model already present and verified: {MODEL_PATH} ({size_mb:.2f} MB)")
            return True
        else:
            print(f"[WARNING] Existing model file is incomplete ({size_bytes} bytes). Re-downloading...")
            try:
                os.remove(MODEL_PATH)
            except Exception:
                pass

    # 3. Model is missing or incomplete: check MODEL_DOWNLOAD_URL
    download_url = os.environ.get("MODEL_DOWNLOAD_URL")
    if not download_url:
        print("[FATAL] Model file missing: models/best_densenet121.keras")
        print("[FATAL] MODEL_DOWNLOAD_URL environment variable is not set!")
        print("Please configure MODEL_DOWNLOAD_URL in your cloud deployment environment settings.")
        return False

    download_url = download_url.strip()
    print(f"[DOWNLOAD] Fetching model from: {download_url} ...")

    temp_path = MODEL_PATH + ".downloading"
    try:
        import requests
        headers = {"User-Agent": "MEDIC-XAI-Model-Provisioner/1.0"}
        with requests.get(download_url, headers=headers, stream=True, allow_redirects=True, timeout=120) as r:
            r.raise_for_status()
            total_downloaded = 0
            with open(temp_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
                        total_downloaded += len(chunk)
                        print(f"  Downloaded: {total_downloaded / (1024*1024):.1f} MB ...", end="\r")

            print()

        # Verify downloaded file size
        actual_size = os.path.getsize(temp_path)
        if actual_size < EXPECTED_MIN_SIZE_BYTES:
            print(f"[ERROR] Downloaded file is too small ({actual_size} bytes). Expected at least {EXPECTED_MIN_SIZE_BYTES} bytes.")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return False

        # Atomically rename to final model path
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        os.rename(temp_path, MODEL_PATH)

        size_mb = actual_size / (1024 * 1024)
        print(f"[SUCCESS] Downloaded and verified model: {MODEL_PATH} ({size_mb:.2f} MB)")
        return True

    except Exception as e:
        print(f"[ERROR] Model download failed: {e}")
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        return False

if __name__ == "__main__":
    success = check_and_provision_model()
    sys.exit(0 if success else 1)
