import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  Code2, 
  Database, 
  Server, 
  Eye, 
  Terminal, 
  GitBranch, 
  Share2, 
  Zap, 
  CheckCircle2,
  FileCode,
  BarChart3,
  Sliders
} from 'lucide-react';
import { TECHNOLOGIES_LIST, MODEL_EVALUATION_METRICS } from '../data/sampleData';

export function TechnologyView({ onOpenBackendModal }) {
  const [selectedTech, setSelectedTech] = useState(TECHNOLOGIES_LIST[2]); // DenseNet121 default

  return (
    <section className="section tech-section" id="technology-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Cpu size={14} />
            <span>Research & Engineering Stack</span>
          </div>
          <h2 className="section-title">
            Underlying <span className="gradient-text">Technologies & Performance</span>
          </h2>
          <p className="section-desc">
            The project pairs high-efficiency deep convolutional representations with mathematical explainability protocols and a scalable Python Flask inference backend.
          </p>
        </div>

        {/* =========================================================================
            MODEL PERFORMANCE SECTION: Model Evaluation Metrics
            (Clearly separated from individual scan results)
           ========================================================================= */}
        <div className="model-metrics-panel glass-panel mb-8">
          <div className="metrics-panel-header">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-cyan" />
              <h3 className="text-lg font-bold text-primary">Model Evaluation Metrics</h3>
            </div>
            <span className="badge badge-warning text-xs mono">
              {MODEL_EVALUATION_METRICS.statusNote}
            </span>
          </div>
          <p className="text-xs text-secondary mt-1 mb-4">
            These metrics represent overall statistical performance evaluated on held-out test splits. 
            <strong> These are offline cohort benchmarks and are not individual scan predictions.</strong>
          </p>

          {/* Aggregate Metrics Grid */}
          <div className="model-metrics-grid">
            <div className="metric-score-card">
              <span className="metric-score-lbl">Mean Test ROC-AUC</span>
              <span className="metric-score-val mono text-cyan">{MODEL_EVALUATION_METRICS.overall.auc}</span>
              <span className="metric-score-sub text-xs text-muted">Area Under ROC Curve</span>
            </div>
            <div className="metric-score-card">
              <span className="metric-score-lbl">Macro F1-Score</span>
              <span className="metric-score-val mono text-primary">{MODEL_EVALUATION_METRICS.overall.f1Score}</span>
              <span className="metric-score-sub text-xs text-muted">Harmonic Mean (P & R)</span>
            </div>
            <div className="metric-score-card">
              <span className="metric-score-lbl">Macro Precision</span>
              <span className="metric-score-val mono text-primary">{MODEL_EVALUATION_METRICS.overall.precision}</span>
              <span className="metric-score-sub text-xs text-muted">Positive Predictive Value</span>
            </div>
            <div className="metric-score-card">
              <span className="metric-score-lbl">Macro Recall</span>
              <span className="metric-score-val mono text-primary">{MODEL_EVALUATION_METRICS.overall.recall}</span>
              <span className="metric-score-sub text-xs text-muted">Sensitivity / Hit Rate</span>
            </div>
          </div>

          {/* Organ-specific metric breakdown */}
          <div className="organ-benchmarks-row mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 justify-between">
            {Object.entries(MODEL_EVALUATION_METRICS.organs).map(([key, organ]) => (
              <div key={key} className="organ-benchmark-subcard flex-1 min-w-[200px] bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span className="font-semibold text-xs text-cyan block mb-1">{organ.name}</span>
                <div className="text-xs text-secondary flex justify-between">
                  <span>AUC: <strong className="text-primary font-mono">{organ.auc}</strong></span>
                  <span>F1: <strong className="text-primary font-mono">{organ.f1Score}</strong></span>
                  <span>Prec: <strong className="text-primary font-mono">{organ.precision}</strong></span>
                  <span>Rec: <strong className="text-primary font-mono">{organ.recall}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DenseNet121 & Multi-Label Pipeline Diagram Card */}
        <div className="architecture-diagram-card glass-panel mb-8">
          <div className="arch-header">
            <div className="arch-title-group">
              <Layers size={18} className="text-cyan" />
              <h3 className="arch-title">DenseNet121 Multi-Organ Deep Learning Pipeline</h3>
            </div>
            <span className="badge badge-cyan mono text-xs">Target Layer: conv5_block16_2_conv</span>
          </div>

          <div className="arch-diagram-flow">
            {/* Stage 1: Input */}
            <div className="arch-node">
              <div className="node-box">
                <span className="node-tag">Input Scan</span>
                <span className="node-val mono">224 × 224 × 3</span>
                <span className="node-sub">Brain / Chest / Bone</span>
              </div>
            </div>

            <div className="arch-flow-arrow">&rarr;</div>

            {/* Stage 2: Initial Conv & Pool */}
            <div className="arch-node">
              <div className="node-box">
                <span className="node-tag">Initial Layer</span>
                <span className="node-val mono">7×7 Conv, St 2</span>
                <span className="node-sub">3×3 MaxPool</span>
              </div>
            </div>

            <div className="arch-flow-arrow">&rarr;</div>

            {/* Stage 3: Dense Blocks 1-4 */}
            <div className="arch-node highlight">
              <div className="node-box">
                <span className="node-tag text-cyan">Dense Blocks (1-4)</span>
                <span className="node-val mono">121 Layers</span>
                <span className="node-sub">Dense Connectivity</span>
              </div>
            </div>

            <div className="arch-flow-arrow">&rarr;</div>

            {/* Stage 4: Feature Vector */}
            <div className="arch-node">
              <div className="node-box">
                <span className="node-tag">Pooling</span>
                <span className="node-val mono">Global Avg Pool</span>
                <span className="node-sub">1024-d Tensor</span>
              </div>
            </div>

            <div className="arch-flow-arrow">&rarr;</div>

            {/* Stage 5: Dual Output Branches */}
            <div className="arch-node dual-branch">
              <div className="node-box branch-box branch-top">
                <span className="node-tag text-cyan">Multi-Label Head</span>
                <span className="node-val mono">Sigmoid(z_i)</span>
                <span className="node-sub">Co-occurring Pathologies</span>
              </div>
              <div className="node-box branch-box branch-bottom">
                <span className="node-tag text-amber">Grad-CAM XAI</span>
                <span className="node-val mono">ReLU(∑ α_k A^k)</span>
                <span className="node-sub">Backpropagated Heatmaps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid of Actual Project Technologies */}
        <div className="tech-cards-grid">
          {TECHNOLOGIES_LIST.map((tech) => (
            <div 
              key={tech.name} 
              className={`tech-card glass-panel ${selectedTech.name === tech.name ? 'selected-tech' : ''}`}
              onClick={() => setSelectedTech(tech)}
            >
              <div className="tech-card-top">
                <span className="badge badge-cyan mono text-xs">{tech.badge}</span>
                <span className="tech-version mono text-xs text-muted">{tech.version}</span>
              </div>
              <h3 className="tech-name">{tech.name}</h3>
              <span className="tech-category mono text-xs text-cyan">{tech.category}</span>
              <p className="tech-desc text-xs mt-2">{tech.description}</p>
            </div>
          ))}
        </div>

        {/* Flask REST API Decoupling Banner */}
        <div className="flask-integration-banner glass-panel mt-8">
          <div className="banner-left">
            <Server size={28} className="text-cyan mb-2" />
            <h3 className="banner-title">Decoupled Flask Microservice Endpoint: <code>POST /api/analyze</code></h3>
            <p className="banner-desc text-xs text-secondary mt-1">
              Communicates with Flask via multipart <code>file</code> and optional <code>organ_mode</code>. Ready to connect to your real PyTorch / TensorFlow weights.
            </p>
          </div>
          <div className="banner-right">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onOpenBackendModal}
            >
              <Terminal size={14} />
              <span>View API Spec & Config</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
