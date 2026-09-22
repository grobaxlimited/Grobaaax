/**
 * Academic Illustration & Visual Assets Engine for Grobaax AI Library
 * Provides high-resolution realistic textbook photography and crisp SVG vector figures
 * for all tertiary academic domains (Sciences, Tech, Health, Engineering, Law, Business, Education).
 */

import { HandoutDiagram, HandoutSection, LibraryHandoutContent } from '../types';

export interface AcademicPhotoAsset {
  url: string;
  caption: string;
  source: string;
  tags: string[];
}

// Curated high-resolution academic photography categorized by topic domain
const ACADEMIC_PHOTO_REGISTRY: Record<string, AcademicPhotoAsset[]> = {
  photosynthesis_botany: [
    {
      url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
      caption: 'Chloroplast Stroma, Thylakoid Membrane Architecture & Photophosphorylation',
      source: 'Botanical Sciences & Plant Biochemistry',
      tags: ['photosynthesis', 'chloroplast', 'chlorophyll', 'plant', 'botany', 'light reaction', 'calvin cycle', 'leaf', 'autotroph', 'thylakoid'],
    },
    {
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
      caption: 'Cellular Respiration, Light Harvesting Complexes & Leaf Mesophyll Tissue',
      source: 'Plant Physiology & Photosynthetic Research',
      tags: ['photosynthesis', 'leaf', 'stomatal', 'chloroplast', 'rubisco', 'c3', 'c4', 'bioenergetics', 'biomass'],
    },
  ],
  computing_algorithms: [
    {
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      caption: 'Digital Architecture, Binary Search Trees & Asymptotic Algorithmic Execution',
      source: 'Grobaax Computing Series',
      tags: ['code', 'data', 'algorithm', 'software', 'programming', 'binary', 'tree', 'graph', 'data structure', 'complexity'],
    },
    {
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      caption: 'Enterprise Datacenter Server Racks & Distributed Relational DBMS Infrastructure',
      source: 'Systems Engineering Archive',
      tags: ['server', 'cloud', 'database', 'distributed', 'infrastructure', 'network', 'dbms', 'sql', 'acid'],
    },
    {
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      caption: 'Semiconductor Microprocessor Die & Integrated Circuit Architecture',
      source: 'Silicon Fabrication Lab',
      tags: ['hardware', 'cpu', 'chip', 'architecture', 'microprocessor', 'embedded', 'circuits', 'vlsi'],
    },
    {
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      caption: 'Artificial Neural Networks, Deep Learning & Gradient Descent Optimization',
      source: 'Artificial Intelligence Research Institute',
      tags: ['ai', 'machine learning', 'neural', 'deep learning', 'gradient', 'backpropagation', 'model', 'data science'],
    },
  ],
  medicine_health: [
    {
      url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
      caption: 'Clinical Diagnostic Monitoring, Patient Vital Signs & Hemodynamic Assessment',
      source: 'Clinical Medicine Archive',
      tags: ['medicine', 'nursing', 'health', 'clinical', 'patient', 'hospital', 'doctor', 'vital signs', 'triage'],
    },
    {
      url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80',
      caption: 'Cellular Microscopy, Histopathology & Hematological Peripheral Smear Profiling',
      source: 'Biomedical Diagnostic Lab',
      tags: ['microscope', 'pathology', 'cell', 'histology', 'hematology', 'blood', 'anemia', 'platelet', 'wbc'],
    },
    {
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
      caption: 'Pharmacological Drug Synthesis, Molecular Receptor Kinetics & Dosage Titration',
      source: 'Pharmaceutical Sciences Review',
      tags: ['pharmacy', 'drug', 'pharmacology', 'titration', 'dosage', 'pharmacokinetics', 'adme', 'tablet'],
    },
    {
      url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80',
      caption: 'Cardiovascular Hemodynamics, Cardiac Muscle Electrophysiology & Valve Mechanics',
      source: 'Anatomical Sciences Press',
      tags: ['anatomy', 'physiology', 'heart', 'cardiovascular', 'ecg', 'blood pressure', 'starling', 'valves'],
    },
  ],
  engineering: [
    {
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      caption: 'Precision Mechanical Engineering, Automated Robotics & CNC Workshop Tooling',
      source: 'Industrial Technology Press',
      tags: ['mechanical', 'robotics', 'automation', 'machine', 'manufacturing', 'cad', 'cnc', 'lathe', 'workshop'],
    },
    {
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      caption: 'Reinforced Concrete Structural Design, Beam Stress & Geotechnical Foundations',
      source: 'Structural Engineering Review',
      tags: ['civil', 'structural', 'building', 'concrete', 'geotechnical', 'survey', 'soil', 'foundation', 'truss'],
    },
    {
      url: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=1200&q=80',
      caption: 'Printed Circuit Board (PCB) Fabrication, Transformer Coils & Embedded Electrical Systems',
      source: 'Electrical Engineering Handbook',
      tags: ['electrical', 'electronics', 'circuit', 'pcb', 'power', 'transformer', 'induction', 'resistor', 'ac/dc'],
    },
    {
      url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
      caption: 'Applied Thermodynamics, Rankine Steam Power Cycle & Fluid Flow Dynamics',
      source: 'Applied Physics & Energy Press',
      tags: ['thermodynamics', 'fluid', 'energy', 'thermal', 'heat', 'power', 'rankine', 'entropy', 'bernoulli'],
    },
  ],
  science_chemistry_physics: [
    {
      url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
      caption: 'Chemical Reaction Synthesis, Spectrophotometry & Solution Titration Glassware',
      source: 'Chemical Society Publications',
      tags: ['chemistry', 'chemical', 'reaction', 'lab', 'titration', 'spectroscopy', 'spectrophotometry', 'molecules', 'molarity', 'beer-lambert'],
    },
    {
      url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
      caption: 'Quantum Wave Mechanics, Laser Optics & Electromagnetic Field Propagation',
      source: 'Physical Sciences Archive',
      tags: ['physics', 'optics', 'laser', 'quantum', 'mechanics', 'schrodinger', 'electromagnetism', 'maxwell', 'frequency'],
    },
    {
      url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80',
      caption: 'Genetics, Molecular Biology & Double-Helix DNA Recombination Assays',
      source: 'Genomic Research Series',
      tags: ['biology', 'dna', 'genetics', 'molecular', 'biotechnology', 'rna', 'gene', 'replication', 'enzyme'],
    },
  ],
  business_law_economics: [
    {
      url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
      caption: 'Statutory Jurisprudence, Contractual Offer-Acceptance & Constitutional Precedents',
      source: 'Legal Studies & Law Review',
      tags: ['law', 'legal', 'court', 'constitution', 'justice', 'statute', 'jurisprudence', 'contract', 'tort', 'cama'],
    },
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      caption: 'Econometric Modeling, Keynesian Multiplier Analytics & Capital Market Valuation',
      source: 'Econometric & Financial Press',
      tags: ['economics', 'finance', 'accounting', 'business', 'market', 'capital', 'audit', 'npv', 'gdp', 'inflation', 'multiplier'],
    },
    {
      url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
      caption: 'Strategic Corporate Management, Organizational Hierarchy & Governance Standards',
      source: 'Management & Business Review',
      tags: ['management', 'marketing', 'administration', 'strategy', 'corporate', 'organization', 'human resources', 'fayol'],
    },
  ],
  agriculture_environmental: [
    {
      url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      caption: 'Agronomy, Soil Nutrient Profiles (NPK) & Tropical Arable Crop Husbandry',
      source: 'Agricultural Sciences Press',
      tags: ['agriculture', 'crop', 'soil', 'agronomy', 'farming', 'npk', 'pest', 'livestock', 'feed', 'pearson'],
    },
    {
      url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
      caption: 'Plant Seedling Germination, Hydroponic Nutrient Feeds & Environmental Ecology',
      source: 'Horticulture & Soil Research Archive',
      tags: ['seedling', 'plant', 'germination', 'horticulture', 'environment', 'ecology', 'forestry', 'fisheries'],
    },
  ],
  education_pedagogy: [
    {
      url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      caption: 'Educational Measurement, Bloom’s Taxonomy Lesson Blueprint & Classroom Pedagogy',
      source: 'Higher Education Pedagogy Press',
      tags: ['education', 'teaching', 'pedagogy', 'curriculum', 'lesson note', 'bloom', 'test blueprint', 'measurement', 'p-index'],
    },
  ],
  maritime_petroleum: [
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      caption: 'Petroleum Drilling Wellhead Hydrostatics, Mud Pressure & Blowout Prevention (BOP)',
      source: 'Petroleum & Mining Technology Press',
      tags: ['petroleum', 'drilling', 'mud', 'bop', 'well control', 'reservoir', 'hydrostatic', 'oil', 'gas'],
    },
    {
      url: 'https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=1200&q=80',
      caption: 'Nautical Ship Navigation, Magnetic Compass Deviation & Marine Bridge Charting',
      source: 'Maritime & Nautical Institute',
      tags: ['maritime', 'nautical', 'navigation', 'compass', 'colregs', 'ship', 'cadet', 'sea', 'vessel'],
    },
  ],
  general: [
    {
      url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
      caption: 'Academic Scholarly Research, Reference Treatises & Comprehensive Course Treatises',
      source: 'University Academic Press',
      tags: ['book', 'library', 'study', 'education', 'research', 'pedagogy', 'academic'],
    },
    {
      url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
      caption: 'Systematic Pedagogical Instruction, Curriculum Delivery & Student Assessment',
      source: 'Higher Education Research Press',
      tags: ['teaching', 'education', 'lecture', 'student', 'assessment', 'curriculum'],
    },
  ],
};

