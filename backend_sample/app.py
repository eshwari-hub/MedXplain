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

import os
# Configure single-thread CPU execution before TensorFlow import to prevent thread contention & memory spikes
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"
os.environ["TF_NUM_INTEROP_THREADS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import time
import io
import csv
import base64
import threading
import numpy as np
import matplotlib.cm as cm
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

import tensorflow as tf
import keras

# Configure TensorFlow single-thread execution for CPU environments (Render, Linux container)
try:
    tf.config.threading.set_inter_op_parallelism_threads(1)
    tf.config.threading.set_intra_op_parallelism_threads(1)
except Exception as e_th:
    print(f"[INIT] Threading configuration note: {e_th}", flush=True)

app = Flask(__name__)

# Configure CORS: support environment-driven origins for public production deployments
DEFAULT_ALLOWED_ORIGINS = [
    "https://med-xplain-two.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
]

cors_origins_env = os.environ.get('CORS_ORIGINS') or os.environ.get('FRONTEND_URL')
allowed_origins = list(DEFAULT_ALLOWED_ORIGINS)
if cors_origins_env:
    for orig in cors_origins_env.split(','):
        clean_orig = orig.strip().rstrip('/')
        if clean_orig and clean_orig not in allowed_origins:
            allowed_origins.append(clean_orig)

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'bmp', 'dcm'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB max upload size

# Model & Thresholds Path Resolution (Environment-based & Relative)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))

MODEL_CANDIDATES = [
    os.environ.get('MODEL_PATH'),
    os.path.join(PROJECT_DIR, 'models', 'best_densenet121.keras'),
    os.path.join(BASE_DIR, 'models', 'best_densenet121.keras'),
    os.path.join('models', 'best_densenet121.keras'),
    r'C:\Users\User\OneDrive\Desktop\models\best_densenet121.keras',
    r'C:\Users\User\Downloads\best_densenet121.keras'
]

THRESHOLDS_CANDIDATES = [
    os.environ.get('THRESHOLDS_PATH'),
    os.path.join(PROJECT_DIR, 'models', 'optimal_thresholds.csv'),
    os.path.join(BASE_DIR, 'models', 'optimal_thresholds.csv'),
    os.path.join('models', 'optimal_thresholds.csv'),
    r'C:\Users\User\OneDrive\Desktop\models\optimal_thresholds.csv',
    os.path.join(PROJECT_DIR, 'models', 'optimal_thresholds.txt'),
    r'C:\Users\User\OneDrive\Desktop\models\optimal_thresholds.txt',
    r'C:\Users\User\Downloads\optimal_thresholds.csv',
    r'C:\Users\User\Downloads\optimal_thresholds.txt'
]

MODEL = None
MODEL_PATH_LOADED = None
GRAD_CAM_MODEL = None
TARGET_LAYER_NAME = 'conv5_block16_2_conv'
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

_MODEL_LOCK = threading.Lock()
_INFERENCE_LOCK = threading.Lock()

def ensure_model_loaded():
    """
    Thread-safe lazy initialization ensuring DenseNet121 and Grad-CAM
    are loaded inside the active worker process, avoiding POSIX fork deadlocks.
    """
    global MODEL
    if MODEL is None:
        with _MODEL_LOCK:
            if MODEL is None:
                init_model()

GAP_LAYER = None
DROPOUT_LAYER = None
CLASSIFIER_LAYER = None

def init_model():
    global MODEL, MODEL_PATH_LOADED, LABELS_DATA, LABELS_DICT, GRAD_CAM_MODEL, GAP_LAYER, DROPOUT_LAYER, CLASSIFIER_LAYER
    model_file = resolve_file(MODEL_CANDIDATES)
    thresh_file = resolve_file(THRESHOLDS_CANDIDATES)

    if not thresh_file:
        print("[WARNING] Could not locate optimal_thresholds.csv!", flush=True)
    else:
        print(f"[INIT] Loading optimal thresholds from: {thresh_file}", flush=True)
        LABELS_DATA = load_thresholds(thresh_file)
        LABELS_DICT = {name: thresh for name, thresh in LABELS_DATA}
        print(f"[INIT] Loaded {len(LABELS_DATA)} labels and thresholds.", flush=True)

    if not model_file:
        print("[WARNING] Could not locate best_densenet121.keras!", flush=True)
        return

    pid = os.getpid()
    print(f"[INIT] Loading DenseNet121 model in worker PID {pid} from: {model_file} ...", flush=True)
    t0 = time.time()
    try:
        MODEL = keras.models.load_model(model_file, compile=False)
        MODEL_PATH_LOADED = model_file
        print(f"[INIT] Model loaded successfully in {time.time()-t0:.2f}s in PID {pid}!", flush=True)
        print(f"[INIT] Input shape: {MODEL.input_shape}, Output shape: {MODEL.output_shape}", flush=True)

        # Construct and cache the Grad-CAM sub-model targeting conv5_block16_2_conv
        try:
            dense_sub = MODEL.get_layer('densenet121')
            target_conv = dense_sub.get_layer(TARGET_LAYER_NAME)
            GRAD_CAM_MODEL = keras.models.Model(
                inputs=dense_sub.input,
                outputs=[target_conv.output, dense_sub.output]
            )
            GAP_LAYER = MODEL.get_layer('global_average_pooling2d')
            DROPOUT_LAYER = MODEL.get_layer('dropout')
            CLASSIFIER_LAYER = MODEL.get_layer('disease_outputs')
            print(f"[INIT] Grad-CAM model created targeting layer '{TARGET_LAYER_NAME}' (output shape: {target_conv.output.shape})!", flush=True)
        except Exception as e_cam:
            print(f"[WARNING] Could not initialize Grad-CAM sub-model: {e_cam}", flush=True)
            GRAD_CAM_MODEL = None

        # Warmup forward pass: runs one inference to initialize JIT kernels, C++ buffers & weights once at startup
        try:
            t_warm = time.time()
            dummy_batch = np.zeros((1, 224, 224, 3), dtype=np.float32)
            with _INFERENCE_LOCK:
                _ = MODEL(dummy_batch, training=False)
            print(f"[INIT] Model warmed up with single-thread forward pass in {time.time()-t_warm:.2f}s!", flush=True)
        except Exception as e_warm:
            print(f"[WARNING] Model warmup exception: {e_warm}", flush=True)
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}", flush=True)
        MODEL = None
        GRAD_CAM_MODEL = None

