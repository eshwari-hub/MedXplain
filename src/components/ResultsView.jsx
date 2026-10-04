import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Brain, 
  Activity, 
  Bone, 
  Eye, 
  Download, 
  FileText, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';

export function ResultsView({ analysisResult, onGoToGradcam, onOpenReportModal }) {
  if (!analysisResult) return null;

  const organName = analysisResult.organ || analysisResult.organName || 'Organ';
  const organId = (analysisResult.organId || organName).toLowerCase();

  const getOrganIcon = (id) => {
    switch (id) {
      case 'brain': return <Brain size={22} className="text-sky" />;
      case 'chest': return <Activity size={22} className="text-cyan" />;
      case 'bone': return <Bone size={22} className="text-blue" />;
      default: return <Activity size={22} className="text-cyan" />;
    }
  };

  const getTriageBadge = (triage) => {
    switch (triage?.toLowerCase()) {
      case 'urgent':
        return <span className="badge badge-urgent"><AlertTriangle size={12} /> Urgent Action</span>;
      case 'action required':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> Action Required</span>;
      case 'clear':
      case 'normal':
        return <span className="badge badge-normal"><CheckCircle2 size={12} /> Normal / Clear</span>;
      default:
        return <span className="badge badge-cyan"><CheckCircle2 size={12} /> Model Complete</span>;
    }
  };

  const getConfidenceColorClass = (conf) => {
    if (conf >= 80) return 'high-conf';
    if (conf >= 50) return 'med-conf';
    return 'low-conf';
  };

  const isDemo = analysisResult.isDemoMode || analysisResult.source === 'demo-simulation';

  // Disease stage resolution: optional, displays "Not available" if null
  const stageDisplay = analysisResult.diseaseStage || 
    (analysisResult.abnormalities?.find(a => a.stage)?.stage) || 
    'Not available';

  return (
    <section className="section results-section" id="results-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Cpu size={14} />
            <span>Multi-Label Diagnostic Inferences</span>
          </div>
          <h2 className="section-title">
            Analysis <span className="gradient-text">Results & Staging</span>
          </h2>
          <p className="section-desc">
            Deep learning inferences synthesized from the multi-label classification head and anatomical organ routing network.
          </p>
        </div>

        {/* Prominent ORGAN DETECTED Hero Card */}
        <div className="organ-detected-hero-banner glass-panel mb-6">
          <div className="organ-detected-hero-left">
            <div className="organ-detected-eyebrow mono">
              <span className="pulse-dot" />
              <span>ORGAN DETECTED</span>
            </div>
            <div className="organ-detected-title-row">
              <div className="organ-detected-icon-wrapper">
                {getOrganIcon(organId)}
              </div>
              <h1 className="organ-detected-title font-mono uppercase">
                {organName}
              </h1>
              <span className="organ-modality-badge mono">
                {analysisResult.modality || (organId === 'brain' ? 'MRI' : 'X-Ray')}
              </span>
            </div>
            <p className="organ-detected-explainer text-xs text-secondary mt-2">
              Automated routing identified scan as <strong>{organName}</strong>. Abnormality detection head strictly filtered to {organName} pathologies.
            </p>
          </div>

          <div className="organ-detected-hero-right">
            <div className="organ-confidence-meter-card">
              <span className="text-xs text-muted mono uppercase">Routing Confidence</span>
              <div className="organ-conf-number font-mono text-cyan text-3xl font-bold mt-1">
                {analysisResult.organConfidence 
                  ? (typeof analysisResult.organConfidence === 'number' 
                      ? `${analysisResult.organConfidence.toFixed(1)}%` 
                      : `${analysisResult.organConfidence}`)
                  : '95.0%'}
              </div>
              <div className="organ-conf-bar-track mt-2">
                <div 
                  className="organ-conf-bar-fill"
                  style={{ width: `${typeof analysisResult.organConfidence === 'number' ? Math.min(100, analysisResult.organConfidence) : 95}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="results-summary-banner glass-panel">
          <div className="summary-left">
            <div className="summary-organ-badge">
              {getOrganIcon(organId)}
              <div>
                <span className="text-xs text-muted font-mono uppercase">Detected Organ</span>
                <h3 className="summary-organ-title">
                  {organName} Imaging
                </h3>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="organ-confidence-pill mono" id="results-analysis-mode">
                <span>Routing Mode: </span>
                <strong className="text-cyan">AUTO DETECT</strong>
              </div>
              <div className="organ-confidence-pill mono text-xs">
                <span>Modality: </span>
                <strong className="text-sky">{analysisResult.modality || 'Medical Scan'}</strong>
              </div>
            </div>
          </div>

          <div className="summary-center">
            <div className="summary-status-group">
              <span className="text-xs text-muted font-mono uppercase">Execution Mode & Status</span>
              <div className="mt-1 flex items-center gap-2">
                {isDemo ? (
                  <span className="badge badge-warning font-bold">
                    <span className="pulse-dot warning" /> DEMO MODE — Simulated Results
                  </span>
                ) : (
                  <span className="badge badge-cyan font-bold">
                    <span className="pulse-dot" /> LIVE MODEL
                  </span>
                )}
                {getTriageBadge(analysisResult.triageLevel)}
              </div>
            </div>
          </div>

          <div className="summary-right">
            <button 
              className="btn btn-primary btn-sm"
              onClick={onGoToGradcam}
              id="view-gradcam-cta"
            >
              <Eye size={16} />
              <span>Inspect Grad-CAM</span>
              <ArrowUpRight size={16} />
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onOpenReportModal}
              id="export-report-btn"
            >
              <FileText size={16} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Results Details Grid */}
        <div className="results-grid">
          {/* Left Column: Multi-Label Abnormalities List */}
          <div className="results-column-left">
            <div className="results-card glass-panel">
              <div className="card-header-styled">
                <div>
                  <h3 className="card-title">
                    Detected Pathologies & Confidence
                  </h3>
                  <span className="mono text-xs text-muted">
                    Model Confidence (Class Probability Score)
                  </span>
                </div>
                <span className="badge badge-cyan mono text-xs">
                  {analysisResult.abnormalities?.length || 0} Class Inferences
                </span>
              </div>

              <div className="abnormalities-list">
                {(!analysisResult.abnormalities || analysisResult.abnormalities.length === 0) ? (
                  <div className="p-4 text-center text-muted text-sm">
                    No abnormalities identified by the model.
                  </div>
                ) : (
                  analysisResult.abnormalities.map((abn, idx) => {
                    const confVal = typeof abn.confidence === 'number' ? abn.confidence : 0;
                    const isPositive = confVal >= 50;
                    return (
                      <div 
                        key={abn.id || idx} 
                        className={`abnormality-result-card ${isPositive ? 'positive' : 'negative'}`}
                      >
                        <div className="abn-header">
                          <div className="abn-title-group">
                            <span className={`abn-status-indicator ${isPositive ? 'positive' : 'negative'}`} />
                            <h4 className="abn-name">{abn.name}</h4>
                          </div>
                          <div className="abn-confidence-num mono">
                            <span className="font-bold text-lg">{confVal.toFixed(1)}%</span>
                            <span className="text-xs text-muted block text-right font-normal">Confidence</span>
                          </div>
                        </div>

                        {/* Visual Confidence Meter Bar */}
                        <div className="abn-meter-track">
                          <div 
                            className={`abn-meter-fill ${getConfidenceColorClass(confVal)}`}
                            style={{ width: `${Math.min(100, Math.max(2, confVal))}%` }}
                          />
                          <div className="threshold-marker" style={{ left: '50%' }} title="50% Classification Threshold" />
                        </div>

                        <div className="abn-footer-meta">
                          <div className="abn-region-tag">
                            <span className="text-muted">Anatomical Region: </span>
                            <span className="text-cyan font-mono text-xs">
                              {abn.region || abn.affectedRegion || 'Not specified'}
                            </span>
                          </div>
                          <div className="abn-badge-status">
                            <span className={`badge ${isPositive ? 'badge-urgent' : 'badge-normal'}`}>
                              {abn.status || (isPositive ? 'Detected' : 'Normal Range')}
                            </span>
                          </div>
                        </div>

                        {/* Disease Stage if present on individual item */}
                        <div className="abn-stage-sub text-xs text-muted mt-1 flex justify-between">
                          <span>Stage: <strong className="text-primary">{abn.stage || 'Not available'}</strong></span>
                        </div>

                        {/* Clinical summary if available */}
                        {abn.clinicalReasoning && (
                          <p className="abn-clinical-note text-xs mt-2">
                            {abn.clinicalReasoning}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Disease Stage & Scan Metadata */}
          <div className="results-column-right">
            {/* Disease Stage Card */}
            <div className="results-card glass-panel">
              <div className="card-header-styled">
                <h3 className="card-title">Disease Stage</h3>
                <span className="badge badge-cyan mono text-xs">Optional Staging</span>
              </div>

              <div className="stage-highlight-box">
                <div className="stage-badge-indicator">
                  <TrendingUp size={20} className="text-cyan" />
                  <span className="stage-label mono uppercase text-xs">Evaluated Stage</span>
                </div>
                <div className="stage-value-title">
                  {stageDisplay}
                </div>
                <p className="stage-explanation text-xs text-secondary mt-2">
                  {stageDisplay === 'Not available' ? (
                    'Disease staging is not available or not applicable for this scan. The model only provides stage classification when clinically indicated and calibrated.'
                  ) : (
                    'Assessed based on lesion spatial footprint and pathological density variation.'
                  )}
                </p>
              </div>

              {/* Scan Metadata breakdown */}
              <div className="scan-metadata-table mt-4">
                <div className="meta-row">
                  <span className="meta-lbl">Scan Identifier:</span>
                  <span className="meta-val mono">{analysisResult.fileName}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-lbl">Detected Organ:</span>
                  <span className="meta-val mono">{organName}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-lbl">Modality:</span>
                  <span className="meta-val mono">{analysisResult.modality || 'Medical Imaging'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-lbl">Processing Latency:</span>
                  <span className="meta-val mono text-cyan">
                    {analysisResult.processing_time !== undefined ? `${analysisResult.processing_time} s` : `${analysisResult.pipelineLatencyMs || 0} ms`}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-lbl">XAI Protocol:</span>
                  <span className="meta-val mono">{analysisResult.xai_method || 'Grad-CAM'}</span>
                </div>
              </div>
            </div>

            {/* AI Explainability Action Box */}
            <div className="results-card glass-panel cta-xai-card">
              <div className="cta-xai-content">
                <div className="xai-icon-box">
                  <Eye size={28} className="text-cyan" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Explainable AI (Grad-CAM)</h4>
                  <p className="text-xs text-secondary mt-1">
                    Inspect the gradient activation localization to verify anatomical feature salience.
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-primary btn-sm w-full mt-3"
                onClick={onGoToGradcam}
              >
                <span>Launch Grad-CAM Diagnostic Workstation</span>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
