// API client service for Flask backend integration and Demo Mode fallback

import { PRESET_CASES } from '../data/sampleData';

const LIVE_RENDER_BACKEND = 'https://medxplain-rlwd.onrender.com';

function resolveInitialBackendUrl() {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
    ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') 
    : '';

  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '0.0.0.0'
  );

  let stored = null;
  try {
    stored = localStorage.getItem('medic_xai_backend_url');
  } catch {
    // localStorage might be restricted in some privacy modes
  }

  // If in cloud production and stored URL points to localhost, ignore and clear stale local URL
  if (stored && !isLocalHost && (stored.includes('127.0.0.1') || stored.includes('localhost'))) {
    try { localStorage.removeItem('medic_xai_backend_url'); } catch {}
    stored = null;
  }

  if (stored) return stored.replace(/\/+$/, '');
  if (envUrl) return envUrl;
  return isLocalHost ? 'http://127.0.0.1:5000' : LIVE_RENDER_BACKEND;
}

class MedicalAIService {
  constructor() {
    this.backendUrl = resolveInitialBackendUrl();
    this.isLiveConnected = false;
  }

  setBackendUrl(url) {
    this.backendUrl = (url || '').trim().replace(/\/+$/, '');
    try {
      localStorage.setItem('medic_xai_backend_url', this.backendUrl);
    } catch {}
  }

  getBackendUrl() {
    return this.backendUrl;
  }

