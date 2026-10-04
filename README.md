# MEDIC-XAI: Explainable AI-Based Multi-Label Detection Across Multiple Body Organs

A modern, responsive clinical artificial intelligence frontend built for the final-year research project:
> **“Explainable AI-Based Multi-Label Detection of Abnormalities Across Multiple Body Organs from Medical Images Using Deep Learning”**

---

## 🌟 Key Highlights & Architectural Scope

1. **Three Anatomical Systems (Multi-Organ Scope):**
   - **Brain**: MRI (T1w, T2w, FLAIR) & CT scans (Glioma, Meningioma, Pituitary Tumors, Peritumoral Edema).
   - **Chest**: Digital Radiography PA/AP Chest X-Rays (Pleural Effusion, Cardiomegaly, Pneumonia, Infiltration).
   - **Bone**: Orthopedic Musculoskeletal Radiography (Cortical Fractures, Subluxations, Osteopenia, Osteoarthritis).

2. **Core 5-Stage Processing Pipeline:**
   $$\text{Image Ingestion} \rightarrow \text{Preprocessing (CLAHE + Normalization)} \rightarrow \text{Organ Routing} \rightarrow \text{DenseNet121 Feature Extraction} \rightarrow \text{Multi-Label Sigmoid Head} \rightarrow \text{Grad-CAM XAI}$$

3. **Explainable AI (Grad-CAM Diagnostic Workstation):**
   - Interactive **Split Wiper Slider** (drag handle across scan to reveal underlying anatomy beneath the heatmap).
   - **Side-by-Side** comparison mode and **Blended Overlay** with live opacity slider (0% to 100%).
   - Dynamic **Jet** and **Turbo** colormaps rendered natively on HTML5 Canvas.
   - Multi-label pathology selector to switch Grad-CAM heatmaps between co-occurring abnormalities.
   - High-attention Bounding Box (ROI) with medical HUD corner reticles.
   - Mathematical formulation display for target layer `conv5_block16_2_conv`.

4. **Clinical Results & Triage:**
   - Calibrated confidence gauges with risk thresholds (High Risk, Moderate, Normal Range).
   - Disease Stage assessment (e.g., Grade III Anaplastic Glioma, Acute Metaphyseal Cortical Fracture).
   - Overall diagnostic triage status (Urgent, Action Required, Clear).
   - Printable / PDF-exportable Clinical Research Diagnostic Report.

5. **History & Persistence:**
   - Retrospective analyses table saved in `localStorage`.
   - Organ filtering (All Organs, Brain, Chest, Bone).
   - One-click "View Results" to reload past scans into the Grad-CAM viewer.

6. **Flask Backend Decoupling:**
   - Plug-and-play RESTful API architecture.
   - Seamless fallback between **Live Flask Backend** (`http://127.0.0.1:5000/api/predict`) and **Clinical Simulation Mode** (ensuring the frontend is 100% interactive during academic presentations).
   - Sample Flask template provided in `backend_sample/app.py`.

---

## 🚀 Running the Frontend

```bash
# Install dependencies (already installed)
npm install

# Run Vite development server
npm run dev
```

The application runs on `http://localhost:5174/` (or `http://localhost:5173/`).

---

## 🐍 Connecting Your Flask Backend

A starter Flask server matching the frontend JSON schema is located at:
[backend_sample/app.py](file:///c:/Users/User/OneDrive/Desktop/medical/backend_sample/app.py)

To start the Flask server:
```bash
pip install flask flask-cors pillow numpy
python backend_sample/app.py
```

The frontend will automatically detect the server and switch from **"Flask: Ready"** to **"Flask: Live"**.
