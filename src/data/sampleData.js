// Sample data & clinical research definitions for MEDIC-XAI
// Explainable AI-Based Multi-Label Detection Across Multiple Body Organs

/**
 * Model Evaluation Metrics
 * Configurable benchmark metrics for the trained DenseNet121 model.
 * These represent offline cohort evaluation metrics, NOT individual image predictions.
 */
export const MODEL_EVALUATION_METRICS = {
  title: 'Model Evaluation Metrics',
  statusNote: 'Configurable Baseline — To be updated with final validated test-set metrics',
  overall: {
    auc: 0.962,
    f1Score: 0.938,
    precision: 0.945,
    recall: 0.932
  },
  organs: {
    brain: {
      name: 'Brain (MRI / CT)',
      auc: 0.964,
      f1Score: 0.941,
      precision: 0.948,
      recall: 0.935,
      gradcamResolution: '7x7 -> 224x224',
      targetLayer: 'conv5_block16_2_conv'
    },
    chest: {
      name: 'Chest (X-Ray / CXR)',
      auc: 0.952,
      f1Score: 0.929,
      precision: 0.935,
      recall: 0.924,
      gradcamResolution: '7x7 -> 224x224',
      targetLayer: 'conv5_block16_2_conv'
    },
    bone: {
      name: 'Bone (Musculoskeletal)',
      auc: 0.971,
      f1Score: 0.952,
      precision: 0.962,
      recall: 0.943,
      gradcamResolution: '7x7 -> 224x224',
      targetLayer: 'conv5_block16_2_conv'
    }
  }
};

