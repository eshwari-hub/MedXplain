"""
MEDIC-XAI: Flask Backend Integration Interface
Explainable AI-Based Multi-Label Detection Across Multiple Body Organs Using DenseNet121

=============================================================================
ORGAN-SPECIFIC OUTPUT FILTERING FOR UNIFIED DENSENET121 ARCHITECTURE:
The deep learning model is a single unified DenseNet121 architecture with 60
multi-label sigmoid outputs spanning Brain, Chest, and Bone conditions.
The unified backbone extracts shared anatomical features and scores all 60
classes simultaneously against their respective optimal thresholds.
However, to maintain clinical accuracy and prevent unrelated-organ cross-talk
(such as "Lung_Opacity" or "Pneumonia" being reported on an orthopedic Bone X-Ray,
or "Fracture" being reported on a Brain MRI), organ-specific post-filtering is
applied based on the selected organ_mode (or auto-detected organ).
The full 60 raw probabilities are preserved in 'all_probabilities' for research
and debugging, but the 'abnormalities' array returned to the frontend strictly
contains only pathologies belonging to the target organ.
=============================================================================
"""

import time
import os
import io
import csv
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

import tensorflow as tf
import keras

app = Flask(__name__)

# Configure CORS so Vite frontend (localhost:5174 / localhost:5173 / localhost:5175) can communicate
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5175",
            "http://localhost:5174",
            "http://localhost:5173",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5173",
            "*"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'bmp', 'dcm'}

# Model & Thresholds Path Resolution
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))

MODEL_CANDIDATES = [
    os.path.join(PROJECT_DIR, 'models', 'best_densenet121.keras'),
    r'C:\Users\User\OneDrive\Desktop\models\best_densenet121.keras',
    r'C:\Users\User\Downloads\best_densenet121.keras'
]

THRESHOLDS_CANDIDATES = [
    os.path.join(PROJECT_DIR, 'models', 'optimal_thresholds.csv'),
    r'C:\Users\User\OneDrive\Desktop\models\optimal_thresholds.csv',
    os.path.join(PROJECT_DIR, 'models', 'optimal_thresholds.txt'),
    r'C:\Users\User\OneDrive\Desktop\models\optimal_thresholds.txt',
    r'C:\Users\User\Downloads\optimal_thresholds.csv',
    r'C:\Users\User\Downloads\optimal_thresholds.txt'
]

MODEL = None
MODEL_PATH_LOADED = None
LABELS_DATA = []  # List of tuples: (label_name, threshold_float) in exact 60-order
LABELS_DICT = {}  # label_name -> threshold_float

def resolve_file(candidates):
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None

def load_thresholds(csv_path):
    labels = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if row and len(row) >= 2:
                name = row[0].strip()
                try:
                    thresh = float(row[1].strip())
                except ValueError:
                    thresh = 0.5
                labels.append((name, thresh))
    return labels

def init_model():
    global MODEL, MODEL_PATH_LOADED, LABELS_DATA, LABELS_DICT
    model_file = resolve_file(MODEL_CANDIDATES)
    thresh_file = resolve_file(THRESHOLDS_CANDIDATES)

    if not thresh_file:
        print("[WARNING] Could not locate optimal_thresholds.csv!")
    else:
        print(f"[INIT] Loading optimal thresholds from: {thresh_file}")
        LABELS_DATA = load_thresholds(thresh_file)
        LABELS_DICT = {name: thresh for name, thresh in LABELS_DATA}
        print(f"[INIT] Loaded {len(LABELS_DATA)} labels and thresholds.")

    if not model_file:
        print("[WARNING] Could not locate best_densenet121.keras!")
        return

    print(f"[INIT] Loading DenseNet121 model from: {model_file} ...")
    t0 = time.time()
    try:
        MODEL = keras.models.load_model(model_file, compile=False)
        MODEL_PATH_LOADED = model_file
        print(f"[INIT] Model loaded successfully in {time.time()-t0:.2f}s!")
        print(f"[INIT] Input shape: {MODEL.input_shape}, Output shape: {MODEL.output_shape}")
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        MODEL = None

# Initialize model and thresholds once at server startup
init_model()

# =========================================================================
# ORGAN-SPECIFIC LABEL GROUPS (Exact Specification)
# =========================================================================
BRAIN_LABELS = {
    'Haemorrhagic',
    'Ischemic',
    'MildDemented',
    'ModerateDemented',
    'NonDemented',
    'VeryMildDemented',
    'glioma',
    'meningioma',
    'notumor',
    'pituitary'
}