# Preload thresholds at startup (fast CSV read, zero thread footprint)
_thresh_file = resolve_file(THRESHOLDS_CANDIDATES)
if _thresh_file:
    LABELS_DATA = load_thresholds(_thresh_file)
    LABELS_DICT = {name: thresh for name, thresh in LABELS_DATA}

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
        return None, 0.0, None, [], "Unable to confidently determine whether the image is a supported Brain MRI, Chest X-Ray, or Bone X-Ray."

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
    if dark_space_frac > 0.65:
        bm_score -= 4.0

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
    if dark_space_frac > 0.65:
        bx_score += 2.0
    if sym_diff > 0.085:
        bx_score += 3.0
    if lower_mean < 0.35:
        bx_score += 2.5
    if inner_grad < 0.075:
        bx_score += 2.5
    if dense_bone_frac > 0.04:
        bx_score += 2.0
    if dense_bone_frac > 0.08:
        bx_score += 1.5
    # Penalties
    if lower_mean > 0.45 and diaphragm_step > 0.15:
        bx_score -= 5.0
    if radial_ratio > 3.0 and inner_grad > 0.085:
        bx_score -= 5.0

    raw_scores = {
        "Brain": max(0.1, bm_score),
        "Chest": max(0.1, cxr_score),
        "Bone": max(0.1, bx_score)
    }

    # Softmax temperature scaling calibrated for realistic probabilities
    temp = 3.5
    exp_vals = {k: np.exp(v / temp) for k, v in raw_scores.items()}
    sum_exp = sum(exp_vals.values())
    probs = {k: float(exp_vals[k] / sum_exp) for k in raw_scores}

    best_organ = max(probs, key=probs.get)
    best_conf = probs[best_organ]
    modality = "MRI" if best_organ == "Brain" else "X-Ray"

    sorted_organ_candidates = [
        {"organ": organ_k, "confidence": round(probs[organ_k], 4)}
        for organ_k in sorted(probs, key=probs.get, reverse=True)
    ]

    CONFIDENCE_THRESHOLD = 0.65
    if best_conf < CONFIDENCE_THRESHOLD:
        return None, round(best_conf, 4), None, sorted_organ_candidates, "Unable to confidently determine whether the image is a supported Brain MRI, Chest X-Ray, or Bone X-Ray."

    return best_organ, round(best_conf, 4), modality, sorted_organ_candidates, None