export const SUPPORTED_ORGANS = [
  {
    id: 'brain',
    name: 'Brain',
    fullName: 'Cerebral & Central Nervous System',
    modality: 'Magnetic Resonance Imaging (MRI / T1w, T2w, FLAIR) & CT',
    icon: 'Brain',
    accentColor: '#38bdf8',
    tagColor: 'rgba(56, 189, 248, 0.15)',
    description: 'High-resolution neuroimaging analysis for localized intracranial neoplasms, hemorrhage, structural shifts, and parenchymal edema.',
    sampleImage: '/assets/brain-sample.jpg',
    pathologies: [
      { name: 'Glioma / Glioblastoma', frequency: 'High', severity: 'Critical', region: 'Frontal / Temporal Cortex' },
      { name: 'Meningioma', frequency: 'Moderate', severity: 'Subacute', region: 'Dura Mater / Convexity' },
      { name: 'Pituitary Tumor', frequency: 'Moderate', severity: 'Manageable', region: 'Sellar / Suprasellar' },
      { name: 'Cerebral Edema', frequency: 'High (Co-occurring)', severity: 'Severe', region: 'Peritumoral White Matter' },
      { name: 'Intracranial Hemorrhage', frequency: 'Low', severity: 'Emergency', region: 'Subdural / Intracerebral' },
      { name: 'Normal (No Abnormalities)', frequency: 'Baseline', severity: 'Normal', region: 'Cerebral Hemispheres' }
    ],
    technicalMetrics: {
      denseNetAUROC: '0.964',
      sensitivity: '94.8%',
      specificity: '96.1%',
      gradcamResolution: '7x7 -> 224x224'
    }
  },
  {
    id: 'chest',
    name: 'Chest',
    fullName: 'Thoracic & Pulmonary Radiography',
    modality: 'Posteroanterior (PA) & Anteroposterior (AP) Chest X-Ray (CXR)',
    icon: 'Activity',
    accentColor: '#00f2fe',
    tagColor: 'rgba(0, 242, 254, 0.15)',
    description: 'Automated multi-label pulmonary screening detecting co-occurring infectious infiltrations, pleural effusion, and cardiac enlargement.',
    sampleImage: '/assets/chest-sample.jpg',
    pathologies: [
      { name: 'Pleural Effusion', frequency: 'High', severity: 'Severe', region: 'Costophrenic Angles / Basal Margin' },
      { name: 'Cardiomegaly', frequency: 'High', severity: 'Moderate', region: 'Cardiac Silhouette / Transverse Diameter' },
      { name: 'Pneumonia / Infiltration', frequency: 'Very High', severity: 'Acute', region: 'Middle / Lower Lobe Parenchyma' },
      { name: 'Atelectasis', frequency: 'Moderate', severity: 'Moderate', region: 'Basal Subsegmental Bands' },
      { name: 'Pneumothorax', frequency: 'Low', severity: 'Emergency', region: 'Apical Pleural Space' },
      { name: 'Normal (Clear Lungs)', frequency: 'Baseline', severity: 'Normal', region: 'Bilateral Thoracic Fields' }
    ],
    technicalMetrics: {
      denseNetAUROC: '0.952',
      sensitivity: '93.5%',
      specificity: '95.8%',
      gradcamResolution: '7x7 -> 224x224'
    }
  },
  {
    id: 'bone',
    name: 'Bone',
    fullName: 'Musculoskeletal & Orthopedic Radiography',
    modality: 'Orthopedic Digital Radiography (Extremities, Hand, Wrist, Knee)',
    icon: 'Bone',
    accentColor: '#4facfe',
    tagColor: 'rgba(79, 172, 254, 0.15)',
    description: 'High-sensitivity cortical disruption screening, trabecular bone mineral density assessment, and joint articulation alignment analysis.',
    sampleImage: '/assets/bone-sample.jpg',
    pathologies: [
      { name: 'Cortical Fracture', frequency: 'High', severity: 'Urgent', region: 'Distal Radius / Metaphyseal Cortical Line' },
      { name: 'Joint Dislocation / Subluxation', frequency: 'Moderate', severity: 'Acute', region: 'Radiocarpal / Interphalangeal Articulation' },
      { name: 'Osteoarthritis', frequency: 'High', severity: 'Chronic', region: 'Joint Space Narrowing / Osteophytes' },
      { name: 'Osteopenia / Bone Density Loss', frequency: 'Moderate', severity: 'Mild', region: 'Trabecular Demineralization' },
      { name: 'Normal (Intact Cortex)', frequency: 'Baseline', severity: 'Normal', region: 'Skeletal Continuity Preserved' }
    ],
    technicalMetrics: {
      denseNetAUROC: '0.971',
      sensitivity: '96.2%',
      specificity: '97.5%',
      gradcamResolution: '7x7 -> 224x224'
    }
  }
];

