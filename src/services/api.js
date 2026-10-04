// API client service for Flask backend integration and Demo Mode fallback

import { PRESET_CASES } from '../data/sampleData';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:5000';

class MedicalAIService {
  constructor() {
    this.backendUrl = localStorage.getItem('medic_xai_backend_url') || DEFAULT_BACKEND_URL;
    this.isLiveConnected = false;
  }

  setBackendUrl(url) {
    this.backendUrl = url.replace(/\/+$/, ''); // Strip trailing slash
    localStorage.setItem('medic_xai_backend_url', this.backendUrl);
  }

  getBackendUrl() {
    return this.backendUrl;
  }

  /**
   * Health check to detect if the Flask server is running at /api/health
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
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
   *
   * Handles:
   *   - Backend unavailable
   *   - Invalid/unsupported image
   *   - API timeout (25s)
   *   - Model error
   *   - Empty prediction response
   */
  async analyzeLive(file, organMode = 'auto', onProgress = () => {}) {
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

    onProgress(1, "Connecting to Flask API (http://localhost:5000)...", 20);

    const formData = new FormData();
    formData.append('file', actualFile);
    formData.append('organ_mode', organMode || 'auto');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

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
        throw new Error("Analysis request timed out. The model server may be under heavy load or processing a large tensor. Please try again.");
      }
      throw new Error("Unable to connect to the analysis server. Please make sure the Flask backend is running on http://localhost:5000.");
    }

    if (!response.ok) {
      let errorMsg = `Server returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errorMsg = errJson.error;
        }
      } catch {
        // Fallback to text if not json
      }
      throw new Error(errorMsg);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Received an empty prediction response from the analysis server.");
    }

    if (!result || typeof result !== 'object') {
      throw new Error("Received an empty prediction response from the analysis server.");
    }

    if (result.success === false) {
      throw new Error(result.error || 'Analysis failed on backend');
    }

    onProgress(3, `Organ Detected: ${result.organ} — Routing to pipeline...`, 70);
    onProgress(4, `Evaluating ${result.organ} specific disease thresholds...`, 88);
    onProgress(5, "Inference complete", 100);

    // Normalize confidence values: if backend returns 0.82, normalize to 82%
    const normalizedAbnormalities = (result.abnormalities || []).map(abn => {
      let rawConf = abn.confidence;
      let displayConf = 0;
      if (typeof rawConf === 'number') {
        // If 0 <= rawConf <= 1.0, scale to 0..100
        displayConf = rawConf <= 1.0 ? rawConf * 100 : rawConf;
      }
      return {
        name: abn.name || 'Unspecified Abnormality',
        confidence: displayConf,
        rawConfidence: rawConf,
        threshold: abn.threshold,
        stage: abn.stage || null, // Optional; if null, UI displays 'Not available'
        region: abn.region || null,
        clinicalReasoning: abn.clinical_reasoning || abn.reasoning || null
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
      analysisMode: result.analysis_mode || 'Auto',
      modality: result.modality || 'Medical Imaging',
      abnormalities: normalizedAbnormalities,
      grad_cam_image: result.grad_cam_image || null,
      xai_method: result.xai_method || 'Grad-CAM',
      processing_time: result.processing_time || 0.0,
      triageLevel: normalizedAbnormalities.some(a => a.confidence >= 50) ? 'Action Required' : 'Normal / Clear',
      overallStatus: normalizedAbnormalities.length > 0 ? 'Model Evaluation Complete' : 'No Abnormalities Detected'
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
      grad_cam_image: null, // In demo, uses canvas rendering with explicit demo notice
      xai_method: 'Grad-CAM (Demo Projection)',
      processing_time: 1.84,
      overallStatus: 'DEMO MODE — Simulated Results'
    };
  }
}

export const apiService = new MedicalAIService();