BONE_LABELS = {
    'Disc_Space_Narrowing',
    'Foraminal_Stenosis',
    'Fracture',
    'Giant_Cell_Tumor',
    'Multiple_Osteochondromas',
    'Osteochondroma',
    'Osteofibroma',
    'Osteopenia',
    'Osteophytes',
    'Osteoporosis',
    'Osteosarcoma',
    'Other_Benign_Bone_Tumor',
    'Other_Lesions',
    'Other_Malignant_Bone_Tumor',
    'Simple_Bone_Cyst',
    'Spondylolysthesis',
    'Surgical_Implant',
    'Synovial_Osteochondroma',
    'Vertebral_Collapse'
}

CHEST_LABELS = {
    'Aortic enlargement',
    'Atelectasis',
    'COVID',
    'Calcification',
    'Cardiomegaly',
    'Consolidation',
    'Edema',
    'Effusion',
    'Emphysema',
    'Enlarged Cardiomediastinum',
    'Fibrosis',
    'Hernia',
    'ILD',
    'Infiltration',
    'Lung Lesion',
    'Lung_Opacity',
    'Mass',
    'No finding',
    'Nodule',
    'Nodule/Mass',
    'Other lesion',
    'Pleural Other',
    'Pleural effusion',
    'Pleural_Thickening',
    'Pneumonia',
    'Pneumothorax',
    'Pulmonary fibrosis',
    'Support Devices',
    'Tuberculosis',
    'Viral Pneumonia'
}

