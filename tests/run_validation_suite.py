"""
Automated Multi-Organ Diagnostic Engine Validation Suite
Evaluates Brain MRI, Chest X-Ray, Bone X-Ray, and Unsupported Scans
Verifies routing accuracy, cross-organ safety, multi-label predictions, and Grad-CAM authenticity.
"""

import os
import io
import base64
import requests
import numpy as np
from PIL import Image

BASE_URL = "http://127.0.0.1:5000"

BRAIN_LABELS = {
    'Haemorrhagic', 'Ischemic', 'MildDemented', 'ModerateDemented', 
    'NonDemented', 'VeryMildDemented', 'glioma', 'meningioma', 'notumor', 'pituitary'
}

BONE_LABELS = {
    'Disc_Space_Narrowing', 'Foraminal_Stenosis', 'Fracture', 'Giant_Cell_Tumor',
    'Multiple_Osteochondromas', 'Osteochondroma', 'Osteofibroma', 'Osteopenia',
    'Osteophytes', 'Osteoporosis', 'Osteosarcoma', 'Other_Benign_Bone_Tumor',
    'Other_Lesions', 'Other_Malignant_Bone_Tumor', 'Simple_Bone_Cyst',
    'Spondylolysthesis', 'Surgical_Implant', 'Synovial_Osteochondroma', 'Vertebral_Collapse'
}

CHEST_LABELS = {
    'Aortic enlargement', 'Atelectasis', 'COVID', 'Calcification', 'Cardiomegaly',
    'Consolidation', 'Edema', 'Effusion', 'Emphysema', 'Enlarged Cardiomediastinum',
    'Fibrosis', 'Hernia', 'ILD', 'Infiltration', 'Lung Lesion', 'Lung_Opacity',
    'Mass', 'No finding', 'Nodule', 'Nodule/Mass', 'Other lesion', 'Pleural Other',
    'Pleural effusion', 'Pleural_Thickening', 'Pneumonia', 'Pneumothorax',
    'Pulmonary fibrosis', 'Support Devices', 'Tuberculosis', 'Viral Pneumonia'
}

ORGAN_ALLOWED_MAP = {
    "Brain": BRAIN_LABELS,
    "Chest": CHEST_LABELS,
    "Bone": BONE_LABELS
}

def decode_data_uri_to_array(data_uri):
    """Decodes data:image/png;base64,... into a float32 numpy array."""
    if not data_uri or not data_uri.startswith("data:image/png;base64,"):
        return None
    b64 = data_uri.split(",")[1]
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert('RGB')
    return np.array(img, dtype=np.float32)