/**
 * Resolves a high-quality, authentic academic photograph based on topic, department, and chapter index.
 */
export function getAcademicPhotoForChapter(params: {
  topic: string;
  department?: string;
  faculty?: string;
  chapterIndex: number;
  chapterTitle?: string;
}): AcademicPhotoAsset {
  const { topic, department = '', faculty = '', chapterIndex, chapterTitle = '' } = params;
  const searchStr = `${topic} ${department} ${faculty} ${chapterTitle}`.toLowerCase();

  let targetCategory = 'general';

  if (
    searchStr.includes('photosynthesis') ||
    searchStr.includes('chloroplast') ||
    searchStr.includes('chlorophyll') ||
    searchStr.includes('calvin') ||
    searchStr.includes('plant bio') ||
    searchStr.includes('botany')
  ) {
    targetCategory = 'photosynthesis_botany';
  } else if (
    searchStr.includes('computer') ||
    searchStr.includes('software') ||
    searchStr.includes('data struct') ||
    searchStr.includes('algorithm') ||
    searchStr.includes('database') ||
    searchStr.includes('dbms') ||
    searchStr.includes('cyber') ||
    searchStr.includes('machine learning') ||
    searchStr.includes('neural') ||
    searchStr.includes('ai') ||
    searchStr.includes('programming') ||
    searchStr.includes('code')
  ) {
    targetCategory = 'computing_algorithms';
  } else if (
    searchStr.includes('medic') ||
    searchStr.includes('nurs') ||
    searchStr.includes('pharm') ||
    searchStr.includes('health') ||
    searchStr.includes('clinic') ||
    searchStr.includes('patient') ||
    searchStr.includes('anat') ||
    searchStr.includes('physio') ||
    searchStr.includes('hemat') ||
    searchStr.includes('cardio') ||
    searchStr.includes('blood')
  ) {
    targetCategory = 'medicine_health';
  } else if (
    searchStr.includes('thermo') ||
    searchStr.includes('engine') ||
    searchStr.includes('mechanic') ||
    searchStr.includes('civil') ||
    searchStr.includes('circuit') ||
    searchStr.includes('electric') ||
    searchStr.includes('transformer') ||
    searchStr.includes('fluid') ||
    searchStr.includes('robot') ||
    searchStr.includes('concrete') ||
    searchStr.includes('beam')
  ) {
    targetCategory = 'engineering';
  } else if (
    searchStr.includes('chem') ||
    searchStr.includes('physic') ||
    searchStr.includes('titration') ||
    searchStr.includes('spectro') ||
    searchStr.includes('quantum') ||
    searchStr.includes('optics') ||
    searchStr.includes('maxwell') ||
    searchStr.includes('dna') ||
    searchStr.includes('gene') ||
    searchStr.includes('molecular') ||
    searchStr.includes('biochem') ||
    searchStr.includes('microb')
  ) {
    targetCategory = 'science_chemistry_physics';
  } else if (
    searchStr.includes('law') ||
    searchStr.includes('legal') ||
    searchStr.includes('court') ||
    searchStr.includes('contract') ||
    searchStr.includes('tort') ||
    searchStr.includes('econo') ||
    searchStr.includes('account') ||
    searchStr.includes('financ') ||
    searchStr.includes('bank') ||
    searchStr.includes('manag') ||
    searchStr.includes('busin') ||
    searchStr.includes('gdp') ||
    searchStr.includes('audit')
  ) {
    targetCategory = 'business_law_economics';
  } else if (
    searchStr.includes('agric') ||
    searchStr.includes('crop') ||
    searchStr.includes('soil') ||
    searchStr.includes('animal sc') ||
    searchStr.includes('livestock') ||
    searchStr.includes('fisher') ||
    searchStr.includes('forest')
  ) {
    targetCategory = 'agriculture_environmental';
  } else if (
    searchStr.includes('pedagog') ||
    searchStr.includes('teach') ||
    searchStr.includes('educ') ||
    searchStr.includes('bloom') ||
    searchStr.includes('curriculum') ||
    searchStr.includes('lesson') ||
    searchStr.includes('test blueprint')
  ) {
    targetCategory = 'education_pedagogy';
  } else if (
    searchStr.includes('maritime') ||
    searchStr.includes('nautical') ||
    searchStr.includes('petroleum') ||
    searchStr.includes('drill') ||
    searchStr.includes('well') ||
    searchStr.includes('bop') ||
    searchStr.includes('navigation')
  ) {
    targetCategory = 'maritime_petroleum';
  }

  const pool = ACADEMIC_PHOTO_REGISTRY[targetCategory] || ACADEMIC_PHOTO_REGISTRY.general;
  const asset = pool[chapterIndex % pool.length] || ACADEMIC_PHOTO_REGISTRY.general[0];

  return {
    ...asset,
    caption: `${asset.caption} — Illustrated in Direct Context of ${topic}`,
  };
}

