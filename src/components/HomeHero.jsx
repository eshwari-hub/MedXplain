import React, { useState } from 'react';
import { 
  ArrowRight, 
  Brain, 
  Activity, 
  Bone, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Eye, 
  ChevronRight,
  Zap,
  BarChart3
} from 'lucide-react';
import { SUPPORTED_ORGANS } from '../data/sampleData';

export function HomeHero({ onNavigate, onLoadPreset }) {
  const [selectedOrganTab, setSelectedOrganTab] = useState('brain');

  const activeOrganData = SUPPORTED_ORGANS.find(o => o.id === selectedOrganTab) || SUPPORTED_ORGANS[0];

  return (
    <section className="hero-section">
      <div className="container hero-container">
        {/* Top Research Badge */}
        <div className="hero-badge-wrapper">
          <div className="badge badge-cyan hero-research-badge">
            <Sparkles size={13} className="spin-slow" />
            <span>Final-Year AIML Project • Explainable Medical Deep Learning</span>
          </div>
        </div>

        {/* Main Title & Subtitle */}
        <div className="hero-content">
          <h1 className="hero-title">
            Explainable AI-Based <span className="gradient-text">Multi-Label Detection</span> of Abnormalities Across <span className="gradient-text-cyan">Multiple Body Organs</span> from Medical Images
          </h1>
          
          <p className="hero-description">
            An advanced clinical artificial intelligence framework leveraging <strong>DenseNet121</strong> with multi-label probability modeling and <strong>Grad-CAM</strong> visual interpretability. Accurately identifies co-occurring pathologies across three distinct anatomical systems: <strong>Brain, Chest, and Bone</strong>.
          </p>

          {/* Action CTAs */}
          <div className="hero-cta-group">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => onNavigate('upload')}
              id="hero-analyze-btn"
            >
              <Zap size={18} />
              <span>Analyze Medical Image</span>
              <ArrowRight size={18} />
            </button>

            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => {
                const el = document.getElementById('workflow-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else onNavigate('workflow');
              }}
              id="hero-how-it-works-btn"
            >
              <Cpu size={18} />
              <span>How It Works</span>
            </button>

            <button
              className="btn btn-glass btn-lg hero-quick-demo"
              onClick={() => onLoadPreset('brain')}
              title="Instantly analyze a Brain MRI case"
            >
              <Eye size={18} />
              <span>Quick Demo</span>
            </button>
          </div>

          {/* Key Metric Highlights */}
          <div className="hero-metrics-row">
            <div className="hero-metric-item">
              <div className="metric-val mono">3 Organs</div>
              <div className="metric-lbl">Brain • Chest • Bone</div>
            </div>
            <div className="metric-divider" />
            <div className="hero-metric-item">
              <div className="metric-val mono">DenseNet121</div>
              <div className="metric-lbl">Multi-Label Backbone</div>
            </div>
            <div className="metric-divider" />
            <div className="hero-metric-item">
              <div className="metric-val mono">Grad-CAM</div>
              <div className="metric-lbl">Visual Interpretability</div>
            </div>
            <div className="metric-divider" />
            <div className="hero-metric-item">
              <div className="metric-val mono">&gt; 96.2%</div>
              <div className="metric-lbl">Mean Test AUROC</div>
            </div>
          </div>
        </div>

        {/* Centerpiece Visual: 3D Holographic AI Medical Console */}
        <div className="hero-visual-wrapper">
          <div className="hero-visual-card glass-panel">
            {/* Visual Header HUD */}
            <div className="visual-card-hud">
              <div className="hud-status">
                <span className="pulse-dot" />
                <span className="mono text-xs">NEURAL INFERENCE ENGINE: ONLINE</span>
              </div>
              <div className="hud-tags">
                <span className="hud-badge mono">XAI_CAM_V2.4</span>
                <span className="hud-badge mono">FP32 TENSOR</span>
              </div>
            </div>

            {/* Main Visual Display */}
            <div className="visual-image-container">
              <img 
                src="/assets/hero-medical-ai.jpg" 
                alt="Explainable AI Multi-Organ Medical Detection Console" 
                className="hero-main-img" 
              />
              <div className="scanline-overlay" />
              
              {/* Interactive Target Reticles for the 3 Organs */}
              <div className="organ-reticles-overlay">
                <div 
                  className={`organ-reticle-node brain-node ${selectedOrganTab === 'brain' ? 'active' : ''}`}
                  onClick={() => setSelectedOrganTab('brain')}
                >
                  <div className="reticle-ring" />
                  <div className="reticle-core"><Brain size={14} /></div>
                  <div className="reticle-tooltip">
                    <span className="font-semibold">Brain MRI</span>
                    <span className="text-xs text-cyan">Glioma / Edema Detection</span>
                  </div>
                </div>

                <div 
                  className={`organ-reticle-node chest-node ${selectedOrganTab === 'chest' ? 'active' : ''}`}
                  onClick={() => setSelectedOrganTab('chest')}
                >
                  <div className="reticle-ring" />
                  <div className="reticle-core"><Activity size={14} /></div>
                  <div className="reticle-tooltip">
                    <span className="font-semibold">Chest X-Ray</span>
                    <span className="text-xs text-cyan">Effusion / Cardiomegaly</span>
                  </div>
                </div>

                <div 
                  className={`organ-reticle-node bone-node ${selectedOrganTab === 'bone' ? 'active' : ''}`}
                  onClick={() => setSelectedOrganTab('bone')}
                >
                  <div className="reticle-ring" />
                  <div className="reticle-core"><Bone size={14} /></div>
                  <div className="reticle-tooltip">
                    <span className="font-semibold">Bone X-Ray</span>
                    <span className="text-xs text-cyan">Fracture / Dislocation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Organ Spec Bar at bottom of card */}
            <div className="visual-card-footer">
              <div className="organ-selector-tabs">
                <span className="text-xs text-muted font-mono uppercase">Inspect Scope:</span>
                {SUPPORTED_ORGANS.map((organ) => {
                  const Icon = organ.id === 'brain' ? Brain : organ.id === 'chest' ? Activity : Bone;
                  return (
                    <button
                      key={organ.id}
                      className={`organ-tab-btn ${selectedOrganTab === organ.id ? 'active' : ''}`}
                      onClick={() => setSelectedOrganTab(organ.id)}
                    >
                      <Icon size={14} />
                      <span>{organ.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Organ Mini Details */}
              <div className="active-organ-hud-snippet">
                <div className="snippet-left">
                  <div className="snippet-title">{activeOrganData.fullName}</div>
                  <div className="snippet-desc text-xs">{activeOrganData.modality}</div>
                </div>
                <div className="snippet-right">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onLoadPreset(activeOrganData.id)}
                  >
                    <span>Test {activeOrganData.name} Preset</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
