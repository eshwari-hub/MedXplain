import React, { useState, useEffect } from 'react';
import './App.css';

// Components
import { Navbar } from './components/Navbar';
import { HomeHero } from './components/HomeHero';
import { OrganScope } from './components/OrganScope';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisWorkflow } from './components/AnalysisWorkflow';
import { ResultsView } from './components/ResultsView';
import { ExplainableAIView } from './components/ExplainableAIView';
import { HistoryView } from './components/HistoryView';
import { TechnologyView } from './components/TechnologyView';
import { BackendModal } from './components/BackendModal';
import { ReportModal } from './components/ReportModal';
import { Footer } from './components/Footer';

// Data & Services
import { PRESET_CASES, INITIAL_HISTORY } from './data/sampleData';
import { apiService } from './services/api';

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedImage, setSelectedImage] = useState('/assets/brain-sample.jpg');
  const [imageFile, setImageFile] = useState(null);
  const [selectedOrgan, setSelectedOrgan] = useState('auto');

  // Mode state: false = Demo Mode (Simulated Results), true = Live Model (Real Flask Backend)
  const [isLiveMode, setIsLiveMode] = useState(() => {
    return localStorage.getItem('medic_xai_mode') === 'live';
  });

  // API error state for live backend communication
  const [apiError, setApiError] = useState(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [currentStepName, setCurrentStepName] = useState('Idle');
  const [progressPercent, setProgressPercent] = useState(0);

  // Active Result State (initialized with Demo Brain MRI case)
  const [analysisResult, setAnalysisResult] = useState(PRESET_CASES.brain);

  // History State
  const [historyList, setHistoryList] = useState(() => {
    const saved = localStorage.getItem('medic_xai_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_HISTORY;
      }
    }
    return INITIAL_HISTORY;
  });

  // Modals
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Auto-detect server on mount to suggest live mode if available
  useEffect(() => {
    const detectBackend = async () => {
      const status = await apiService.checkHealth();
      if (status.connected && !localStorage.getItem('medic_xai_mode_set_by_user')) {
        setIsLiveMode(true);
      }
    };
    detectBackend();
  }, []);

  // Sync mode to localStorage
  useEffect(() => {
    localStorage.setItem('medic_xai_mode', isLiveMode ? 'live' : 'demo');
  }, [isLiveMode]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('medic_xai_history', JSON.stringify(historyList));
  }, [historyList]);

  const handleToggleMode = () => {
    localStorage.setItem('medic_xai_mode_set_by_user', 'true');
    setIsLiveMode(prev => !prev);
    setApiError(null);
  };

  // Navigation handler
  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`${sectionId}-section`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Load Preset Case (Brain, Chest, Bone) into Auto Detection Pipeline
  const handleLoadPreset = async (organId) => {
    setApiError(null);
    setSelectedOrgan('auto');
    const preset = PRESET_CASES[organId];
    if (preset) {
      setSelectedImage(preset.imageUrl);
      try {
        const res = await fetch(`/assets/${organId}-sample.jpg`);
        const blob = await res.blob();
        const sampleFile = new File([blob], `${organId}-sample.jpg`, { type: 'image/jpeg' });
        setImageFile(sampleFile);
      } catch {
        const blob = new Blob(["sample"], { type: 'image/jpeg' });
        const sampleFile = new File([blob], preset.fileName, { type: 'image/jpeg' });
        setImageFile(sampleFile);
      }
      setAnalysisResult(preset);
      handleNavigate('upload');
    }
  };

  // Run Inference / Analysis Pipeline with Automated Organ Routing
  const handleStartAnalysis = async () => {
    if (!selectedImage) return;

    setApiError(null);
    setIsAnalyzing(true);
    setProgressPercent(10);
    setCurrentStage(1);
    setCurrentStepName('Image Ingestion & Preprocessing (224×224 Normalization)...');

    // Smoothly scroll down to workflow to watch the pipeline execute
    const wfElement = document.getElementById('workflow-section');
    if (wfElement) {
      wfElement.scrollIntoView({ behavior: 'smooth' });
    }

    try {
      let result;
      if (isLiveMode) {
        // Real Flask API call - Always sends organ_mode='auto'
        result = await apiService.analyzeLive(
          imageFile || selectedImage,
          'auto',
          (step, name, pct) => {
            setCurrentStage(step);
            setCurrentStepName(name);
            setProgressPercent(pct);
          }
        );
      } else {
        // Demo Mode - Automated organ detection simulation
        result = await apiService.analyzeDemo(
          imageFile || selectedImage,
          'auto',
          (step, name, pct) => {
            setCurrentStage(step);
            setCurrentStepName(name);
            setProgressPercent(pct);
          }
        );
      }

      result.imageUrl = selectedImage;
      setAnalysisResult(result);

      // Add to history
      const newHistoryItem = {
        id: result.id || `hist-${Date.now()}`,
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        organ: result.organ || result.organName,
        organId: (result.organ || result.organName || 'chest').toLowerCase(),
        imagePreview: result.imageUrl,
        fileName: result.fileName,
        abnormalities: result.abnormalities?.filter(a => a.confidence >= 50).map(a => `${a.name} (${a.confidence.toFixed(1)}%)`),
        primaryConfidence: `${result.abnormalities?.[0]?.confidence?.toFixed(1) || 0}%`,
        status: isLiveMode ? 'LIVE MODEL' : 'DEMO MODE — Simulated Results',
        triage: result.triageLevel,
        diseaseStage: result.diseaseStage || 'Not available',
        caseDataKey: result.organId
      };

      if (!newHistoryItem.abnormalities || newHistoryItem.abnormalities.length === 0) {
        newHistoryItem.abnormalities = ['No Abnormalities Above 50% Threshold'];
      }

      setHistoryList(prev => [newHistoryItem, ...prev.slice(0, 19)]);

      setTimeout(() => {
        setIsAnalyzing(false);
        handleNavigate('results');
      }, 500);

    } catch (err) {
      console.error('Analysis failed:', err);
      setIsAnalyzing(false);
      setApiError(err.message || 'An error occurred during model analysis.');
      // Scroll back to upload section so user immediately sees the error message
      const uploadEl = document.getElementById('upload-section');
      if (uploadEl) {
        uploadEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Select item from history
  const handleSelectHistoryItem = (item) => {
    if (item.caseDataKey && PRESET_CASES[item.caseDataKey]) {
      const baseCase = PRESET_CASES[item.caseDataKey];
      setAnalysisResult({
        ...baseCase,
        fileName: item.fileName || baseCase.fileName,
        imageUrl: item.imagePreview || baseCase.imageUrl
      });
      setSelectedImage(item.imagePreview || baseCase.imageUrl);
      setSelectedOrgan(baseCase.organId);
    }
    handleNavigate('results');
  };

  // Clear History
  const handleClearHistory = () => {
    setHistoryList(INITIAL_HISTORY);
    localStorage.removeItem('medic_xai_history');
  };

  return (
    <div className="medic-xai-app">
      {/* Top Main Navigation Bar */}
      <Navbar 
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenBackendModal={() => setIsBackendModalOpen(true)}
        isLiveMode={isLiveMode}
        onToggleMode={handleToggleMode}
      />

      {/* Main Page Layout Sections */}
      <main className="main-content-flow">
        {/* Section 1: HOME Hero */}
        <HomeHero 
          onNavigate={handleNavigate}
          onLoadPreset={handleLoadPreset}
        />

        {/* Dedicated Organ Scope: Brain, Chest, Bone */}
        <OrganScope 
          onSelectOrgan={(organId) => setSelectedOrgan(organId)}
          onLoadPreset={handleLoadPreset}
        />

        {/* Section 2: UPLOAD IMAGE */}
        <ImageUpload 
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          imageFile={imageFile}
          setImageFile={setImageFile}
          selectedOrgan={selectedOrgan}
          setSelectedOrgan={setSelectedOrgan}
          onStartAnalysis={handleStartAnalysis}
          isLiveMode={isLiveMode}
          apiError={apiError}
          onClearError={() => setApiError(null)}
          onToggleMode={handleToggleMode}
        />

        {/* Section 3: ANALYSIS Workflow (5 Stages) */}
        <AnalysisWorkflow 
          isAnalyzing={isAnalyzing}
          currentStage={currentStage}
          currentStepName={currentStepName}
          progressPercent={progressPercent}
        />

        {/* Section 4: RESULTS */}
        <ResultsView 
          analysisResult={analysisResult}
          onGoToGradcam={() => handleNavigate('gradcam')}
          onOpenReportModal={() => setIsReportModalOpen(true)}
        />

        {/* Section 5: EXPLAINABLE AI (Grad-CAM) */}
        <ExplainableAIView 
          analysisResult={analysisResult}
        />

        {/* Section 6: HISTORY */}
        <HistoryView 
          historyList={historyList}
          onSelectHistoryItem={handleSelectHistoryItem}
          onClearHistory={handleClearHistory}
        />

        {/* Section 7: TECHNOLOGY */}
        <TechnologyView 
          onOpenBackendModal={() => setIsBackendModalOpen(true)}
        />
      </main>

      {/* Modals */}
      <BackendModal 
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
      />

      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        analysisResult={analysisResult}
      />

      {/* Academic Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