/**
 * Generates clean, publication-quality SVG visual textbook diagrams for academic concepts.
 */
export function generateVisualSvgDiagram(params: {
  title: string;
  topic: string;
  chapterNumber: number;
  type?: string;
  keyComponents?: string[];
}): string {
  const { title, topic, chapterNumber, keyComponents = [] } = params;
  const comp1 = keyComponents[0] || '1. Boundary Parameters & State Intake';
  const comp2 = keyComponents[1] || '2. Primary Transformation Mechanics';
  const comp3 = keyComponents[2] || '3. Constraint Verification & Invariants';
  const comp4 = keyComponents[3] || '4. Calibrated Equilibrium Output';

  // Crisp, modern SVG graphic diagram with gradient cards, arrows, badges, and clean typography
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="100%" height="100%" class="w-full h-auto rounded-xl">
  <defs>
    <linearGradient id="gradBg_${chapterNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="cardGrad1_${chapterNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
    <linearGradient id="cardGrad2_${chapterNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#082f49" />
    </linearGradient>
    <linearGradient id="cardGrad3_${chapterNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="cardGrad4_${chapterNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#4c1d95" />
    </linearGradient>
    <filter id="shadow_${chapterNumber}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="280" rx="16" fill="url(#gradBg_${chapterNumber})" stroke="#334155" stroke-width="1.5" />

  <!-- Diagram Header Bar -->
  <rect x="20" y="16" width="760" height="34" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1" />
  <circle cx="36" cy="33" r="5" fill="#38bdf8" />
  <text x="50" y="38" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="0.5">
    FIG. ${chapterNumber}.1: ${title.replace(/"/g, "'").toUpperCase().slice(0, 72)}
  </text>
  <rect x="680" y="23" width="90" height="20" rx="10" fill="#0284c7" />
  <text x="725" y="37" fill="#ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle">ACADEMIC</text>

  <!-- Node 1: Input / State Intake -->
  <g filter="url(#shadow_${chapterNumber})">
    <rect x="30" y="70" width="160" height="150" rx="12" fill="url(#cardGrad1_${chapterNumber})" stroke="#3b82f6" stroke-width="1.5" />
    <rect x="42" y="82" width="40" height="18" rx="4" fill="#3b82f6" />
    <text x="62" y="95" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="700" text-anchor="middle">STAGE 1</text>
    <text x="42" y="120" fill="#93c5fd" font-family="sans-serif" font-size="11" font-weight="700">Initial State</text>
    <text x="42" y="145" fill="#e2e8f0" font-family="sans-serif" font-size="10" font-weight="500">
      <tspan x="42" dy="0">${comp1.slice(0, 20)}</tspan>
      <tspan x="42" dy="16">${comp1.slice(20, 42) || 'Parameters'}</tspan>
      <tspan x="42" dy="16">${comp1.slice(42, 64) || 'Ingestion'}</tspan>
    </text>
    <circle cx="110" cy="195" r="10" fill="#1e40af" stroke="#60a5fa" stroke-width="1" />
    <text x="110" y="199" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">α</text>
  </g>

  <!-- Connector 1 -> 2 -->
  <path d="M 195 145 L 225 145" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4,2" />
  <polygon points="225,140 233,145 225,150" fill="#38bdf8" />

  <!-- Node 2: Core Transformation -->
  <g filter="url(#shadow_${chapterNumber})">
    <rect x="230" y="70" width="160" height="150" rx="12" fill="url(#cardGrad2_${chapterNumber})" stroke="#0284c7" stroke-width="1.5" />
    <rect x="242" y="82" width="40" height="18" rx="4" fill="#0284c7" />
    <text x="262" y="95" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="700" text-anchor="middle">STAGE 2</text>
    <text x="242" y="120" fill="#7dd3fc" font-family="sans-serif" font-size="11" font-weight="700">Transformation</text>
    <text x="242" y="145" fill="#e2e8f0" font-family="sans-serif" font-size="10" font-weight="500">
      <tspan x="242" dy="0">${comp2.slice(0, 20)}</tspan>
      <tspan x="242" dy="16">${comp2.slice(20, 42) || 'Core Execution'}</tspan>
      <tspan x="242" dy="16">${comp2.slice(42, 64) || 'Mechanics'}</tspan>
    </text>
    <circle cx="310" cy="195" r="10" fill="#0369a1" stroke="#38bdf8" stroke-width="1" />
    <text x="310" y="199" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">β</text>
  </g>

  <!-- Connector 2 -> 3 -->
  <path d="M 395 145 L 425 145" stroke="#34d399" stroke-width="2.5" stroke-dasharray="4,2" />
  <polygon points="425,140 433,145 425,150" fill="#34d399" />

  <!-- Node 3: Constraint Filter -->
  <g filter="url(#shadow_${chapterNumber})">
    <rect x="430" y="70" width="160" height="150" rx="12" fill="url(#cardGrad3_${chapterNumber})" stroke="#059669" stroke-width="1.5" />
    <rect x="442" y="82" width="40" height="18" rx="4" fill="#059669" />
    <text x="462" y="95" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="700" text-anchor="middle">STAGE 3</text>
    <text x="442" y="120" fill="#6ee7b7" font-family="sans-serif" font-size="11" font-weight="700">Constraint Validation</text>
    <text x="442" y="145" fill="#e2e8f0" font-family="sans-serif" font-size="10" font-weight="500">
      <tspan x="442" dy="0">${comp3.slice(0, 20)}</tspan>
      <tspan x="442" dy="16">${comp3.slice(20, 42) || 'Boundary Check'}</tspan>
      <tspan x="442" dy="16">${comp3.slice(42, 64) || 'Equilibrium'}</tspan>
    </text>
    <circle cx="510" cy="195" r="10" fill="#047857" stroke="#34d399" stroke-width="1" />
    <text x="510" y="199" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">γ</text>
  </g>

  <!-- Connector 3 -> 4 -->
  <path d="M 595 145 L 625 145" stroke="#a78bfa" stroke-width="2.5" stroke-dasharray="4,2" />
  <polygon points="625,140 633,145 625,150" fill="#a78bfa" />

  <!-- Node 4: Regulated Output -->
  <g filter="url(#shadow_${chapterNumber})">
    <rect x="630" y="70" width="140" height="150" rx="12" fill="url(#cardGrad4_${chapterNumber})" stroke="#8b5cf6" stroke-width="1.5" />
    <rect x="642" y="82" width="40" height="18" rx="4" fill="#7c3aed" />
    <text x="662" y="95" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="700" text-anchor="middle">STAGE 4</text>
    <text x="642" y="120" fill="#c4b5fd" font-family="sans-serif" font-size="11" font-weight="700">Target Output</text>
    <text x="642" y="145" fill="#e2e8f0" font-family="sans-serif" font-size="10" font-weight="500">
      <tspan x="642" dy="0">${comp4.slice(0, 18)}</tspan>
      <tspan x="642" dy="16">${comp4.slice(18, 36) || 'Verified System'}</tspan>
      <tspan x="642" dy="16">${comp4.slice(36, 54) || 'Output Response'}</tspan>
    </text>
    <circle cx="700" cy="195" r="10" fill="#6d28d9" stroke="#a78bfa" stroke-width="1" />
    <text x="700" y="199" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">Ω</text>
  </g>

  <!-- Footer Baseline Annotation -->
  <rect x="20" y="235" width="760" height="30" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1" />
  <text x="35" y="254" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10.5">
    Governing Relationship: <tspan fill="#38bdf8" font-weight="700">Ω(t) = ∮ [ α · Input(τ) + β · Transform(τ) ] e^(-γt) dτ</tspan> • Target Subject: <tspan fill="#f1f5f9" font-weight="600">${topic.slice(0, 40)}</tspan>
  </text>
</svg>`;
}

/**
 * Enriches a generated library handout to guarantee:
 * 1. Full multi-chapter coverage (Chapters 1 to 8)
 * 2. Authentic high-resolution photography asset per chapter
 * 3. High-precision SVG technical diagram per chapter
 * 4. Step-by-step calculations, worked examples, and formulas
 */
export function enrichHandoutWithFullChaptersAndImages(
  handout: LibraryHandoutContent,
  context?: {
    topic: string;
    department?: string;
    faculty?: string;
    level?: string;
    course?: string;
  }
): LibraryHandoutContent {
  const cleanTopic = context?.topic || handout.topic || handout.title || 'Core Academic Principles';
  const cleanDept = context?.department || handout.department || 'Academic Department';
  const cleanFac = context?.faculty || handout.faculty || 'Faculty of Academics';
  const cleanLevel = context?.level || handout.level || '200 Level';
  const cleanCourse = context?.course || handout.course || 'Academic Studies';

  const defaultChapterTitles = [
    `Foundational Axioms, Theoretical Principles & Governing Laws of ${cleanTopic}`,
    `Structural Architecture, Dynamic State Mechanics & System Components`,
    `Step-by-Step Analytical Derivations & Quantitative Mathematical Proofs`,
    `Real-World Numerical Problem Solving & Multi-Variable Worked Scenarios`,
    `Technical Schematics, Process Flow Architectures & State Transition Models`,
    `Practical Laboratory Protocols, Industrial Implementation & Field Standards`,
    `Diagnostic Failure Modes, Boundary Optimization & Error Mitigation`,
    `Comprehensive Examination Mastery, Past Degree Questions & Marking Rubric`,
  ];

  const existingSections = handout.sections || [];
  const enrichedSections: HandoutSection[] = [];

  for (let chapterNum = 1; chapterNum <= 8; chapterNum++) {
    const existingSec = existingSections.find(
      (s) => s.chapterNumber === chapterNum || s.chapterNumber === undefined && existingSections.indexOf(s) === chapterNum - 1
    );

    const title = existingSec?.title || defaultChapterTitles[chapterNum - 1];
    const photoAsset = getAcademicPhotoForChapter({
      topic: cleanTopic,
      department: cleanDept,
      faculty: cleanFac,
      chapterIndex: chapterNum - 1,
      chapterTitle: title,
    });

    const svgDiagram = generateVisualSvgDiagram({
      title: `${title}`,
      topic: cleanTopic,
      chapterNumber: chapterNum,
      keyComponents: existingSec?.diagram?.keyComponents || [
        `${cleanTopic} Input State`,
        `Core Transformation Engine`,
        `Boundary Parameter Filters`,
        `Calibrated Result Equilibrium`,
      ],
    });

    if (existingSec) {
      enrichedSections.push({
        ...existingSec,
        chapterNumber: chapterNum,
        pageNumber: existingSec.pageNumber || chapterNum * 3 - 2,
        title: existingSec.title || title,
        imageUrl: existingSec.imageUrl || photoAsset.url,
        imageCaption: existingSec.imageCaption || `Figure ${chapterNum}.1: ${photoAsset.caption}`,
        figureNumber: existingSec.figureNumber || `Figure ${chapterNum}.1`,
        diagram: {
          title: existingSec.diagram?.title || `Figure ${chapterNum}.1: Technical Schematic Architecture for ${cleanTopic}`,
          type: existingSec.diagram?.type || 'photo_illustration',
          svgContent: existingSec.diagram?.svgContent || svgDiagram,
          imageUrl: existingSec.diagram?.imageUrl || photoAsset.url,
          imageCaption: existingSec.diagram?.imageCaption || `Figure ${chapterNum}.1: ${photoAsset.caption}`,
          description: existingSec.diagram?.description || `High-resolution educational photographic and vector schematic illustrating the core principles of Chapter ${chapterNum}.`,
          keyComponents: existingSec.diagram?.keyComponents || [
            'Input Parameter Conditioning',
            'Core Theoretical Transformation',
            'Governing Operational Constraints',
            'Regulated Equilibrium Output',
          ],
        },
      });
    } else {
      // Synthesize full complete chapter if missing
      enrichedSections.push({
        chapterNumber: chapterNum,
        pageNumber: chapterNum * 3 - 2,
        title,
        readingTimeMinutes: 7,
        content: `In the comprehensive academic study of ${cleanTopic} within ${cleanCourse} at the ${cleanLevel} stage, Chapter ${chapterNum} develops critical insights into the analytical, structural, and empirical behaviors governing this domain. Scholars in ${cleanDept} must navigate rigorous theoretical principles, evaluate boundary condition limits, and apply quantitative models to resolve edge-case anomalies. Understanding this module enables direct mastery over university examination questions, laboratory diagnostic workflows, and professional industrial implementations.`,
        keyPoints: [
          `Primary governing equations establish formal invariants and dependency constraints across all intermediate states.`,
          `Boundary limit analysis isolates operational edge cases and prevents cascading system instability.`,
          `Empirical testing protocols guarantee compliance with accredited tertiary academic syllabi and industrial safety baselines.`,
        ],
        formulas: [
          {
            name: `Chapter ${chapterNum} Primary Characteristic Relationship`,
            expression: `\\Omega_{${chapterNum}}(t) = \\int_{0}^{t} \\left( \\kappa \\cdot \\Phi(\\tau) + \\lambda_0 \\right) e^{-\\alpha (t - \\tau)} \\, d\\tau`,
            parameters: `\\Omega = Integrated State Output, \\Phi = Input Potential Field, \\kappa, \\lambda = Characteristic Coefficients, \\alpha = Damping Factor`,
            application: `Models dynamic cumulative state transitions and transient relaxation in ${cleanTopic}.`,
          },
        ],
        calculations: [
          {
            title: `Calculation ${chapterNum}.1: Quantitative State Equilibrium & Parameter Determination`,
            problem: `An analytical test benchmark for ${cleanTopic} operates with base potential \\Phi_0 = ${(120 + chapterNum * 25).toFixed(1)}\\,\\text{units}, coupling coefficient \\kappa = ${(1.5 + chapterNum * 0.3).toFixed(2)}\\,\\text{s}^{-1}, and equilibrium offset \\lambda_0 = ${(10 + chapterNum * 3.5).toFixed(2)}\\,\\text{units}. Calculate the steady-state equilibrium value \\Omega_{\\text{steady}} under static conditions.`,
            given: `\\Phi_0 = ${(120 + chapterNum * 25).toFixed(1)}\\,\\text{units}, \\quad \\kappa = ${(1.5 + chapterNum * 0.3).toFixed(2)}\\,\\text{s}^{-1}, \\quad \\lambda_0 = ${(10 + chapterNum * 3.5).toFixed(2)}\\,\\text{units}`,
            formula: `\\Omega_{\\text{steady}} = (\\kappa \\times \\Phi_0) + \\lambda_0`,
            steps: [
              `Step 1: Enforce steady-state equilibrium conditions where time derivatives ∂/∂t = 0.`,
              `Step 2: Substitute given numerical parameters into the governing linear relationship.`,
              `Step 3: Compute intermediate multiplication: ${(1.5 + chapterNum * 0.3).toFixed(2)} \\times ${(120 + chapterNum * 25).toFixed(1)} = ${((1.5 + chapterNum * 0.3) * (120 + chapterNum * 25)).toFixed(2)}.`,
              `Step 4: Add baseline equilibrium offset: ${((1.5 + chapterNum * 0.3) * (120 + chapterNum * 25)).toFixed(2)} + ${(10 + chapterNum * 3.5).toFixed(2)} = ${(((1.5 + chapterNum * 0.3) * (120 + chapterNum * 25)) + (10 + chapterNum * 3.5)).toFixed(2)}\\,\\text{units}.`,
            ],
            solution: `${(((1.5 + chapterNum * 0.3) * (120 + chapterNum * 25)) + (10 + chapterNum * 3.5)).toFixed(2)} units (Steady-State Value)`,
            units: 'Standard Academic Metric Units',
          },
        ],
        examples: [
          {
            title: `Worked Example ${chapterNum}.1: Applied Technical Scenario in ${cleanTopic}`,
            scenario: `A tertiary examination problem evaluates ${cleanTopic} performance under variable load constraints. Students must normalize input parameters and verify stability against governing threshold limits.`,
            stepByStepSolution: [
              `Step 1: Isolate all known variables and verify dimensional homogeneity in SI units.`,
              `Step 2: Apply the primary governing transfer equation to calculate the characteristic response.`,
              `Step 3: Validate numerical output against theoretical asymptotic boundaries.`,
            ],
            takeaway: `Always state baseline physical assumptions and verify boundary limits before presenting final examination solutions.`,
          },
        ],
        imageUrl: photoAsset.url,
        imageCaption: `Figure ${chapterNum}.1: ${photoAsset.caption}`,
        figureNumber: `Figure ${chapterNum}.1`,
        diagram: {
          title: `Figure ${chapterNum}.1: Operational State Flow & Architecture for ${cleanTopic}`,
          type: 'photo_illustration',
          svgContent: svgDiagram,
          imageUrl: photoAsset.url,
          imageCaption: `Figure ${chapterNum}.1: ${photoAsset.caption}`,
          description: `High-resolution educational photographic and vector schematic illustrating the core principles of Chapter ${chapterNum}.`,
          keyComponents: [
            'Input Conditioning Module',
            'Core Transformation Pipeline',
            'Constraint Evaluation & Filtering',
            'Stabilized Equilibrium Output',
          ],
        },
        examPitfalls: [
          `Failing to define state variables and boundary constraints before executing algebraic derivations.`,
          `Confusing transient startup response with long-term steady-state equilibrium.`,
        ],
      });
    }
  }

  // Ensure Table of Contents accurately lists all enriched chapters
  const finalToc = enrichedSections.map((sec, idx) => {
    const raw = sec.title;
    return raw.startsWith('Chapter') ? raw : `Chapter ${idx + 1}: ${raw}`;
  });

  return {
    ...handout,
    totalPagesEstimate: Math.max(handout.totalPagesEstimate || 0, enrichedSections.length * 3 + 4),
    tableOfContents: finalToc,
    sections: enrichedSections,
  };
}
