import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileImage, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Brain, 
  Activity, 
  Bone, 
  Scan,
  RefreshCw,
  FolderOpen,
  Server,
  Zap
} from 'lucide-react';
import { PRESET_CASES, SUPPORTED_ORGANS } from '../data/sampleData';

export function ImageUpload({ 
  selectedImage, 
  setSelectedImage, 
  imageFile, 
  setImageFile, 
  selectedOrgan, 
  setSelectedOrgan, 
  onStartAnalysis,
  isLiveMode,
  apiError,
  onClearError,
  onToggleMode
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const [activeSampleType, setActiveSampleType] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setLocalError(null);
    setActiveSampleType(null);
    if (onClearError) onClearError();

    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff'];
    const isDicom = file.name.toLowerCase().endsWith('.dcm');
    
    if (!validExtensions.includes(file.type) && !isDicom && !file.name.match(/\.(png|jpe?g|webp|tiff?|dcm)$/i)) {
      setLocalError('Unsupported image format. Please upload a PNG, JPEG, TIFF, or DICOM (.dcm) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setImageFile(file);
      setSelectedOrgan('auto');
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = async (organId) => {
    setLocalError(null);
    if (onClearError) onClearError();
    setActiveSampleType(organId);
    setSelectedOrgan('auto');

    const sampleUrl = `/assets/${organId}-sample.jpg`;
    setSelectedImage(sampleUrl);

    try {
      const res = await fetch(sampleUrl);
      const blob = await res.blob();
      const sampleFile = new File([blob], `${organId}-sample.jpg`, { type: 'image/jpeg' });
      setImageFile(sampleFile);
    } catch {
      // Fallback
      const blob = new Blob(["sample"], { type: 'image/jpeg' });
      setImageFile(new File([blob], `${organId}-sample.jpg`, { type: 'image/jpeg' }));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setActiveSampleType(null);
    setLocalError(null);
    if (onClearError) onClearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeError = localError || apiError;

  return (
    <section className="section upload-section" id="upload-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Scan size={14} />
            <span>Automated Organ Routing & Inference</span>
          </div>
          <h2 className="section-title">
            Upload <span className="gradient-text">Medical Image</span>
          </h2>
          <p className="section-desc">
            Upload any Brain MRI, Chest Radiograph, or Bone X-Ray. The AI automatically classifies the organ and filters multi-label abnormality detections.
          </p>
        </div>

        {/* Mode Identification Banner */}
        <div className={`mode-status-banner glass-card-static ${isLiveMode ? 'banner-live' : 'banner-demo'}`}>
          <div className="banner-badge-group">
            <span className={`badge ${isLiveMode ? 'badge-cyan font-bold' : 'badge-warning'}`}>
              <span className={`pulse-dot ${isLiveMode ? '' : 'warning'}`} />
              {isLiveMode ? 'LIVE MODEL' : 'DEMO MODE — Simulated Results'}
            </span>
            <span className="banner-explainer text-xs text-secondary">
              {isLiveMode ? (
                <>Automated organ routing via unified <code className="text-cyan font-mono">DenseNet121</code> on Flask (<code className="text-cyan font-mono">POST /api/analyze</code>).</>
              ) : (
                <>Simulated results for frontend demonstration and presentation testing.</>
              )}
            </span>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onToggleMode}
          >
            <span>Switch to {isLiveMode ? 'Demo Mode' : 'Live Model'}</span>
          </button>
        </div>

        {/* Quick Sample Scans Bar */}
        <div className="sample-presets-bar glass-card-static mt-4">
          <div className="presets-label">
            <Sparkles size={16} className="text-cyan" />
            <span>Quick Sample Scans:</span>
          </div>
          <div className="preset-buttons-group">
            <button 
              className={`preset-btn ${activeSampleType === 'brain' ? 'active' : ''}`}
              onClick={() => handleLoadSample('brain')}
              type="button"
            >
              <Brain size={15} />
              <span>Sample Brain MRI</span>
            </button>

            <button 
              className={`preset-btn ${activeSampleType === 'chest' ? 'active' : ''}`}
              onClick={() => handleLoadSample('chest')}
              type="button"
            >
              <Activity size={15} />
              <span>Sample Chest X-Ray</span>
            </button>

            <button 
              className={`preset-btn ${activeSampleType === 'bone' ? 'active' : ''}`}
              onClick={() => handleLoadSample('bone')}
              type="button"
            >
              <Bone size={15} />
              <span>Sample Bone X-Ray</span>
            </button>
          </div>
        </div>

        {/* Error Alert Display */}
        {activeError && (
          <div className="upload-error-alert glass-panel mt-4">
            <div className="error-icon-box">
              <AlertCircle size={22} className="text-urgent" />
            </div>
            <div className="error-content">
              <h4 className="font-semibold text-rose-400">Analysis Notice</h4>
              <p className="text-xs text-secondary mt-1">{activeError}</p>
              {isLiveMode && (
                <div className="error-help-actions mt-2 flex gap-3 text-xs">
                  <span className="text-muted">Ensure scan is a valid Brain MRI, Chest X-Ray, or Bone X-Ray</span>
                </div>
              )}
            </div>
            {onClearError && (
              <button 
                className="btn-icon-close text-xs text-muted"
                onClick={onClearError}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Upload Container Grid */}
        <div className="upload-main-grid mt-6">
          {/* Left: Drag & Drop Zone / Preview */}
          <div className="upload-dropzone-wrapper">
            {!selectedImage ? (
              <div 
                className={`dropzone-box glass-panel ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInput} 
                  accept=".dcm,.png,.jpg,.jpeg,.webp,.tiff" 
                  style={{ display: 'none' }} 
                  id="medical-file-input"
                />

                <div className="dropzone-inner-content">
                  <div className="dropzone-icon-circle">
                    <UploadCloud size={40} className="dropzone-icon" />
                  </div>
                  <h3 className="dropzone-title">Upload Medical Image</h3>
                  <p className="dropzone-subtitle">
                    Drag & drop ANY medical scan here or browse files
                  </p>
                  
                  <div className="dropzone-cta-btn">
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <FolderOpen size={15} />
                      <span>Browse Files</span>
                    </button>
                  </div>

                  <div className="dropzone-organ-compat">
                    <span>Automated routing for:</span>
                    <span className="compat-pill"><Brain size={12} /> Brain MRI</span>
                    <span className="compat-pill"><Activity size={12} /> Chest X-Ray</span>
                    <span className="compat-pill"><Bone size={12} /> Bone X-Ray</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Selected Image Preview with HUD overlay */
              <div className="image-preview-card glass-panel">
                <div className="preview-hud-top">
                  <div className="preview-hud-badge mono">
                    <span className="pulse-dot" />
                    <span>MEDICAL IMAGE LOADED</span>
                  </div>
                  <button 
                    className="btn-icon-danger"
                    onClick={handleRemoveImage}
                    title="Remove Image"
                    id="remove-image-btn"
                  >
                    <Trash2 size={16} />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="preview-image-viewport">
                  <img src={selectedImage} alt="Medical scan preview" className="preview-img" />
                  <div className="preview-reticle-tl" />
                  <div className="preview-reticle-tr" />
                  <div className="preview-reticle-bl" />
                  <div className="preview-reticle-br" />
                  <div className="scanline-overlay" />
                </div>

                <div className="preview-hud-bottom">
                  <div className="file-info-item">
                    <span className="info-lbl">File:</span>
                    <span className="info-val mono">{imageFile?.name || 'medical_scan.png'}</span>
                  </div>
                  <div className="file-info-item">
                    <span className="info-lbl">Analysis Mode:</span>
                    <span className="info-val mono text-cyan font-bold">AUTO DETECT</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Automated Organ Detection Flow & Launch Trigger */}
          <div className="upload-config-panel glass-panel">
            <div className="flex items-center justify-between">
              <span className="badge badge-cyan font-bold mono">
                <Sparkles size={13} />
                AUTO DETECT ACTIVE
              </span>
              <span className="text-xs text-muted mono">Zero Manual Selection</span>
            </div>

            <h3 className="config-panel-title mt-3">
              Automated Organ Routing
            </h3>
            <p className="config-panel-desc">
              You do <strong>not</strong> need to manually select an organ. When you click <strong>Analyze Image</strong>, the pipeline automatically detects the scan's organ modality before disease filtering.
            </p>

            {/* Visual Automated Routing Pipeline Diagram */}
            <div className="auto-pipeline-flow mt-4">
              <div className="flow-step">
                <div className="flow-step-num mono">1</div>
                <div className="flow-step-body">
                  <div className="flow-step-title font-semibold text-primary">Upload Medical Image</div>
                  <div className="flow-step-desc text-xs text-muted">Ingestion of Brain MRI, Chest X-Ray, or Bone X-Ray</div>
                </div>
              </div>

              <div className="flow-connector" />

              <div className="flow-step active-flow">
                <div className="flow-step-num mono">2</div>
                <div className="flow-step-body">
                  <div className="flow-step-title font-semibold text-cyan">Detecting Organ...</div>
                  <div className="flow-step-desc text-xs text-muted">Dedicated modality & visual prior routing step</div>
                </div>
              </div>

              <div className="flow-connector" />

              <div className="flow-step">
                <div className="flow-step-num mono">3</div>
                <div className="flow-step-body">
                  <div className="flow-step-title font-semibold text-sky">Brain / Chest / Bone Detected</div>
                  <div className="flow-step-desc text-xs text-muted">High-confidence organ triage confirmation</div>
                </div>
              </div>

              <div className="flow-connector" />

              <div className="flow-step">
                <div className="flow-step-num mono">4</div>
                <div className="flow-step-body">
                  <div className="flow-step-title font-semibold text-primary">Analyzing Pathologies</div>
                  <div className="flow-step-desc text-xs text-muted">DenseNet121 60 outputs strictly filtered to detected organ</div>
                </div>
              </div>

              <div className="flow-connector" />

              <div className="flow-step">
                <div className="flow-step-num mono">5</div>
                <div className="flow-step-body">
                  <div className="flow-step-title font-semibold text-normal">Results & Grad-CAM</div>
                  <div className="flow-step-desc text-xs text-muted">Organ-isolated abnormalities & visual explainability</div>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="upload-action-box mt-6">
              <button 
                className={`btn btn-primary btn-lg w-full ${!selectedImage ? 'btn-disabled' : ''}`}
                onClick={onStartAnalysis}
                disabled={!selectedImage}
                id="analyze-image-btn"
              >
                <Zap size={18} />
                <span>Analyze Image</span>
                <ArrowRight size={18} />
              </button>
              
              {!selectedImage && (
                <p className="text-xs text-muted text-center mt-2">
                  * Upload a medical image or select a sample scan above to begin analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