export const PRESET_CASES = {
  brain: {
    id: 'demo-brain-01',
    isDemoMode: true,
    source: 'demo-simulation',
    organId: 'brain',
    organ: 'Brain',
    organName: 'Brain',
    fileName: 'brain_mri_flair_axial_092.dcm',
    fileSize: '4.8 MB',
    modality: 'MRI Axial FLAIR',
    imageUrl: '/assets/brain-sample.jpg',
    organConfidence: 99.7,
    overallStatus: 'DEMO MODE — Simulated Results',
    triageLevel: 'Urgent',
    diseaseStage: 'Grade III (Glioma with Peritumoral Edema)',
    xai_method: 'Grad-CAM (Demo Projection)',
    processing_time: 1.84,
    grad_cam_image: null,
    abnormalities: [
      {
        id: 'abn-brain-1',
        name: 'Glioblastoma / High-Grade Glioma',
        confidence: 94.6,
        status: 'Positive',
        stage: 'Grade III',
        region: 'Right Frontal-Temporal Cerebral Cortex',
        heatCentroid: { x: 0.62, y: 0.44, radius: 0.22 },
        clinicalReasoning: 'DenseNet121 demo simulation of hyperintense mass effect with irregular rim enhancement and parenchymal distortion in right frontal-temporal hemisphere.'
      },
      {
        id: 'abn-brain-2',
        name: 'Peritumoral Cerebral Edema',
        confidence: 86.2,
        status: 'Positive',
        stage: null, // Test optional stage
        region: 'Surrounding White Matter Tracts',
        heatCentroid: { x: 0.68, y: 0.38, radius: 0.28 },
        clinicalReasoning: 'High-intensity FLAIR signal halo around the main lesion indicating vasogenic fluid accumulation.'
      }
    ]
  },
  chest: {
    id: 'demo-chest-01',
    isDemoMode: true,
    source: 'demo-simulation',
    organId: 'chest',
    organ: 'Chest',
    organName: 'Chest',
    fileName: 'cxr_pa_radiograph_2026.dcm',
    fileSize: '6.2 MB',
    modality: 'Digital Radiography PA',
    imageUrl: '/assets/chest-sample.jpg',
    organConfidence: 99.2,
    overallStatus: 'DEMO MODE — Simulated Results',
    triageLevel: 'Action Required',
    diseaseStage: 'Stage II (Moderate Congestion)',
    xai_method: 'Grad-CAM (Demo Projection)',
    processing_time: 1.62,
    grad_cam_image: null,
    abnormalities: [
      {
        id: 'abn-chest-1',
        name: 'Pleural Effusion (Left Basal)',
        confidence: 91.8,
        status: 'Positive',
        stage: 'Moderate (Stage II)',
        region: 'Left Lower Thoracic Base & Costophrenic Sulcus',
        heatCentroid: { x: 0.76, y: 0.74, radius: 0.24 },
        clinicalReasoning: 'Blunting of left costophrenic angle accompanied by homogeneous meniscus-shaped opacity that obscures diaphragmatic contour.'
      },
      {
        id: 'abn-chest-2',
        name: 'Cardiomegaly',
        confidence: 84.5,
        status: 'Positive',
        stage: null,
        region: 'Cardiac Silhouette (CTR > 0.55)',
        heatCentroid: { x: 0.52, y: 0.62, radius: 0.26 },
        clinicalReasoning: 'Enlarged transverse cardiac diameter exceeding 55% of total thoracic internal diameter.'
      }
    ]
  },
  bone: {
    id: 'demo-bone-01',
    isDemoMode: true,
    source: 'demo-simulation',
    organId: 'bone',
    organ: 'Bone',
    organName: 'Bone',
    fileName: 'ortho_wrist_radiograph_pa_044.png',
    fileSize: '3.9 MB',
    modality: 'Orthopedic Radiography PA',
    imageUrl: '/assets/bone-sample.jpg',
    organConfidence: 99.5,
    overallStatus: 'DEMO MODE — Simulated Results',
    triageLevel: 'Urgent',
    diseaseStage: 'Acute Non-Comminuted',
    xai_method: 'Grad-CAM (Demo Projection)',
    processing_time: 1.45,
    grad_cam_image: null,
    abnormalities: [
      {
        id: 'abn-bone-1',
        name: 'Distal Radial Cortical Fracture',
        confidence: 95.7,
        status: 'Positive',
        stage: 'Acute Non-Comminuted',
        region: 'Distal Radius Metaphyseal Cortex',
        heatCentroid: { x: 0.52, y: 0.82, radius: 0.2 },
        clinicalReasoning: 'Sharp discontinuity in radial cortical margin with subtle impaction line and trabecular misalignment.'
      }
    ]
  }
};

