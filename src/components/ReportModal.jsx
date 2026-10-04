import React from 'react';
import { X, Printer, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export function ReportModal({ isOpen, onClose, analysisResult }) {
  if (!isOpen || !analysisResult) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDemo = analysisResult.isDemoMode || analysisResult.source === 'demo-simulation';
  const organ = analysisResult.organ || analysisResult.organName || 'Medical Imaging';
  const modality = analysisResult.modality || 'Medical Imaging';
  const xaiMethod = analysisResult.xai_method || 'Grad-CAM';
  const stage = analysisResult.diseaseStage || analysisResult.abnormalities?.find(a => a.stage)?.stage || 'Not available';
  const analysisDate = analysisResult.analyzedAt ? new Date(analysisResult.analyzedAt).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel report-modal-container">
        <div className="modal-header no-print">
          <div className="modal-title-group">
            <FileText size={20} className="text-cyan" />
            <h3 className="modal-title">Clinical AI Model Diagnostic Summary</h3>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="printable-report-sheet" id="printable-report">
          <div className="report-doc-header">
            <div className="report-brand">
              <h2 className="report-main-title">MEDIC-XAI EVALUATION REPORT</h2>
              <div className="report-sub-title">
                Explainable Multi-Label Deep Learning System
              </div>
            </div>
            <div className="report-meta-box mono text-xs">
              <div><strong>Execution:</strong> {isDemo ? 'DEMO MODE — Simulated Results' : 'LIVE MODEL'}</div>
              <div><strong>Analysis Date:</strong> {analysisDate}</div>
              <div><strong>XAI Method:</strong> {xaiMethod}</div>
            </div>
          </div>

          <div className="report-divider" />

          {/* Imaging Spec Section */}
          <div className="report-section-grid">
            <div className="report-meta-block">
              <span className="block-title">Imaging & Modality</span>
              <div className="block-content">
                <strong>Detected Organ:</strong> {organ}<br />
                <strong>Modality:</strong> {modality}<br />
                <strong>File:</strong> {analysisResult.fileName || 'scan_input'} ({analysisResult.fileSize || 'N/A'})
              </div>
            </div>

            <div className="report-meta-block">
              <span className="block-title">Staging & Status</span>
              <div className="block-content">
                <strong>Stage:</strong> {stage}<br />
                <strong>XAI Method:</strong> {xaiMethod}<br />
                <strong>Processing Latency:</strong> {analysisResult.processing_time !== undefined ? `${analysisResult.processing_time} s` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Multi-Label Findings Table */}
          <div className="report-findings-section mt-4">
            <h4 className="findings-title">Detected Abnormalities</h4>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Pathology / Label</th>
                  <th>Confidence</th>
                  <th>Stage</th>
                  <th>Target Region</th>
                </tr>
              </thead>
              <tbody>
                {(!analysisResult.abnormalities || analysisResult.abnormalities.length === 0) ? (
                  <tr>
                    <td colSpan="4" className="text-muted text-center">No abnormalities detected.</td>
                  </tr>
                ) : (
                  analysisResult.abnormalities.map((abn, i) => {
                    const confVal = typeof abn.confidence === 'number' ? abn.confidence : 0;
                    return (
                      <tr key={i}>
                        <td><strong>{abn.name}</strong></td>
                        <td className="mono">{confVal.toFixed(1)}%</td>
                        <td>{abn.stage || 'Not available'}</td>
                        <td>{abn.region || abn.affectedRegion || 'Not specified'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Grad-CAM Interpretability Section */}
          <div className="report-gradcam-section mt-4">
            <h4 className="findings-title">Explainable AI (Grad-CAM) Visual Evidence</h4>
            <div className="report-gradcam-body">
              {analysisResult.grad_cam_image ? (
                <div className="report-thumb-box">
                  <img 
                    src={analysisResult.grad_cam_image} 
                    alt="Grad-CAM Activation" 
                    className="report-img" 
                  />
                </div>
              ) : (
                <div className="report-thumb-box-empty text-xs text-muted p-3 bg-gray-100 rounded border">
                  Grad-CAM will appear here after model analysis.
                </div>
              )}
              <div className="report-xai-narrative text-xs">
                <p>
                  <strong>XAI Method:</strong> {xaiMethod}
                </p>
                <p className="mt-1">
                  <strong>Anatomical Region:</strong> {analysisResult.abnormalities?.[0]?.region || analysisResult.abnormalities?.[0]?.affectedRegion || 'Not specified'}
                </p>
                <p className="mt-1">
                  <strong>Decision Rationale:</strong><br />
                  {analysisResult.abnormalities?.[0]?.clinicalReasoning || 'Salient gradient activations mapped to target pathological regions.'}
                </p>
              </div>
            </div>
          </div>

          {/* Research Prototype Disclaimer */}
          <div className="report-disclaimer-box mt-6">
            <p className="text-xs text-muted">
              <strong>ACADEMIC RESEARCH NOTICE:</strong> This diagnostic report is generated by the MEDIC-XAI machine-learning research framework for academic project evaluation. All predictions are generated by artificial intelligence and must be reviewed alongside certified radiological judgment.
            </p>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
