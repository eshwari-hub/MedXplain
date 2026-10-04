import React, { useState } from 'react';
import { 
  History, 
  Brain, 
  Activity, 
  Bone, 
  Clock, 
  Eye, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export function HistoryView({ historyList, onSelectHistoryItem, onClearHistory }) {
  const [filterOrgan, setFilterOrgan] = useState('all');

  const filteredHistory = historyList.filter(item => {
    if (filterOrgan === 'all') return true;
    return item.organ?.toLowerCase() === filterOrgan.toLowerCase();
  });

  const getOrganIcon = (organ) => {
    switch (organ?.toLowerCase()) {
      case 'brain': return <Brain size={16} className="text-sky" />;
      case 'chest': return <Activity size={16} className="text-cyan" />;
      case 'bone': return <Bone size={16} className="text-blue" />;
      default: return <Activity size={16} />;
    }
  };

  const getTriageBadge = (triage) => {
    const t = triage?.toLowerCase() || '';
    if (t.includes('urgent') || t.includes('critical')) {
      return <span className="badge badge-urgent"><AlertTriangle size={11} /> Urgent</span>;
    }
    if (t.includes('action') || t.includes('positive')) {
      return <span className="badge badge-warning"><AlertTriangle size={11} /> Positive</span>;
    }
    return <span className="badge badge-normal"><CheckCircle2 size={11} /> Clear</span>;
  };

  return (
    <section className="section history-section" id="history-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <History size={14} />
            <span>Audit Trail & Retrospective Inferences</span>
          </div>
          <h2 className="section-title">
            Analysis <span className="gradient-text">History & Logs</span>
          </h2>
          <p className="section-desc">
            Review previous multi-organ deep learning diagnostic runs, review findings, and reload past Grad-CAM activation sessions.
          </p>
        </div>

        {/* Filter Bar & Controls */}
        <div className="history-filter-bar glass-card-static">
          <div className="filter-group">
            <Filter size={15} className="text-cyan" />
            <span className="mono text-xs uppercase text-muted">Filter By Organ:</span>
            
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterOrgan === 'all' ? 'active' : ''}`}
                onClick={() => setFilterOrgan('all')}
              >
                All Organs ({historyList.length})
              </button>
              <button 
                className={`filter-btn ${filterOrgan === 'brain' ? 'active' : ''}`}
                onClick={() => setFilterOrgan('brain')}
              >
                <Brain size={13} /> Brain
              </button>
              <button 
                className={`filter-btn ${filterOrgan === 'chest' ? 'active' : ''}`}
                onClick={() => setFilterOrgan('chest')}
              >
                <Activity size={13} /> Chest
              </button>
              <button 
                className={`filter-btn ${filterOrgan === 'bone' ? 'active' : ''}`}
                onClick={() => setFilterOrgan('bone')}
              >
                <Bone size={13} /> Bone
              </button>
            </div>
          </div>

          <div className="history-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onClearHistory}
              title="Reset history to defaults"
            >
              <Trash2 size={14} />
              <span>Reset History</span>
            </button>
          </div>
        </div>

        {/* History Table / Cards */}
        {filteredHistory.length === 0 ? (
          <div className="history-empty-card glass-panel">
            <Clock size={40} className="text-muted mb-2" />
            <h3>No historical records found</h3>
            <p className="text-xs text-muted">No runs found for filter "{filterOrgan}".</p>
          </div>
        ) : (
          <div className="history-table-wrapper glass-panel">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Date & Time</th>
                  <th>Organ</th>
                  <th>Detected Abnormalities</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="history-row">
                    {/* Thumbnail preview */}
                    <td className="thumb-cell">
                      <div className="history-thumb-box">
                        <img 
                          src={item.imagePreview || '/assets/brain-sample.jpg'} 
                          alt={item.organ} 
                          className="history-thumb-img" 
                        />
                      </div>
                    </td>

                    {/* Date */}
                    <td className="date-cell mono text-xs">
                      <div className="flex items-center gap-1 text-muted">
                        <Clock size={12} className="text-cyan" />
                        <span>{item.date}</span>
                      </div>
                      <span className="file-subname text-xs text-muted truncate max-w-[140px] block">
                        {item.fileName}
                      </span>
                    </td>

                    {/* Organ */}
                    <td className="organ-cell">
                      <span className="organ-history-pill">
                        {getOrganIcon(item.organ)}
                        <span className="font-semibold">{item.organ}</span>
                      </span>
                    </td>

                    {/* Abnormalities */}
                    <td className="abnormalities-cell">
                      <div className="abnormalities-tags-wrap">
                        {Array.isArray(item.abnormalities) ? (
                          item.abnormalities.map((abn, i) => (
                            <span key={i} className="abn-chip mono text-xs">
                              {typeof abn === 'string' ? abn : abn.name}
                            </span>
                          ))
                        ) : (
                          <span className="abn-chip mono text-xs">{item.abnormalities}</span>
                        )}
                      </div>
                    </td>

                    {/* Primary Confidence */}
                    <td className="confidence-cell mono font-bold text-cyan">
                      {item.primaryConfidence}
                    </td>

                    {/* Status / Triage */}
                    <td className="status-cell">
                      {getTriageBadge(item.triage || item.status)}
                    </td>

                    {/* Action: View Results */}
                    <td className="action-cell">
                      <button 
                        className="btn btn-primary btn-sm view-history-btn"
                        onClick={() => onSelectHistoryItem(item)}
                        title="Load this scan into Results & Grad-CAM viewer"
                      >
                        <Eye size={14} />
                        <span>View Results</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