export const INITIAL_HISTORY = [
  {
    id: 'hist-001',
    date: '2026-10-03 14:15',
    organ: 'Brain',
    organId: 'brain',
    imagePreview: '/assets/brain-sample.jpg',
    fileName: 'brain_mri_flair_axial_092.dcm',
    abnormalities: ['Glioblastoma (94.6%)', 'Peritumoral Edema (86.2%)'],
    primaryConfidence: '94.6%',
    status: 'DEMO MODE — Simulated Results',
    triage: 'Urgent',
    diseaseStage: 'Grade III',
    caseDataKey: 'brain'
  },
  {
    id: 'hist-002',
    date: '2026-10-03 11:42',
    organ: 'Chest',
    organId: 'chest',
    imagePreview: '/assets/chest-sample.jpg',
    fileName: 'cxr_pa_radiograph_2026.dcm',
    abnormalities: ['Pleural Effusion (91.8%)', 'Cardiomegaly (84.5%)'],
    primaryConfidence: '91.8%',
    status: 'DEMO MODE — Simulated Results',
    triage: 'Action Required',
    diseaseStage: 'Stage II',
    caseDataKey: 'chest'
  },
  {
    id: 'hist-003',
    date: '2026-10-02 16:30',
    organ: 'Bone',
    organId: 'bone',
    imagePreview: '/assets/bone-sample.jpg',
    fileName: 'ortho_wrist_radiograph_pa_044.png',
    abnormalities: ['Distal Radial Fracture (95.7%)'],
    primaryConfidence: '95.7%',
    status: 'DEMO MODE — Simulated Results',
    triage: 'Urgent',
    diseaseStage: 'Acute Breach',
    caseDataKey: 'bone'
  }
];

export const TECHNOLOGIES_LIST = [
  {
    name: 'Python',
    category: 'Core Runtime & Ecosystem',
    version: '3.10+',
    badge: 'Language',
    description: 'Powers the complete machine learning engineering pipeline, data pipelines, model orchestration, and Flask microservices.'
  },
  {
    name: 'CNN',
    category: 'Model Architecture',
    version: 'Deep Convolutions',
    badge: 'Neural Network',
    description: 'Convolutional neural networks capture localized 2D spatial hierarchies, anatomical textures, and pathological edge features.'
  },
  {
    name: 'DenseNet121',
    category: 'Deep Backbone Network',
    version: 'Pretrained on ImageNet / CheXNet',
    badge: '121 Layers',
    description: 'Connects each layer to every other layer in a feed-forward fashion, mitigating vanishing gradients and maximizing feature reuse across organ imaging.'
  },
  {
    name: 'Deep Learning',
    category: 'Learning Paradigm',
    version: 'Multi-Label Supervised',
    badge: 'AIML',
    description: 'Employs independent sigmoid probability outputs per abnormality class with weighted binary cross-entropy loss to handle co-occurring diseases.'
  },
  {
    name: 'TensorFlow & Keras',
    category: 'Framework & Engine',
    version: '2.14+',
    badge: 'DL Engine',
    description: 'Provides symbolic computation graphs, GPU acceleration, and exact automatic differentiation for computing target class activation gradients.'
  },
  {
    name: 'Flask',
    category: 'Backend Microservice',
    version: '3.0+',
    badge: 'REST API',
    description: 'Lightweight WSGI Python web framework exposing REST endpoint (/api/analyze) for seamless frontend-backend communication.'
  },
  {
    name: 'Grad-CAM',
    category: 'Explainable AI (XAI)',
    version: 'Target Layer: conv5_block16_2_conv',
    badge: 'Visual Interpretability',
    description: 'Calculates the gradient of the predicted abnormality score with respect to feature maps of the final convolutional layer to generate coarse localization heatmaps.'
  },
  {
    name: 'NumPy',
    category: 'Scientific Computing',
    version: '1.24+',
    badge: 'Matrix Tensors',
    description: 'High-performance multi-dimensional array operations for tensor transformations, bilinear interpolations, and normalized mask generation.'
  },
  {
    name: 'Pandas',
    category: 'Data Engineering',
    version: '2.1+',
    badge: 'Data Wrangling',
    description: 'Manages multi-organ diagnostic cohort metadata, label binarization matrices, and demographic stratified splits.'
  },
  {
    name: 'OpenCV (cv2)',
    category: 'Computer Vision',
    version: '4.8+',
    badge: 'Preprocessing',
    description: 'Performs Contrast Limited Adaptive Histogram Equalization (CLAHE), morphological filtering, bounding box extraction, and Jet colormap synthesis.'
  }
];
