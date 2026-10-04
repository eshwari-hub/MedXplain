import React, { useState } from 'react';
import { 
  X, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Code2, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';
import { apiService } from '../services/api';

export function BackendModal({ isOpen, onClose }) {
  const [backendUrl, setBackendUrl] = useState(apiService.getBackendUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    apiService.setBackendUrl(backendUrl);
    const res = await apiService.checkHealth();
    setIsTesting(false);
    setTestResult(res);
  };

  const sampleCurl = `curl -X POST ${backendUrl}/api/analyze \\
  -F "file=@chest_scan.png" \\
  -F "organ_mode=chest"`;

  const samplePython = `# Production Render backend:
# https://medxplain-rlwd.onrender.com/api/analyze

# Or local development:
# python wsgi.py`;

  const expectedResponse = `{
  "success": true,
  "organ": "Chest",
  "modality": "X-Ray",
  "abnormalities": [
    {
      "name": "Example Abnormality",
      "confidence": 0.82,
      "stage": null,
      "region": "Example anatomical region"
    }
  ],
  "grad_cam_image": null,
  "xai_method": "Grad-CAM",
  "processing_time": 0.0
}`;

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <div className="modal-title-group">
            <Server size={20} className="text-cyan" />
            <h3 className="modal-title">Flask Backend Connection & Contract</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-xs text-secondary mb-4">
            Connect your local or remote Flask machine-learning service. When connected, the frontend sends real scans directly to <code>POST /api/analyze</code>. If offline, the interface clearly denotes <strong>DEMO MODE — Simulated Results</strong>.
          </p>

          {/* URL Input */}
          <div className="backend-url-field mb-4">
            <label className="mono text-xs text-cyan uppercase mb-1 block">
              Flask API Server Endpoint:
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={backendUrl} 
                onChange={(e) => setBackendUrl(e.target.value)}
                className="input-glass flex-1 mono text-sm"
                placeholder="https://medxplain-rlwd.onrender.com"
              />
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? <RefreshCw size={14} className="spin-slow" /> : <RefreshCw size={14} />}
                <span>Test Server</span>
              </button>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div className={`connection-feedback-box ${testResult.connected ? 'connected' : 'simulation'} mb-4`}>
              {testResult.connected ? (
                <>
                  <CheckCircle2 size={16} className="text-normal" />
                  <span className="text-xs">
                    Connected to live Flask server at <strong>{backendUrl}</strong>. Real model mode is active.
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-amber" />
                  <span className="text-xs">
                    No active server responding on {backendUrl}. You can test the interface using DEMO MODE — Simulated Results.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Setup Instructions */}
          <div className="setup-instructions-box glass-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={14} className="text-cyan" />
              <span className="mono text-xs font-semibold text-primary">To Start Flask Backend:</span>
            </div>
            <pre className="code-block mono text-xs">{samplePython}</pre>

            <div className="flex items-center gap-2 mt-3 mb-1">
              <Code2 size={14} className="text-cyan" />
              <span className="mono text-xs font-semibold text-primary">cURL API Test:</span>
            </div>
            <pre className="code-block mono text-xs">{sampleCurl}</pre>

            <div className="flex items-center gap-2 mt-3 mb-1">
              <Code2 size={14} className="text-cyan" />
              <span className="mono text-xs font-semibold text-primary">Expected Response JSON Schema:</span>
            </div>
            <pre className="code-block mono text-xs">{expectedResponse}</pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm w-full" onClick={onClose}>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
