import React from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Search, 
  Activity, 
  Eye, 
  Terminal, 
  Zap, 
  ArrowRight,
  Filter,
  BarChart2
} from 'lucide-react';

export function AnalysisWorkflow({ isAnalyzing, currentStage, currentStepName, progressPercent }) {
  const steps = [
    {
      step: 1,
      title: 'Image Preprocessing',
      tag: 'Step 1 • Normalization',
      icon: Filter,
      description: 'CLAHE adaptive histogram equalization, pixel intensity normalization to [0, 1], and bilinear resizing to 224×224×3 tensor.',
      technical: 'cv2.createCLAHE(clipLimit=2.0) • Standardization (ImageNet μ, σ)'
    },
    {
      step: 2,
      title: 'Organ Detection',
      tag: 'Step 2 • Anatomical Routing',
      icon: Search,
      description: 'Automated organ triage routing image features to Brain MRI, Chest Radiography, or Musculoskeletal Bone pipelines with anatomical validation.',
      technical: 'Cross-entropy confidence threshold > 0.95 • Anatomical Landmarking'
    },
    {
      step: 3,
      title: 'Feature Extraction',
      tag: 'Step 3 • Deep Convolutions',
      icon: Layers,
      description: 'DenseNet121 architecture with 121 layers and dense connectivity, iteratively concatenating feature maps across 4 dense blocks and transition layers.',
      technical: 'DenseNet121 Backbone • 7.04M Parameters • 1024-d Feature Vector'
    },
    {
      step: 4,
      title: 'Abnormality Detection',
      tag: 'Step 4 • Multi-Label Sigmoid',
      icon: Activity,
      description: 'Multi-label classification head computing independent sigmoid probability scores for co-occurring pathologies without mutual exclusivity.',
      technical: 'Binary Cross-Entropy with Logits • Independent Decision Thresholds'
    },
    {
      step: 5,
      title: 'Grad-CAM Explainability',
      tag: 'Step 5 • Interpretability Map',
      icon: Eye,
      description: 'Gradient backpropagation through target layer conv5_block16_2_conv to compute activation weights and generate localized visual heatmaps.',
      technical: 'L_Grad-CAM = ReLU(∑ α_k A_k) • Jet/Turbo 224×224 Colormap Projection'
    }
  ];

  return (
    <section className="section workflow-section" id="workflow-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Cpu size={14} />
            <span>End-to-End Deep Learning Architecture</span>
          </div>
          <h2 className="section-title">
            Deep Learning <span className="gradient-text">Processing Workflow</span>
          </h2>
          <p className="section-desc">
            The end-to-end multi-organ diagnostic pipeline routes the medical scan through five rigorous deep learning and explainability stages.
          </p>
        </div>

        {/* Live Processing Telemetry Bar (Shown when actively analyzing) */}
        {isAnalyzing && (
          <div className="live-analysis-banner glass-panel">
            <div className="live-banner-header">
              <div className="banner-left">
                <span className="pulse-dot" />
                <span className="mono font-semibold text-cyan">
                  INFERENCE PIPELINE ACTIVE: {currentStepName}
                </span>
              </div>
              <div className="banner-right mono text-xs text-muted">
                STAGE {currentStage} OF 5 • {progressPercent}%
              </div>
            </div>

            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="live-telemetry-console mono text-xs">
              <div className="console-line text-muted">
                <Terminal size={12} className="inline mr-1 text-cyan" />
                [SYSTEM] Initialized DenseNet121 PyTorch/TensorFlow graph runtime...
              </div>
              <div className="console-line text-cyan">
                &gt;&gt; Executing {currentStepName} ...
              </div>
            </div>
          </div>
        )}

        {/* 5-Step Pipeline Flow */}
        <div className="workflow-steps-track">
          {steps.map((st) => {
            const isCompleted = isAnalyzing ? currentStage > st.step : false;
            const isActive = isAnalyzing ? currentStage === st.step : false;
            const Icon = st.icon;

            return (
              <div 
                key={st.step} 
                className={`workflow-step-node glass-panel ${isActive ? 'active-step' : ''} ${isCompleted ? 'completed-step' : ''}`}
              >
                <div className="step-node-header">
                  <div className="step-icon-badge">
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="text-normal" />
                    ) : (
                      <Icon size={20} className={isActive ? 'text-cyan spin-pulse' : 'text-muted'} />
                    )}
                  </div>
                  <span className="step-number mono">0{st.step}</span>
                </div>

                <div className="step-meta">
                  <span className="step-tag-pill mono">{st.tag}</span>
                  <h3 className="step-title">{st.title}</h3>
                  <p className="step-desc">{st.description}</p>
                </div>

                <div className="step-tech-box mono text-xs">
                  <span className="text-muted">Spec: </span>
                  <span className="text-cyan">{st.technical}</span>
                </div>

                {/* Connecting arrow line */}
                {st.step < 5 && (
                  <div className="step-connector-arrow">
                    <ArrowRight size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