def run_tests():
    print("=" * 80)
    print("MEDIC-XAI: END-TO-END VALIDATION & GRAD-CAM AUTHENTICITY TEST SUITE")
    print("=" * 80)

    # 1. Health Endpoint Verification
    print("\n--- PHASE 1: BACKEND HEALTH & MODEL VERIFICATION ---")
    try:
        health_res = requests.get(f"{BASE_URL}/api/health", timeout=5)
        health_data = health_res.json()
        print(f"Health Status: {health_data.get('status')} | Service: {health_data.get('service')}")
        print(f"Model Loaded: {health_data.get('model_loaded')} | Name: {health_data.get('model_name')}")
        print(f"Grad-CAM Ready: {health_data.get('grad_cam_ready')} | Layer: {health_data.get('grad_cam_layer')}")
        health_ok = (
            health_res.status_code == 200 and
            health_data.get("model_loaded") is True and
            health_data.get("grad_cam_ready") is True and
            health_data.get("grad_cam_layer") == "conv5_block16_2_conv"
        )
        if not health_ok:
            print("[ERROR] Health check failed criteria!")
            return False
        print("[PASS] Health endpoint and model assets verified.")
    except Exception as e:
        print(f"[FATAL] Could not connect to {BASE_URL}: {e}")
        return False

    # Confusion Matrix Counts
    confusion = {
        "Brain": {"Brain": 0, "Chest": 0, "Bone": 0, "Rejected": 0},
        "Chest": {"Brain": 0, "Chest": 0, "Bone": 0, "Rejected": 0},
        "Bone": {"Brain": 0, "Chest": 0, "Bone": 0, "Rejected": 0},
        "Unsupported": {"Brain": 0, "Chest": 0, "Bone": 0, "Rejected": 0}
    }

    test_dirs = [
        ("Brain", "tests/images/brain"),
        ("Chest", "tests/images/chest"),
        ("Bone", "tests/images/bone"),
        ("Unsupported", "tests/images/unsupported")
    ]

    total_tests = 0
    passed_tests = 0
    detailed_results = []
    gradcam_cache = {}

    out_gradcam_dir = "tests/gradcam_validation"
    os.makedirs(out_gradcam_dir, exist_ok=True)

    for expected_organ, folder in test_dirs:
        print(f"\n--- TESTING CATEGORY: {expected_organ.upper()} ---")
        if not os.path.exists(folder):
            print(f"[SKIP] Directory {folder} does not exist.")
            continue

        files = sorted(os.listdir(folder))
        for fname in files:
            total_tests += 1
            file_path = os.path.join(folder, fname)
            
            with open(file_path, "rb") as f:
                res = requests.post(f"{BASE_URL}/api/analyze", files={"file": f}, timeout=30)
            
            status_code = res.status_code
            try:
                data = res.json()
            except Exception:
                data = {}

            predicted_organ = data.get("organ")
            organ_conf = data.get("organ_confidence", 0.0)
            modality = data.get("modality")
            abnormalities = data.get("abnormalities", [])
            top_candidates = data.get("top_predictions", [])
            grad_cam_target = data.get("grad_cam_target")
            grad_cam_layer = data.get("grad_cam_layer")
            grad_cam_img = data.get("grad_cam_image")
            grad_cam_err = data.get("grad_cam_error")
            top_org_cands = data.get("top_organ_candidates", [])

            # Check if expected unsupported
            if expected_organ == "Unsupported":
                is_pass = (status_code == 400 and not data.get("success") and predicted_organ is None and grad_cam_img is None)
                actual_cat = "Rejected" if predicted_organ is None else predicted_organ
                confusion["Unsupported"][actual_cat] += 1
                
                status_str = "PASS" if is_pass else "FAIL"
                if is_pass:
                    passed_tests += 1
                
                print(f"[{status_str}] {fname}: Expected=Reject, Actual={actual_cat} | Error: {data.get('error') or data.get('rejection_reason')}")
                detailed_results.append({
                    "file": fname,
                    "expected": "Reject",
                    "predicted": actual_cat,
                    "confidence": organ_conf,
                    "modality": modality,
                    "status": status_str
                })
                continue

            # Standard Medical Organs
            actual_cat = predicted_organ if predicted_organ in ["Brain", "Chest", "Bone"] else "Rejected"
            confusion[expected_organ][actual_cat] += 1

            # Assertions:
            # 1. Correct organ predicted
            organ_correct = (predicted_organ == expected_organ)
            # 2. Strict organ disease filtering: all abnormalities and top candidates must belong to allowed labels
            allowed = ORGAN_ALLOWED_MAP.get(expected_organ, set())
            leakage_abn = [a['name'] for a in abnormalities if a['name'] not in allowed]
            leakage_cands = [c['name'] for c in top_candidates if c['name'] not in allowed]
            no_leakage = (len(leakage_abn) == 0 and len(leakage_cands) == 0)
            # 3. Grad-CAM target must be an allowed organ class
            cam_target_safe = (grad_cam_target in allowed) if grad_cam_target else False
            # 4. Grad-CAM image generated
            cam_success = (grad_cam_img is not None and grad_cam_img.startswith("data:image/png;base64,"))
            # Cache array for mathematical variation tests
            if cam_success:
                cam_arr = decode_data_uri_to_array(grad_cam_img)
                gradcam_cache[fname] = cam_arr
                # Save first sample of each organ to tests/gradcam_validation
                if fname.endswith("01.jpg"):
                    out_path = os.path.join(out_gradcam_dir, f"{expected_organ.lower()}_01_gradcam.png")
                    b64 = grad_cam_img.split(",")[1]
                    with open(out_path, "wb") as cam_f:
                        cam_f.write(base64.b64decode(b64))

            is_pass = organ_correct and no_leakage and cam_target_safe and cam_success and (status_code == 200)
            status_str = "PASS" if is_pass else "FAIL"
            if is_pass:
                passed_tests += 1

            abn_names = [f"{a['name']}({a['confidence']}%)" for a in abnormalities] or ["None (Below threshold)"]
            cand_names = [f"{c['name']}({c['confidence']}%)" for c in top_candidates]

            print(f"[{status_str}] {fname}")
            print(f"       Expected: {expected_organ} | Predicted: {predicted_organ} (Conf: {organ_conf*100:.1f}%) | Modality: {modality}")
            print(f"       Router Candidates: {top_org_cands}")
            print(f"       Abnormalities: {', '.join(abn_names)}")
            print(f"       Top Candidates: {', '.join(cand_names)}")
            print(f"       Grad-CAM Target: {grad_cam_target} | Layer: {grad_cam_layer} | Image bytes: {len(grad_cam_img) if grad_cam_img else 0}")
            if not no_leakage:
                print(f"       [ERROR] Cross-organ leakage detected! Abn: {leakage_abn}, Cands: {leakage_cands}")

    print("\n" + "=" * 80)
    print(f"TEST SUMMARY: {passed_tests} / {total_tests} PASSED ({passed_tests/total_tests*100:.1f}%)")
    print("=" * 80)

    print("\nCONFUSION MATRIX:")
    header_col = "Expected \\ Predicted"
    print(f"{header_col:<20} {'Brain':<10} {'Chest':<10} {'Bone':<10} {'Rejected':<10}")
    print("-" * 60)
    for exp_k in ["Brain", "Chest", "Bone", "Unsupported"]:
        b = confusion[exp_k]["Brain"]
        c = confusion[exp_k]["Chest"]
        bn = confusion[exp_k]["Bone"]
        r = confusion[exp_k]["Rejected"]
        print(f"{exp_k:<20} {b:<10} {c:<10} {bn:<10} {r:<10}")

    print("\nCROSS-ORGAN SAFETY AUDIT:")
    safety_violations = (
        confusion["Brain"]["Chest"] + confusion["Brain"]["Bone"] +
        confusion["Chest"]["Brain"] + confusion["Chest"]["Bone"] +
        confusion["Bone"]["Brain"] + confusion["Bone"]["Chest"]
    )
    print(f"Total Cross-Organ Contaminations: {safety_violations}")
    if safety_violations == 0:
        print("[AUDIT SUCCESS] Complete strict organ separation verified across all clinical domains.")
    else:
        print(f"[AUDIT FAILURE] Detected {safety_violations} cross-organ misroutings.")

    # 5. Mathematical Grad-CAM Authenticity & Variation Tests (Phase 6 & 7)
    print("\n--- PHASE 6: MATHEMATICAL GRAD-CAM AUTHENTICITY TESTS ---")
    pairs_to_test = [
        ("Brain", "brain_01.jpg", "brain_05.jpg"),
        ("Chest", "chest_01.jpg", "chest_04.jpg"),
        ("Bone", "bone_01.jpg", "bone_05.jpg")
    ]
    math_cam_ok = True
    for organ, img_a, img_b in pairs_to_test:
        arr_a = gradcam_cache.get(img_a)
        arr_b = gradcam_cache.get(img_b)
        if arr_a is None or arr_b is None:
            print(f"[FAIL] Missing Grad-CAM arrays for {img_a} or {img_b}")
            math_cam_ok = False
            continue
        std_a = float(np.std(arr_a))
        std_b = float(np.std(arr_b))
        diff_val = float(np.mean(np.abs(arr_a - arr_b)))
        print(f"[{organ}] {img_a} (std={std_a:.2f}) vs {img_b} (std={std_b:.2f}) | Mean Delta: {diff_val:.2f}")
        if std_a < 15.0 or std_b < 15.0:
            print(f"       [ERROR] Heatmap has insufficient variation (nearly uniform)!")
            math_cam_ok = False
        if diff_val < 5.0:
            print(f"       [ERROR] Heatmaps are identical or static between distinct scans!")
            math_cam_ok = False
        else:
            print(f"       [OK] Heatmaps are confirmed distinct, image-specific, and non-static.")

    # 6. Stronger Transformation Test (Horizontal Flip)
    print("\n--- PHASE 6B: STRONG TRANSFORMATION SENSITIVITY TEST ---")
    orig_path = "tests/images/brain/brain_01.jpg"
    orig_pil = Image.open(orig_path)
    flipped_pil = orig_pil.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    flipped_buf = io.BytesIO()
    flipped_pil.save(flipped_buf, format="JPEG")
    flipped_bytes = flipped_buf.getvalue()

    flip_res = requests.post(f"{BASE_URL}/api/analyze", files={"file": ("brain_flipped.jpg", flipped_bytes, "image/jpeg")}, timeout=30)
    flip_data = flip_res.json()
    flip_cam_arr = decode_data_uri_to_array(flip_data.get("grad_cam_image"))
    orig_cam_arr = gradcam_cache.get("brain_01.jpg")

    if orig_cam_arr is not None and flip_cam_arr is not None:
        flip_diff = float(np.mean(np.abs(orig_cam_arr - flip_cam_arr)))
        print(f"Original vs Horizontally Flipped Brain MRI | Mean Delta: {flip_diff:.2f}")
        if flip_diff > 5.0:
            print("[PASS] Grad-CAM proves active spatial sensitivity to physical image transformation.")
        else:
            print("[FAIL] Grad-CAM output is unresponsive to image transformation!")
            math_cam_ok = False
    else:
        print("[FAIL] Could not evaluate transformation Grad-CAM.")
        math_cam_ok = False

    all_passed = (passed_tests == total_tests) and (safety_violations == 0) and math_cam_ok
    print(f"\nFINAL VERDICT: {'PASS - ALL CRITERIA VERIFIED' if all_passed else 'FAIL'}")
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    import sys
    sys.exit(0 if success else 1)
