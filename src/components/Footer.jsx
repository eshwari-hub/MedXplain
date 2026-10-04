import React from 'react';
import { Activity, Brain, Bone, ShieldAlert, Cpu, Heart } from 'lucide-react';

export function Footer({ onNavigate }) {
  return (
    <footer className="main-footer">
      <div className="container footer-container">
        <div className="footer-top-row">
          <div className="footer-brand-info">
            <div className="brand-logo flex items-center gap-2 mb-2">
              <div className="brand-icon-wrapper">
                <Activity size={18} className="text-cyan" />
              </div>
              <span className="font-heading font-bold text-lg text-primary">
                MEDIC<span className="text-cyan">-XAI</span>
              </span>
            </div>
            <p className="footer-desc text-xs text-secondary max-w-[360px]">
              Explainable AI-Based Multi-Label Detection of Abnormalities Across Multiple Body Organs (Brain, Chest, Bone) from Medical Images Using Deep Learning.
            </p>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-nav-heading mono text-xs uppercase text-cyan">Navigation</h4>
            <div className="footer-links-list">
              <button onClick={() => onNavigate('home')} className="footer-link">Home</button>
              <button onClick={() => onNavigate('organs')} className="footer-link">Supported Organs</button>
              <button onClick={() => onNavigate('upload')} className="footer-link">Upload & Analyze</button>
              <button onClick={() => onNavigate('workflow')} className="footer-link">Processing Pipeline</button>
              <button onClick={() => onNavigate('gradcam')} className="footer-link">Grad-CAM XAI</button>
            </div>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-nav-heading mono text-xs uppercase text-cyan">Deep Learning</h4>
            <div className="footer-links-list">
              <span className="footer-static-item">DenseNet121 Architecture</span>
              <span className="footer-static-item">Multi-Label Sigmoid Modeling</span>
              <span className="footer-static-item">Grad-CAM Feature Activation</span>
              <span className="footer-static-item">Flask RESTful Inference API</span>
            </div>
          </div>

          <div className="footer-disclaimer-col">
            <div className="disclaimer-badge">
              <ShieldAlert size={14} className="text-amber" />
              <span className="mono text-xs text-amber font-semibold">Research Prototype</span>
            </div>
            <p className="text-xs text-muted mt-2">
              Developed as a Final-Year AIML Engineering Capstone Project. Designed for academic research, algorithm validation, and peer demonstration.
            </p>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div className="text-xs text-muted">
            &copy; {new Date().getFullYear()} MEDIC-XAI Research Project. All rights reserved.
          </div>
          <div className="footer-organ-summary flex gap-4 text-xs mono text-muted">
            <span>Organ 1: Brain (MRI)</span>
            <span>•</span>
            <span>Organ 2: Chest (CXR)</span>
            <span>•</span>
            <span>Organ 3: Bone (X-Ray)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
