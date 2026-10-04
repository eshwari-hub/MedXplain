import React, { useState, useEffect } from 'react';
import { Activity, Brain, Server, Menu, X, Cpu } from 'lucide-react';
import { apiService } from '../services/api';

export function Navbar({ activeSection, onNavigate, onOpenBackendModal, isLiveMode, onToggleMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('online');

  useEffect(() => {
    const checkApi = async () => {
      try {
        const status = await apiService.checkHealth();
        setBackendStatus(status.connected ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'upload', label: 'Analyze' },
    { id: 'results', label: 'Results' },
    { id: 'gradcam', label: 'Explainable AI' },
    { id: 'technology', label: 'Technology' }
  ];

  const handleNavClick = (id) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="main-navbar">
      <div className="nav-container">
        {/* Left Side: Professional Medical/AI Logo & Branding */}
        <div className="nav-brand" onClick={() => handleNavClick('home')}>
          <div className="brand-logo-icon">
            <Activity className="brand-pulse-svg" size={18} />
            <Brain className="brand-brain-svg" size={11} />
          </div>
          <div className="brand-titles">
            <span className="brand-name">
              Med<span className="brand-accent">Xplain</span>
            </span>
            <span className="brand-tagline">Explainable Medical AI</span>
          </div>
        </div>

        {/* Center: Clean, Professional Navigation Items */}
        <div className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link-btn ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
              {activeSection === item.id && <span className="nav-link-indicator" />}
            </button>
          ))}
        </div>

        {/* Right Side: LIVE MODEL Status Badge & Mobile Hamburger */}
        <div className="nav-actions">
          {isLiveMode ? (
            <div 
              className="live-model-badge" 
              onClick={onOpenBackendModal}
              title="Real DenseNet121 model connected via AI backend. Click to view status."
              role="button"
              tabIndex={0}
            >
              <span className="live-dot" />
              <span className="live-model-text">LIVE MODEL</span>
              <span className="live-subtext">AI Connected</span>
            </div>
          ) : (
            <div 
              className="demo-model-badge"
              onClick={onToggleMode}
              title="Running in Demo Simulation. Click to switch to Live Model."
              role="button"
              tabIndex={0}
            >
              <span className="demo-dot" />
              <span className="demo-model-text">DEMO MODE</span>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button 
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-drawer-header">
            {isLiveMode ? (
              <div className="live-model-badge w-full justify-center">
                <span className="live-dot" />
                <span className="live-model-text">LIVE MODEL ACTIVE</span>
                <span className="live-subtext">• AI Backend Connected</span>
              </div>
            ) : (
              <button 
                className="demo-model-badge w-full justify-center"
                onClick={onToggleMode}
              >
                <span className="demo-dot" />
                <span className="demo-model-text">SWITCH TO LIVE MODEL</span>
              </button>
            )}
          </div>

          <div className="mobile-drawer-items">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-btn ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mobile-drawer-footer">
            <button 
              className="btn btn-secondary btn-sm w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBackendModal();
              }}
            >
              <Server size={14} /> Backend Settings
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