def analyze_modality_organ(pil_img):
    """
    Dedicated Stage 1 Organ & Modality Detector based strictly on image-level
    visual, anatomical, and radiological structure.
    DOES NOT USE ANY DISEASE MODEL PREDICTIONS.
    """
    # A. Consistent Preprocessing
    rgb_img = pil_img.convert('RGB')
    resized = rgb_img.resize((224, 224), Image.Resampling.BILINEAR)
    gray = resized.convert('L')
    arr = np.array(gray, dtype=np.float32) / 255.0

    # 1. Color variance check (Medical vs Non-medical)
    rgb_arr = np.array(resized, dtype=np.float32)
    rg_diff = np.mean(np.abs(rgb_arr[:, :, 0] - rgb_arr[:, :, 1]))
    gb_diff = np.mean(np.abs(rgb_arr[:, :, 1] - rgb_arr[:, :, 2]))
    color_diff = float((rg_diff + gb_diff) / 2.0)

    # Dynamic range & contrast check
    p5 = float(np.percentile(arr, 5))
    p95 = float(np.percentile(arr, 95))
    dynamic_range = p95 - p5
    std_val = float(np.std(arr))

    # If not a monochromatic medical scan or contrast is too low
    if color_diff > 4.5 or dynamic_range < 0.25 or std_val < 0.04:
        return None, 0.0, None, "Unable to confidently determine whether this is a Brain MRI, Chest X-Ray, or Bone X-Ray. Please upload a supported medical scan."

    # --- Feature Measurements ---
    # 1. Outer margins and corners
    corners = np.concatenate([
        arr[:20, :20].flatten(),
        arr[:20, -20:].flatten(),
        arr[-20:, :20].flatten(),
        arr[-20:, -20:].flatten()
    ])
    corner_mean = float(np.mean(corners))

    top_margin = float(np.mean(arr[:12, :]))
    bot_margin = float(np.mean(arr[-12:, :]))
    left_margin = float(np.mean(arr[:, :12]))
    right_margin = float(np.mean(arr[:, -12:]))
    border_mean = (top_margin + bot_margin + left_margin + right_margin) / 4.0

    # 2. Centeredness & Radial Profile (Brain MRI)
    Y, X = np.ogrid[:224, :224]
    dist_from_center = np.sqrt((X - 112)**2 + (Y - 112)**2)
    inner_disk = dist_from_center <= 60
    outer_ring = dist_from_center >= 95
    center_mean = float(np.mean(arr[inner_disk]))
    periphery_mean = float(np.mean(arr[outer_ring]))
    radial_ratio = center_mean / (periphery_mean + 1e-4)

    # Convoluted brain edge gradient (gyri/sulci)
    dx = np.abs(np.diff(arr, axis=1))
    dy = np.abs(np.diff(arr, axis=0))
    grad = np.zeros_like(arr)
    grad[:, :-1] += dx
    grad[:-1, :] += dy
    inner_grad = float(np.mean(grad[inner_disk]))

    # 3. Thoracic Cavity Profile (Chest X-Ray)
    mid_thorax = arr[60:150, :]
    h_profile = np.mean(mid_thorax, axis=0)  # length 224

    left_lung_mean = float(np.mean(h_profile[35:80]))
    right_lung_mean = float(np.mean(h_profile[144:189]))
    mediastinum_mean = float(np.mean(h_profile[95:129]))
    lung_avg = (left_lung_mean + right_lung_mean) / 2.0
    med_ridge = mediastinum_mean - lung_avg

    # Dense abdominal / diaphragm base (rows 175 to 220)
    lower_mean = float(np.mean(arr[175:220, :]))
    diaphragm_step = lower_mean - lung_avg

    # Bilateral horizontal symmetry
    left_half = arr[:, :112]
    right_flipped = np.fliplr(arr[:, 112:])
    sym_diff = float(np.mean(np.abs(left_half - right_flipped)))

    # 4. Bone skeletal features (Musculoskeletal X-Ray)
    dark_space_frac = float(np.mean(arr < 0.20))
    dense_bone_frac = float(np.mean(arr > 0.50))

    # --- Scoring ---
    # Brain MRI Rules
    bm_score = 0.0
    if radial_ratio > 2.8:
        bm_score += 3.5
    if border_mean < 0.12:
        bm_score += 3.0
    if bot_margin < 0.15:
        bm_score += 2.0
    if inner_grad > 0.075:
        bm_score += 3.0
    if sym_diff < 0.08:
        bm_score += 1.5
    # Penalties
    if diaphragm_step > 0.15 and lower_mean > 0.45:
        bm_score -= 5.0
    if border_mean > 0.22:
        bm_score -= 5.0

    # Chest X-Ray Rules
    cxr_score = 0.0
    if lower_mean > 0.45 and diaphragm_step > 0.15:
        cxr_score += 4.5
    if med_ridge > 0.20:
        cxr_score += 3.0
    if border_mean > 0.20:
        cxr_score += 2.5
    if bot_margin > 0.40:
        cxr_score += 2.0
    if sym_diff < 0.08:
        cxr_score += 1.5
    # Penalties
    if border_mean < 0.10:
        cxr_score -= 5.0
    if lower_mean < 0.30:
        cxr_score -= 5.0
    if dark_space_frac > 0.55:
        cxr_score -= 5.0

    # Bone X-Ray Rules
    bx_score = 0.0
    if dark_space_frac > 0.50:
        bx_score += 3.5
    if sym_diff > 0.085:
        bx_score += 3.0
    if lower_mean < 0.35:
        bx_score += 2.5
    if inner_grad < 0.065:
        bx_score += 2.5
    if dense_bone_frac > 0.04:
        bx_score += 2.0
    # Penalties
    if lower_mean > 0.45 and diaphragm_step > 0.15:
        bx_score -= 5.0
    if radial_ratio > 3.0 and inner_grad > 0.075:
        bx_score -= 5.0

    raw_scores = {
        "Brain": max(0.1, bm_score),
        "Chest": max(0.1, cxr_score),
        "Bone": max(0.1, bx_score)
    }

    # Softmax temperature scaling
    temp = 1.5
    exp_vals = {k: np.exp(v / temp) for k, v in raw_scores.items()}
    sum_exp = sum(exp_vals.values())
    probs = {k: float(exp_vals[k] / sum_exp) for k in raw_scores}

    best_organ = max(probs, key=probs.get)
    best_conf = probs[best_organ]
    modality = "MRI" if best_organ == "Brain" else "X-Ray"

    CONFIDENCE_THRESHOLD = 0.65
    if best_conf < CONFIDENCE_THRESHOLD:
        return None, best_conf, None, "Unable to confidently determine whether this is a Brain MRI, Chest X-Ray, or Bone X-Ray. Please upload a supported medical scan."

    return best_organ, round(best_conf, 4), modality, None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint returning real model status.
    """
    return jsonify({
        "status": "online",
        "service": "MEDIC-XAI Flask Machine Learning Backend",
        "model_loaded": MODEL is not None,
        "model_name": "DenseNet121-MultiLabel-60",
        "input_shape": list(MODEL.input_shape) if MODEL else None,
        "output_shape": list(MODEL.output_shape) if MODEL else None,
        "labels_count": len(LABELS_DATA),
        "supported_organs": ["Brain", "Chest", "Bone"],
        "endpoints": {
            "health": "/api/health",
            "analyze": "/api/analyze"
        }
    }), 200

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Real Model Analysis Endpoint with Automated Dedicated Organ Routing:
    1. Receive uploaded medical image
    2. Validate file integrity and medical modality
    3. Run single unified DenseNet121 model to produce 60 class activations
    4. Automatically determine organ (Brain, Chest, or Bone) before disease filtering
    5. Route image to that organ's prediction pipeline
    6. Filter displayed abnormalities strictly to that organ's pathologies
    7. Return standardized JSON response with organ and organ_confidence
    """
    start_time = time.time()

    # 1. Validate file presence
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "error": "Invalid request: No file provided under key 'file'"
        }), 400

    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        return jsonify({
            "success": False,
            "error": "Invalid request: Empty filename submitted"
        }), 400

    if not allowed_file(uploaded_file.filename):
        return jsonify({
            "success": False,
            "error": f"Unsupported image format. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    # 2. Extract organ_mode ('auto' is standard and default)
    organ_mode = request.form.get('organ_mode', 'auto').lower()
    if organ_mode not in ['auto', 'brain', 'chest', 'bone']:
        organ_mode = 'auto'

    # 3. Verify model readiness
    if MODEL is None:
        return jsonify({
            "success": False,
            "error": "Model not loaded. Please ensure best_densenet121.keras is available in medical/models/."
        }), 503

    # 4. Ingest and parse uploaded medical image
    try:
        image_bytes = uploaded_file.read()
        if len(image_bytes) == 0:
            return jsonify({
                "success": False,
                "error": "The uploaded image file is empty or corrupted."
            }), 400

        pil_img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Image parsing failed: {str(e)}"
        }), 400

    # STAGE 1: Pure Modality & Organ Detection (Zero Disease Model Dependencies)
    if organ_mode == 'auto':
        detected_organ, organ_confidence, detected_modality, routing_err = analyze_modality_organ(pil_img)
        if routing_err or not detected_organ:
            # When reliable organ cannot be determined, do NOT generate disease predictions
            return jsonify({
                "success": False,
                "error": routing_err or "Unable to confidently determine whether this is a Brain MRI, Chest X-Ray, or Bone X-Ray. Please upload a supported medical scan."
            }), 400

        target_organ = detected_organ
        modality = detected_modality
        analysis_mode = "Auto"
    else:
        # Manual override fallback if requested by specific API consumers
        target_organ = organ_mode.capitalize()
        det_organ, det_conf, det_mod, _ = analyze_modality_organ(pil_img)
        organ_confidence = det_conf if det_conf else 0.95
        modality = det_mod if det_mod else ("MRI" if target_organ == "Brain" else "X-Ray")
        analysis_mode = target_organ

    # Log detected organ details for auditability
    print(f"[ORGAN DETECTION]\nDetected organ: {target_organ}\nConfidence: {organ_confidence}\nModality: {modality}")

    # STAGE 2: Run inference with real unified DenseNet121 model (60 sigmoid outputs)
    try:
        # Preprocessing: convert to RGB -> resize to 224x224 -> densenet.preprocess_input
        resized_img = pil_img.convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(resized_img, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)
        preprocessed_batch = tf.keras.applications.densenet.preprocess_input(img_batch)
        raw_predictions = MODEL.predict(preprocessed_batch, verbose=0)[0]
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Model inference execution failed: {str(e)}"
        }), 500

    # Map all 60 raw probabilities and optimal thresholds
    all_probabilities = {}
    all_thresholds = {}
    for idx, (label_name, threshold) in enumerate(LABELS_DATA):
        prob = float(raw_predictions[idx])
        all_probabilities[label_name] = round(prob, 4)
        all_thresholds[label_name] = round(threshold, 4)

    # Route to detected organ's prediction pipeline & apply organ-specific output filtering
    if target_organ == "Brain":
        allowed_labels = BRAIN_LABELS
    elif target_organ == "Bone":
        allowed_labels = BONE_LABELS
    else:  # Chest
        allowed_labels = CHEST_LABELS

    filtered_abnormalities = []
    for label_name in allowed_labels:
        prob = all_probabilities.get(label_name, 0.0)
        threshold = all_thresholds.get(label_name, 0.5)
        if prob >= threshold:
            filtered_abnormalities.append({
                "name": label_name,
                "confidence": round(prob, 4),
                "threshold": round(threshold, 4),
                "stage": None,
                "region": None
            })

    # Sort filtered abnormalities by confidence descending
    filtered_abnormalities.sort(key=lambda x: x['confidence'], reverse=True)

    elapsed_time = round(time.time() - start_time, 3)

    # 9. Return JSON response strictly formatted as required
    response_payload = {
        "success": True,
        "organ": target_organ,
        "organ_confidence": round(float(organ_confidence), 4),
        "analysis_mode": analysis_mode,
        "modality": modality,
        "abnormalities": filtered_abnormalities,
        "detected_count": len(filtered_abnormalities),
        "all_probabilities": all_probabilities,
        "all_thresholds": all_thresholds,
        "grad_cam_image": None,
        "xai_method": "Grad-CAM",
        "model_name": "DenseNet121-MultiLabel-60",
        "processing_time": elapsed_time
    }

    return jsonify(response_payload), 200

if __name__ == '__main__':
    print("=========================================================")
    print("MEDIC-XAI Real DenseNet121 Machine Learning Backend")
    print("Listening on http://127.0.0.1:5000")
    print("API Endpoint: POST http://127.0.0.1:5000/api/analyze")
    print("=========================================================")
    # Run with debug=False to avoid duplicate model reload
    app.run(host='0.0.0.0', port=5000, debug=False)