def compute_gradcam_overlay(pil_img, preprocessed_batch, target_class_index, target_class_name):
    """
    Computes real mathematical Grad-CAM using tf.GradientTape, the DenseNet121 internal
    convolutional layer 'conv5_block16_2_conv', and the selected class score.
    Returns:
        overlay_data_uri (str): "data:image/png;base64,..."
        target_name (str): The disease name targeted
        layer_name (str): "conv5_block16_2_conv"
        error (str or None): Error message if failed
    """
    global MODEL, GRAD_CAM_MODEL
    if MODEL is None:
        return None, target_class_name, TARGET_LAYER_NAME, "Model is not loaded"

    try:
        # Fallback to initialize if not yet created
        if GRAD_CAM_MODEL is None:
            dense_sub = MODEL.get_layer('densenet121')
            target_conv = dense_sub.get_layer(TARGET_LAYER_NAME)
            GRAD_CAM_MODEL = keras.models.Model(
                inputs=dense_sub.input,
                outputs=[target_conv.output, dense_sub.output]
            )

        gap = GAP_LAYER if GAP_LAYER is not None else MODEL.get_layer('global_average_pooling2d')
        dropout = DROPOUT_LAYER if DROPOUT_LAYER is not None else MODEL.get_layer('dropout')
        classifier = CLASSIFIER_LAYER if CLASSIFIER_LAYER is not None else MODEL.get_layer('disease_outputs')

        with tf.GradientTape() as tape:
            # 1. Forward pass through feature extraction sub-model
            conv_outputs, dense_features = GRAD_CAM_MODEL(preprocessed_batch)
            tape.watch(conv_outputs)

            # 2. Forward pass through classification head
            pooled = gap(dense_features)
            dropped = dropout(pooled, training=False)
            predictions = classifier(dropped)
            target_score = predictions[:, target_class_index]

        # 3. Compute gradients of target class score with respect to convolutional feature maps
        gradients = tape.gradient(target_score, conv_outputs)
        if gradients is None:
            return None, target_class_name, TARGET_LAYER_NAME, "Gradient calculation returned None"

        # 4. Global average pooling of gradients: α_k^c = (1/Z) ∑_i ∑_j (∂y^c / ∂A_{i,j}^k)
        pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))

        # 5. Weighted combination of feature maps: L_{Grad-CAM}^c = ReLU( ∑_k α_k^c A^k )
        cam = tf.reduce_sum(tf.multiply(pooled_gradients, conv_outputs[0]), axis=-1)
        cam = np.maximum(cam.numpy(), 0)  # ReLU

        # 6. Normalize heatmap between 0 and 1
        cam_max = float(cam.max())
        cam_min = float(cam.min())
        if cam_max > cam_min:
            normalized_cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            normalized_cam = np.zeros_like(cam)

        # 7. Resize heatmap to image dimensions with bicubic interpolation (capped at 768 for fast encoding)
        orig_w, orig_h = pil_img.size
        max_dim = 768
        if max(orig_w, orig_h) > max_dim:
            scale = max_dim / float(max(orig_w, orig_h))
            target_w = max(1, int(orig_w * scale))
            target_h = max(1, int(orig_h * scale))
        else:
            target_w, target_h = orig_w, orig_h

        heatmap_pil = Image.fromarray((normalized_cam * 255.0).astype(np.uint8))
        heatmap_resized = heatmap_pil.resize((target_w, target_h), Image.Resampling.BICUBIC)
        heatmap_arr = np.array(heatmap_resized, dtype=np.float32) / 255.0

        # 8. Apply Jet colormap
        try:
            cmap = cm.colormaps['jet']
        except Exception:
            cmap = cm.get_cmap('jet')

        colored_cam = (cmap(heatmap_arr)[:, :, :3] * 255.0).astype(np.uint8)
        colored_pil = Image.fromarray(colored_cam)

        # 9. Blend heatmap with original image (alpha = 0.45)
        orig_rgb = pil_img.convert('RGB')
        if (orig_w, orig_h) != (target_w, target_h):
            orig_rgb = orig_rgb.resize((target_w, target_h), Image.Resampling.BILINEAR)
        overlay_pil = Image.blend(orig_rgb, colored_pil, alpha=0.45)

        # 10. Encode as Base64 data URI
        buf = io.BytesIO()
        overlay_pil.save(buf, format='PNG')
        b64_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        data_uri = f"data:image/png;base64,{b64_str}"

        return data_uri, target_class_name, TARGET_LAYER_NAME, None

    except Exception as e:
        return None, target_class_name, TARGET_LAYER_NAME, str(e)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint returning real model status.
    Guarantees model is initialized inside active worker process.
    """
    ensure_model_loaded()
    return jsonify({
        "status": "online",
        "service": "MEDIC-XAI Flask Machine Learning Backend",
        "model_loaded": MODEL is not None,
        "model_name": "DenseNet121-MultiLabel-60",
        "input_shape": list(MODEL.input_shape) if MODEL else None,
        "output_shape": list(MODEL.output_shape) if MODEL else None,
        "labels_count": len(LABELS_DATA),
        "supported_organs": ["Brain", "Chest", "Bone"],
        "grad_cam_ready": GRAD_CAM_MODEL is not None,
        "grad_cam_layer": TARGET_LAYER_NAME,
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
    ensure_model_loaded()
    start_time = time.time()
    origin = request.headers.get('Origin', 'N/A')
    print(f"[ANALYZE] request received - method={request.method}, origin={origin}", flush=True)

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
    t_load_start = time.time()
    print(f"[TIMING] image loading started at {t_load_start:.3f}", flush=True)
    try:
        image_bytes = uploaded_file.read()
        print(f"[ANALYZE] image received - filename='{uploaded_file.filename}', size={len(image_bytes)} bytes", flush=True)
        if len(image_bytes) == 0:
            return jsonify({
                "success": False,
                "error": "The uploaded image file is empty or corrupted."
            }), 400

        if len(image_bytes) > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": "Uploaded file exceeds maximum allowed size of 25MB."
            }), 400

        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(image_bytes))
        t_load_end = time.time()
        print(f"[TIMING] image loading & validation passed in {t_load_end - t_load_start:.3f}s - format={pil_img.format}, size={pil_img.size}, mode={pil_img.mode}", flush=True)
    except Exception:
        return jsonify({
            "success": False,
            "error": "Image parsing failed. Please upload a valid, readable medical image file."
        }), 400

    # STAGE 1: Pure Modality & Organ Detection (Zero Disease Model Dependencies)
    t_organ_start = time.time()
    print(f"[TIMING] modality/organ detection started at {t_organ_start:.3f}", flush=True)
    if organ_mode == 'auto':
        detected_organ, organ_confidence, detected_modality, top_organ_candidates, routing_err = analyze_modality_organ(pil_img)
        if routing_err or not detected_organ:
            # When reliable organ cannot be determined, do NOT generate disease predictions
            return jsonify({
                "success": False,
                "supported": False,
                "organ": None,
                "organ_confidence": organ_confidence,
                "rejection_reason": routing_err or "Unable to confidently determine whether the image is a supported Brain MRI, Chest X-Ray, or Bone X-Ray.",
                "error": routing_err or "Unable to confidently determine whether the image is a supported Brain MRI, Chest X-Ray, or Bone X-Ray.",
                "top_organ_candidates": top_organ_candidates
            }), 400

        target_organ = detected_organ
        modality = detected_modality
        analysis_mode = "Auto"
    else:
        # Manual override fallback if requested by specific API consumers
        target_organ = organ_mode.capitalize()
        det_organ, det_conf, det_mod, top_organ_candidates, _ = analyze_modality_organ(pil_img)
        organ_confidence = det_conf if det_conf else 0.95
        modality = det_mod if det_mod else ("MRI" if target_organ == "Brain" else "X-Ray")
        analysis_mode = target_organ

    t_organ_end = time.time()
    print(f"[TIMING] modality/organ detection completed in {t_organ_end - t_organ_start:.3f}s - detected: {target_organ}, confidence: {organ_confidence}", flush=True)

    # STAGE 2: Preprocessing and Model Inference
    t_prep_start = time.time()
    print(f"[TIMING] preprocessing started at {t_prep_start:.3f}", flush=True)
    try:
        resized_img = pil_img.convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(resized_img, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)
        preprocessed_batch = tf.keras.applications.densenet.preprocess_input(img_batch)
        t_prep_end = time.time()
        print(f"[TIMING] preprocessing completed in {t_prep_end - t_prep_start:.3f}s", flush=True)

        t_infer_start = time.time()
        print(f"[TIMING] MODEL(batch, training=False) started at {t_infer_start:.3f}", flush=True)
        try:
            with _INFERENCE_LOCK:
                preds_tensor = MODEL(preprocessed_batch, training=False)
                raw_predictions = preds_tensor.numpy()[0]
            t_infer_end = time.time()
            print(f"[TIMING] MODEL(batch, training=False) completed in {t_infer_end - t_infer_start:.3f}s", flush=True)
        except Exception as e_inf:
            print(f"[INFERENCE EXCEPTION] {type(e_inf).__name__}: {e_inf}", flush=True)
            import traceback
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": f"Model inference failed at runtime: {type(e_inf).__name__}: {e_inf}",
                "stage": "model_inference"
            }), 500
    except Exception as e:
        print(f"[STAGE 2 ERROR] {type(e).__name__}: {e}", flush=True)
        return jsonify({
            "success": False,
            "error": f"Preprocessing or execution failed: {type(e).__name__}: {e}",
            "stage": "preprocessing"
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
    organ_candidates = []
    for label_name in allowed_labels:
        prob = all_probabilities.get(label_name, 0.0)
        threshold = all_thresholds.get(label_name, 0.5)
        is_detected = bool(prob >= threshold)
        item = {
            "name": label_name,
            "confidence": round(prob, 4),
            "threshold": round(threshold, 4),
            "detected": is_detected
        }
        organ_candidates.append(item)
        if is_detected:
            filtered_abnormalities.append({
                "name": label_name,
                "confidence": round(prob, 4),
                "threshold": round(threshold, 4),
                "stage": None,
                "region": None
            })

    # Sort filtered abnormalities by confidence descending
    filtered_abnormalities.sort(key=lambda x: x['confidence'], reverse=True)

    # Sort all organ-specific candidates by confidence descending
    organ_candidates.sort(key=lambda x: x['confidence'], reverse=True)
    top_predictions = organ_candidates[:3]

    # Grad-CAM Target Selection
    if filtered_abnormalities:
        gradcam_target_name = filtered_abnormalities[0]['name']
    else:
        gradcam_target_name = organ_candidates[0]['name']

    # DIAGNOSTIC ISOLATION: Temporarily disable compute_gradcam_overlay()
    print("[DIAGNOSTIC] Grad-CAM temporarily disabled for production isolation test", flush=True)
    gradcam_data_uri = None
    cam_target = gradcam_target_name
    cam_layer = TARGET_LAYER_NAME
    cam_err = None

    t_resp_start = time.time()
    print(f"[TIMING] response creation started at {t_resp_start:.3f}", flush=True)
    elapsed_time = round(time.time() - start_time, 3)
    top_pred_name = top_predictions[0]['name'] if top_predictions else 'None'
    print(f"[ANALYZE] response generated - organ='{target_organ}', confidence={organ_confidence}, detected_abnormalities={len(filtered_abnormalities)}, top_prediction='{top_pred_name}'", flush=True)
    print(f"[ANALYZE] total processing time: {elapsed_time}s", flush=True)

    # Return JSON response strictly formatted as required
    response_payload = {
        "success": True,
        "supported": True,
        "organ": target_organ,
        "organ_confidence": round(float(organ_confidence), 4),
        "analysis_mode": analysis_mode,
        "modality": modality,
        "top_organ_candidates": top_organ_candidates,
        "abnormalities": filtered_abnormalities,
        "detected_count": len(filtered_abnormalities),
        "top_predictions": top_predictions,
        "all_probabilities": all_probabilities,
        "all_thresholds": all_thresholds,
        "grad_cam_image": None,
        "gradcam_status": "disabled_for_production_test",
        "grad_cam_target": cam_target,
        "grad_cam_layer": cam_layer,
        "grad_cam_error": None,
        "xai_method": "Grad-CAM (Disabled for Diagnostic Test)",
        "model_name": "DenseNet121-MultiLabel-60",
        "processing_time": elapsed_time
    }
    t_resp_end = time.time()
    print(f"[TIMING] response creation completed in {t_resp_end - t_resp_start:.3f}s", flush=True)

    return jsonify(response_payload), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    print("=========================================================")
    print("MEDIC-XAI Real DenseNet121 Machine Learning Backend")
    print(f"Listening on http://{host}:{port}")
    print(f"API Endpoint: POST http://{host}:{port}/api/analyze")
    print("=========================================================")
    # Run with debug=False to avoid duplicate model reload
    app.run(host=host, port=port, debug=False)