  /**
   * Health check to detect if the Flask server is running at /api/health
   */
  async checkHealth() {
    if (!this.backendUrl) {
      this.isLiveConnected = false;
      return { connected: false, status: 'offline' };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s health check timeout
      const res = await fetch(`${this.backendUrl}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        this.isLiveConnected = true;
        return { connected: true, status: 'online' };
      }
    } catch {
      this.isLiveConnected = false;
    }
    return { connected: false, status: 'offline' };
  }

  /**
   * Live Flask Model Analysis via POST /api/analyze
   * Sends:
   *   - file: Image file (multipart/form-data)
   *   - organ_mode: 'auto' | 'brain' | 'chest' | 'bone'
   */
  async analyzeLive(file, organMode = 'auto', onProgress = () => {}) {
    if (!this.backendUrl) {
      throw new Error("AI analysis service URL is not configured. Please ensure VITE_API_URL is set in your deployment environment or configure the server endpoint in settings.");
    }
    if (!file) {
      throw new Error("Invalid image file. Please provide a valid medical image file (DICOM, PNG, JPG, or TIFF).");
    }

    let actualFile = file;
    if (typeof file === 'string') {
      try {
        const fetchRes = await fetch(file);
        const blob = await fetchRes.blob();
        const fname = file.split('/').pop() || 'sample_scan.jpg';
        actualFile = new File([blob], fname, { type: blob.type || 'image/jpeg' });
      } catch {
        throw new Error("Invalid image file. Could not read image stream.");
      }
    }

    onProgress(1, "Connecting to AI Analysis Backend...", 20);

    const formData = new FormData();
    formData.append('file', actualFile);
    formData.append('organ_mode', organMode || 'auto');

    // Production analysis timeout: 180 seconds for DenseNet121 + Grad-CAM inference
    const ANALYSIS_TIMEOUT_MS = 180000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    onProgress(2, "Detecting Organ (Brain MRI / Chest X-Ray / Bone X-Ray)...", 40);

    let response;
    try {
      response = await fetch(`${this.backendUrl}/api/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (networkErr) {
      clearTimeout(timeoutId);
      if (networkErr.name === 'AbortError') {
        throw new Error("AI analysis service request timed out. Please try again.");
      }
      throw new Error("AI analysis service is currently unavailable. Please try again later.");
    }

    if (!response.ok) {
      let errorMsg = "AI analysis service is currently unavailable. Please try again later.";
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errorMsg = errJson.error;
        }
      } catch {
        // Fallback to clean error message
      }
      throw new Error(errorMsg);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Received an invalid response from the analysis server.");
    }

    if (!result || typeof result !== 'object') {
      throw new Error("Received an invalid response from the analysis server.");
    }

    if (result.success === false) {
      throw new Error(result.error || 'AI analysis service is currently unavailable. Please try again later.');
    }

    onProgress(3, `Organ Detected: ${result.organ} — Routing to pipeline...`, 70);
    onProgress(4, `Evaluating ${result.organ} specific disease thresholds...`, 88);
    onProgress(5, "Inference complete", 100);

    // Normalize confidence values: if backend returns 0.82, normalize to 82%
    const normalizedAbnormalities = (result.abnormalities || []).map(abn => {
      let rawConf = abn.confidence;
      let displayConf = 0;
      if (typeof rawConf === 'number') {
        displayConf = rawConf <= 1.0 ? rawConf * 100 : rawConf;
      }
      let rawThresh = abn.threshold;
      let displayThresh = typeof rawThresh === 'number' ? (rawThresh <= 1.0 ? rawThresh * 100 : rawThresh) : 50;
      return {
        name: abn.name || 'Unspecified Abnormality',
        confidence: displayConf,
        rawConfidence: rawConf,
        threshold: displayThresh,
        rawThreshold: rawThresh,
        stage: abn.stage || null,
        region: abn.region || null,
        clinicalReasoning: abn.clinical_reasoning || abn.reasoning || null
      };
    });

    // Normalize Top Model Candidates (top 3 organ-specific predictions)
    const normalizedTopPredictions = (result.top_predictions || []).map(p => {
      let rawConf = p.confidence;
      let displayConf = typeof rawConf === 'number' ? (rawConf <= 1.0 ? rawConf * 100 : rawConf) : 0;
      let rawThresh = p.threshold;
      let displayThresh = typeof rawThresh === 'number' ? (rawThresh <= 1.0 ? rawThresh * 100 : rawThresh) : 50;
      return {
        name: p.name || 'Candidate',
        confidence: displayConf,
        rawConfidence: rawConf,
        threshold: displayThresh,
        rawThreshold: rawThresh,
        detected: Boolean(p.detected)
      };
    });

    const organConf = typeof result.organ_confidence === 'number'
      ? (result.organ_confidence <= 1.0 ? result.organ_confidence * 100 : result.organ_confidence)
      : 95.0;

    return {
      id: `live-${Date.now()}`,
      source: 'live-model', // Flagged as LIVE MODEL
      isDemoMode: false,
      analyzedAt: new Date().toISOString(),
      fileName: actualFile.name || 'uploaded_image.png',
      fileSize: actualFile.size ? `${(actualFile.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
      organ: result.organ || 'Unspecified',
      organName: result.organ || 'Unspecified',
      organConfidence: organConf,
      rawOrganConfidence: result.organ_confidence || 0.95,
      supported: result.supported !== false,
      top_organ_candidates: result.top_organ_candidates || [],
      topOrganCandidates: result.top_organ_candidates || [],
      analysisMode: result.analysis_mode || 'Auto',
      modality: result.modality || 'Medical Imaging',
      abnormalities: normalizedAbnormalities,
      top_predictions: normalizedTopPredictions,
      topPredictions: normalizedTopPredictions,
      grad_cam_image: result.grad_cam_image || null,
      grad_cam_target: result.grad_cam_target || (normalizedTopPredictions[0]?.name || null),
      grad_cam_layer: result.grad_cam_layer || 'conv5_block16_2_conv',
      grad_cam_error: result.grad_cam_error || null,
      xai_method: result.xai_method || 'Grad-CAM',
      processing_time: result.processing_time || 0.0,
      triageLevel: normalizedAbnormalities.length > 0 ? (normalizedAbnormalities.some(a => a.confidence >= 50) ? 'Action Required' : 'Model Complete') : 'Normal / Clear',
      overallStatus: normalizedAbnormalities.length > 0 ? 'Model Evaluation Complete' : 'No abnormalities identified by the model'
    };
  }

  /**
   * DEMO MODE — Simulated Results
   * Clearly identified as a simulated demo workflow for UI testing and academic demonstration.
   */
  async analyzeDemo(fileOrPreset, organHint = 'auto', onProgress = () => {}) {
    const stages = [
      { step: 1, name: 'DEMO: Image Preprocessing (224x224 Tensor Simulation)', delay: 400 },
      { step: 2, name: 'DEMO: Anatomical Organ Triage Simulation', delay: 450 },
      { step: 3, name: 'DEMO: Feature Extraction Simulation', delay: 500 },
      { step: 4, name: 'DEMO: Multi-Label Probability Calculation', delay: 450 },
      { step: 5, name: 'DEMO: Grad-CAM Activation Simulation', delay: 400 }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const pct = Math.round(((i + 1) / stages.length) * 100);
      onProgress(stage.step, stage.name, pct);
      await new Promise(r => setTimeout(r, stage.delay));
    }

    let detectedOrgan = 'chest';
    if (organHint && organHint !== 'auto') {
      detectedOrgan = organHint.toLowerCase();
    } else if (fileOrPreset?.name) {
      const name = fileOrPreset.name.toLowerCase();
      if (name.includes('brain') || name.includes('mri')) {
        detectedOrgan = 'brain';
      } else if (name.includes('bone') || name.includes('fracture') || name.includes('wrist') || name.includes('knee')) {
        detectedOrgan = 'bone';
      } else {
        detectedOrgan = 'chest';
      }
    }

    const baseCase = PRESET_CASES[detectedOrgan] || PRESET_CASES.chest;

    return {
      ...baseCase,
      id: `demo-${Date.now()}`,
      source: 'demo-simulation', // Flagged as DEMO MODE
      isDemoMode: true,
      analyzedAt: new Date().toISOString(),
      fileName: fileOrPreset?.name || baseCase.fileName,
      fileSize: fileOrPreset?.size ? `${(fileOrPreset.size / (1024 * 1024)).toFixed(2)} MB` : baseCase.fileSize,
      organ: baseCase.organName,
      organName: baseCase.organName,
      organConfidence: 94.8,
      rawOrganConfidence: 0.948,
      analysisMode: 'Auto',
      modality: baseCase.modality,
      top_predictions: baseCase.top_predictions || [
        { name: 'Effusion', confidence: 42.3, threshold: 65.0, detected: false },
        { name: 'Atelectasis', confidence: 31.8, threshold: 60.0, detected: false },
        { name: 'Pneumonia', confidence: 18.4, threshold: 55.0, detected: false }
      ],
      topPredictions: baseCase.top_predictions || [],
      grad_cam_image: null, // In demo, uses canvas rendering with explicit demo notice
      grad_cam_target: baseCase.grad_cam_target || baseCase.abnormalities?.[0]?.name || 'Target Pathology',
      grad_cam_layer: 'conv5_block16_2_conv',
      xai_method: 'Grad-CAM (Demo Projection)',
      processing_time: 1.84,
      overallStatus: 'DEMO MODE — Simulated Results'
    };
  }
}

export const apiService = new MedicalAIService();
