import React from 'react';
import { Brain, Activity, Bone, CheckCircle2, ArrowRight, ShieldAlert, Cpu, BarChart2 } from 'lucide-react';
import { SUPPORTED_ORGANS } from '../data/sampleData';

export function OrganScope({ onSelectOrgan, onLoadPreset }) {
  const getOrganIcon = (id) => {
    switch (id) {
      case 'brain': return <Brain className="organ-icon-lg" size={28} />;
      case 'chest': return <Activity className="organ-icon-lg" size={28} />;
      case 'bone': return <Bone className="organ-icon-lg" size={28} />;
      default: return <Activity size={28} />;
    }
  };

  return (
    <section className="section organ-scope-section" id="organs-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Cpu size={14} />
            <span>Multi-Anatomical Diagnostic Architecture</span>
          </div>
          <h2 className="section-title">
            Three Dedicated <span className="gradient-text">Organ Pipelines</span>
          </h2>
          <p className="section-desc">
            Unlike single-task chest models, MEDIC-XAI features an organ-agnostic routing framework capable of detecting abnormalities across <strong>Brain MRI</strong>, <strong>Chest Radiography</strong>, and <strong>Musculoskeletal Bone X-Rays</strong>.
          </p>
        </div>

        {/* 3 Organ Cards Grid */}
        <div className="organ-cards-grid">
          {SUPPORTED_ORGANS.map((organ) => {
            return (
              <div key={organ.id} className="organ-card glass-panel">
                {/* Organ Header */}
                <div className="organ-card-header">
                  <div className={`organ-icon-wrapper ${organ.id}`}>
                    {getOrganIcon(organ.id)}
                  </div>
                  <div className="organ-header-meta">
                    <span className="organ-subhead mono">{organ.modality.split('(')[0]}</span>
                    <h3 className="organ-name">{organ.name} Imaging</h3>
                  </div>
                </div>

                {/* Organ Sample Preview Image */}
                <div className="organ-card-image-box">
                  <img src={organ.sampleImage} alt={`${organ.name} scan`} className="organ-card-thumb" />
                  <div className="organ-badge-floating mono">
                    <span className="pulse-dot" />
                    <span>DenseNet121 • {organ.technicalMetrics?.denseNetAUROC || '0.96'} AUC</span>
                  </div>
                </div>

                {/* Description */}
                <p className="organ-card-desc">
                  {organ.description}
                </p>

                {/* Detectable Pathologies */}
                <div className="organ-pathologies-group">
                  <div className="group-label font-mono text-xs uppercase text-cyan">
                    Supported Multi-Label Pathologies:
                  </div>
                  <div className="pathologies-pill-list">
                    {organ.pathologies.map((path, idx) => (
                      <div key={idx} className="pathology-pill">
                        <span className="path-bullet" />
                        <span className="path-name">{path.name}</span>
                        <span className={`path-severity ${path.severity.toLowerCase().replace(/\s+/g, '-')}`}>
                          {path.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Benchmarks */}
                <div className="organ-tech-benchmarks">
                  <div className="benchmark-stat">
                    <span className="stat-label">Sensitivity</span>
                    <span className="stat-val mono text-cyan">{organ.technicalMetrics?.sensitivity || '94%'}</span>
                  </div>
                  <div className="benchmark-stat">
                    <span className="stat-label">Specificity</span>
                    <span className="stat-val mono">{organ.technicalMetrics?.specificity || '95%'}</span>
                  </div>
                  <div className="benchmark-stat">
                    <span className="stat-label">CAM Layer</span>
                    <span className="stat-val mono text-xs">conv5_b16</span>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="organ-card-actions">
                  <button 
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => onLoadPreset(organ.id)}
                  >
                    <span>Analyze {organ.name} Case</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
