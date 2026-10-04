import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Sliders, 
  Layers, 
  SplitSquareVertical, 
  Maximize2, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  Brain, 
  Activity, 
  Bone,
  Flame,
  AlertCircle
} from 'lucide-react';
import { renderGradcamCanvas } from '../services/gradcamCanvas';

export function ExplainableAIView({ analysisResult }) {
  const [selectedAbnormalityIndex, setSelectedAbnormalityIndex] = useState(0);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'side-by-side' | 'blend'
  const [opacity, setOpacity] = useState(0.70);
  const [colormap, setColormap] = useState('jet'); // 'jet' | 'turbo'
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);

  const canvasRef = useRef(null);
  const sideCanvasRef = useRef(null);
  const imageObjRef = useRef(null);

  const isDemo = analysisResult?.isDemoMode || analysisResult?.source === 'demo-simulation';
  const hasRealGradcam = Boolean(analysisResult?.grad_cam_image);

  const abnormalities = (analysisResult?.abnormalities && analysisResult.abnormalities.length > 0)
    ? analysisResult.abnormalities
    : [
        {
          name: 'Under Evaluation',
          confidence: 0,
          region: 'Pending model analysis',
          clinicalReasoning: 'Awaiting model inference from Flask backend.'
        }
      ];

  const currentAbnormality = abnormalities[selectedAbnormalityIndex] || abnormalities[0];
  const imageUrl = analysisResult?.imageUrl || '/assets/brain-sample.jpg';

  // In DEMO mode only, procedural canvas simulates heatmaps for UI validation.
  // In LIVE model mode, NO fake heatmap is generated if grad_cam_image is null.
  useEffect(() => {
    if (!isDemo && !hasRealGradcam) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = hasRealGradcam ? analysisResult.grad_cam_image : imageUrl;
    img.onload = () => {
      imageObjRef.current = img;
      if (isDemo) {
        redrawDemoHeatmaps();
      }
    };
  }, [imageUrl, analysisResult?.grad_cam_image, isDemo, hasRealGradcam, selectedAbnormalityIndex, opacity, colormap, showBoundingBox, viewMode]);

  const redrawDemoHeatmaps = () => {
    if (!imageObjRef.current || !isDemo) return;

    const renderOpts = {
      centroid: currentAbnormality.heatCentroid || { x: 0.5, y: 0.5, radius: 0.22 },
      opacity: opacity,
      colormap: colormap,
      showBBox: showBoundingBox,
      threshold: 0.2
    };

    if (canvasRef.current) {
      renderGradcamCanvas(canvasRef.current, imageObjRef.current, renderOpts);
    }
    if (sideCanvasRef.current) {
      renderGradcamCanvas(sideCanvasRef.current, imageObjRef.current, renderOpts);
    }
  };

  const handleSliderMove = (e) => {
    const container = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (!clientX) return;
    const pos = Math.max(0, Math.min(100, ((clientX - container.left) / container.width) * 100));
    setSliderPosition(pos);
  };

  return (
    <section className="section xai-section" id="gradcam-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Eye size={14} />
            <span>Transparent Neural Network Interpretability</span>
          </div>
          <h2 className="section-title">
            Grad-CAM <span className="gradient-text">Visual Explainability</span>
          </h2>
          <p className="section-desc">
            Visualizing gradient attribution from the DenseNet121 final convolutional stage (<code>conv5_block16_2_conv</code>) to explain why the model made each prediction.
          </p>
        </div>

        {/* Abnormality Target Selector (Multi-Label Switcher) */}
        <div className="xai-abnormality-tabs glass-card-static">
          <span className="tabs-header-label mono uppercase text-xs text-muted">
            Inspect Class Activation:
          </span>
          <div className="xai-tabs-container">
            {abnormalities.map((abn, idx) => {
              const confVal = typeof abn.confidence === 'number' ? abn.confidence : 0;
              return (
                <button
                  key={abn.id || idx}
                  className={`xai-tab-btn ${selectedAbnormalityIndex === idx ? 'active' : ''}`}
                  onClick={() => setSelectedAbnormalityIndex(idx)}
                >
                  <Flame size={15} className={selectedAbnormalityIndex === idx ? 'text-cyan' : 'text-muted'} />
                  <span className="font-semibold">{abn.name}</span>
                  <span className="badge badge-cyan mono text-xs">{confVal.toFixed(1)}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Workstation Layout */}
        <div className="xai-workstation-grid">
          {/* Left / Center: Interactive Diagnostic Viewer */}
          <div className="xai-viewer-container glass-panel">
            {/* Viewer HUD Bar */}
            <div className="viewer-hud-header">
              <div className="hud-title-group">
                <span className="pulse-dot" />
                <span className="mono text-xs font-semibold">
                  GRAD-CAM VIEWPORT • {(analysisResult?.organ || analysisResult?.organName || 'SCAN').toUpperCase()}
                </span>
                {isDemo ? (
                  <span className="badge badge-warning text-xs mono">DEMO MODE — Simulated Results</span>
                ) : (
                  <span className="badge badge-cyan text-xs mono font-bold">LIVE MODEL</span>
                )}
              </div>

              {/* View Mode Switcher (available when Grad-CAM is ready) */}
              {(hasRealGradcam || isDemo) && (
                <div className="hud-mode-buttons">
                  <button 
                    className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                    onClick={() => setViewMode('split')}
                    title="Interactive Wiper Comparison Slider"
                  >
                    <SplitSquareVertical size={14} />
                    <span>Split Slider</span>
                  </button>
                  <button 
                    className={`mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
                    onClick={() => setViewMode('side-by-side')}
                    title="Side-by-side comparison"
                  >
                    <Layers size={14} />
                    <span>Side-by-Side</span>
                  </button>
                  <button 
                    className={`mode-btn ${viewMode === 'blend' ? 'active' : ''}`}
                    onClick={() => setViewMode('blend')}
                    title="Blended Heatmap Overlay"
                  >
                    <Maximize2 size={14} />
                    <span>Blended</span>
                  </button>
                </div>
              )}
            </div>

            {/* Viewer Stage */}
            <div className="viewer-viewport-stage">
              {/* CASE 1: Live Model Mode with NO Grad-CAM image yet */}
              {!isDemo && !hasRealGradcam ? (
                <div className="gradcam-empty-state-view">
                  <div className="empty-state-icon-circle">
                    <Eye size={42} className="text-cyan" />
                  </div>
                  <h3 className="empty-state-title">
                    Grad-CAM will appear here after model analysis.
                  </h3>
                  <p className="empty-state-desc text-xs text-secondary mt-2">
                    The live backend analyzed this scan but returned <code>grad_cam_image: null</code>. To display real class activations, return a base64 or image URL in the <code>grad_cam_image</code> field from <code>POST /api/analyze</code>.
                  </p>
                  <div className="empty-state-callout mono text-xs mt-4">
                    <span>* Real explanations will render automatically without fake heatmaps.</span>
                  </div>
                </div>
              ) : hasRealGradcam ? (
                /* CASE 2: Real Grad-CAM Image returned by Live Flask backend */
                <div className="live-gradcam-display-box">
                  {viewMode === 'split' ? (
                    <div 
                      className="split-slider-viewport"
                      onMouseMove={handleSliderMove}
                      onTouchMove={handleSliderMove}
                    >
                      <img src={imageUrl} alt="Original Scan" className="split-layer-base" />
                      <div 
                        className="split-layer-overlay"
                        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                      >
                        <img src={analysisResult.grad_cam_image} alt="Live Grad-CAM" className="split-canvas" />
                      </div>
                      <div className="split-wiper-line" style={{ left: `${sliderPosition}%` }}>
                        <div className="wiper-handle">
                          <div className="wiper-arrow-left">&#9664;</div>
                          <div className="wiper-arrow-right">&#9654;</div>
                        </div>
                      </div>
                      <div className="split-label-left mono text-xs">Original Scan</div>
                      <div className="split-label-right mono text-xs text-cyan">Live Grad-CAM</div>
                    </div>
                  ) : viewMode === 'side-by-side' ? (
                    <div className="side-by-side-viewport">
                      <div className="side-box">
                        <div className="side-box-label mono text-xs">Original Image</div>
                        <img src={imageUrl} alt="Original" className="side-img" />
                      </div>
                      <div className="side-box">
                        <div className="side-box-label mono text-xs text-cyan">Live Grad-CAM Attribution</div>
                        <img src={analysisResult.grad_cam_image} alt="Grad-CAM" className="side-canvas" />
                      </div>
                    </div>
                  ) : (
                    <div className="blended-viewport">
                      <img 
                        src={analysisResult.grad_cam_image} 
                        alt="Live Grad-CAM Heatmap" 
                        className="blended-canvas" 
                        style={{ opacity }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* CASE 3: DEMO MODE Simulated Canvas */
                <>
                  {viewMode === 'split' && (
                    <div 
                      className="split-slider-viewport"
                      onMouseMove={handleSliderMove}
                      onTouchMove={handleSliderMove}
                    >
                      <img src={imageUrl} alt="Original Scan" className="split-layer-base" />
                      <div 
                        className="split-layer-overlay"
                        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                      >
                        <canvas ref={canvasRef} width={512} height={512} className="split-canvas" />
                      </div>
                      <div className="split-wiper-line" style={{ left: `${sliderPosition}%` }}>
                        <div className="wiper-handle">
                          <div className="wiper-arrow-left">&#9664;</div>
                          <div className="wiper-arrow-right">&#9654;</div>
                        </div>
                      </div>
                      <div className="split-label-left mono text-xs">Original Scan</div>
                      <div className="split-label-right mono text-xs text-cyan">Grad-CAM (Demo)</div>
                    </div>
                  )}

                  {viewMode === 'side-by-side' && (
                    <div className="side-by-side-viewport">
                      <div className="side-box">
                        <div className="side-box-label mono text-xs">1. Original Image</div>
                        <img src={imageUrl} alt="Original Scan" className="side-img" />
                      </div>
                      <div className="side-box">
                        <div className="side-box-label mono text-xs text-cyan">2. Grad-CAM (Demo Projection)</div>
                        <canvas ref={sideCanvasRef} width={512} height={512} className="side-canvas" />
                      </div>
                    </div>
                  )}

                  {viewMode === 'blend' && (
                    <div className="blended-viewport">
                      <canvas ref={canvasRef} width={512} height={512} className="blended-canvas" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Viewer Controls Toolbar (shown in Demo or when real Grad-CAM image is present) */}
            {(hasRealGradcam || isDemo) && (
              <div className="viewer-toolbar">
                <div className="control-group">
                  <span className="control-label mono text-xs">
                    <Sliders size={13} className="text-cyan" /> Heatmap Opacity: {Math.round(opacity * 100)}%
                  </span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={opacity} 
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="custom-range-slider"
                  />
                </div>

                {isDemo && (
                  <div className="control-group">
                    <span className="control-label mono text-xs">Colormap:</span>
                    <div className="btn-toggle-group">
                      <button 
                        className={`toggle-sub-btn ${colormap === 'jet' ? 'active' : ''}`}
                        onClick={() => setColormap('jet')}
                      >
                        Jet
                      </button>
                      <button 
                        className={`toggle-sub-btn ${colormap === 'turbo' ? 'active' : ''}`}
                        onClick={() => setColormap('turbo')}
                      >
                        Turbo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: In-Depth Explanation & Model Rationale */}
          <div className="xai-explanation-sidebar">
            {/* Primary Finding Card */}
            <div className="xai-card glass-panel">
              <div className="xai-card-header">
                <div className="header-icon-box">
                  <Sparkles size={20} className="text-cyan" />
                </div>
                <div>
                  <span className="text-xs text-muted mono uppercase">Focused Abnormality</span>
                  <h3 className="xai-finding-title">{currentAbnormality.name}</h3>
                </div>
              </div>

              <div className="finding-meta-row mt-3">
                <div className="meta-box">
                  <span className="lbl text-muted text-xs">Model Confidence</span>
                  <span className="val mono text-lg text-cyan font-bold">
                    {(typeof currentAbnormality.confidence === 'number' ? currentAbnormality.confidence : 0).toFixed(1)}%
                  </span>
                </div>
                <div className="meta-box">
                  <span className="lbl text-muted text-xs">Disease Stage</span>
                  <span className="val text-sm font-semibold text-primary">
                    {currentAbnormality.stage || analysisResult?.diseaseStage || 'Not available'}
                  </span>
                </div>
              </div>

              {/* Affected Anatomical Region */}
              <div className="anatomical-site-box mt-4">
                <span className="site-lbl mono text-xs uppercase text-cyan">
                  Affected Anatomical Region:
                </span>
                <div className="site-val font-semibold text-primary mt-1">
                  {currentAbnormality.region || currentAbnormality.affectedRegion || 'Not specified'}
                </div>
              </div>

              {/* Why the Model Made the Prediction */}
              <div className="reasoning-box mt-4">
                <span className="reasoning-lbl mono text-xs uppercase text-cyan">
                  Simple Explanation of Prediction:
                </span>
                <p className="reasoning-text text-sm text-secondary mt-1">
                  {currentAbnormality.clinicalReasoning || (
                    isDemo 
                      ? 'Simulated feature activation in DenseNet121 final block highlights salient anatomical morphology.'
                      : 'The neural network focused its gradient attention on specific radiological patterns corresponding to this class.'
                  )}
                </p>
              </div>
            </div>

            {/* Grad-CAM Theory & Formula Box */}
            <div className="xai-card glass-panel tech-formula-card">
              <h4 className="formula-card-title mono text-xs uppercase text-cyan">
                Grad-CAM Mathematical Foundation
              </h4>
              <p className="formula-desc text-xs text-secondary mt-1">
                Calculates gradient weights for class $c$ on feature maps $A^k$ of DenseNet121:
              </p>
              
              <div className="formula-display mono text-xs">
                {"α_k^c = (1/Z) ∑_i ∑_j (∂y^c / ∂A_{i,j}^k)"}
                <br />
                {"L_{Grad-CAM}^c = ReLU( ∑_k α_k^c A^k )"}
              </div>

              <div className="formula-footer text-xs text-muted mt-2">
                <CheckCircle2 size={13} className="text-normal inline mr-1" />
                Target layer: <code>conv5_block16_2_conv</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
