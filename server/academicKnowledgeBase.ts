import fs from 'fs';
import path from 'path';

export interface AcademicDocumentRecord {
  id: string;
  title: string;
  faculty: string;
  department: string;
  courseCode?: string;
  level?: string;
  institutionType?: string;
  keywords: string[];
  summary: string;
  content: string;
  citations: string[];
  sourceType: 'curated_benchmark' | 'institution_syllabus' | 'admin_uploaded';
  createdAt: string;
}

export interface AcademicRetrievalResult {
  hasSpecificMaterial: boolean;
  sourceTitle: string;
  discipline: string;
  pedagogicalParadigm: string;
  levelExpectations: string;
  curriculumBenchmark: string;
  sourceExcerpts: string[];
  recommendedStructure: string[];
  cautionaryTopicBoundaries: string[];
  referenceCitations: string[];
}

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'server', 'knowledge_base');
const KNOWLEDGE_BASE_FILE = path.join(KNOWLEDGE_BASE_DIR, 'academic_materials.json');

// Ensure knowledge base directory exists
function ensureKnowledgeDir() {
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
  }
}

// In-memory + disk cache for external academic materials
let customAcademicDocuments: AcademicDocumentRecord[] = [];

function loadCustomAcademicDocuments() {
  try {
    ensureKnowledgeDir();
    if (fs.existsSync(KNOWLEDGE_BASE_FILE)) {
      const raw = fs.readFileSync(KNOWLEDGE_BASE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        customAcademicDocuments = parsed;
      }
    }
  } catch (err) {
    console.warn('[Academic Knowledge Base] Failed to read custom materials:', err);
  }
}

export function saveCustomAcademicDocument(doc: Omit<AcademicDocumentRecord, 'id' | 'createdAt'>): AcademicDocumentRecord {
  ensureKnowledgeDir();
  loadCustomAcademicDocuments();
  const newDoc: AcademicDocumentRecord = {
    ...doc,
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  customAcademicDocuments.unshift(newDoc);
  try {
    fs.writeFileSync(KNOWLEDGE_BASE_FILE, JSON.stringify(customAcademicDocuments, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Academic Knowledge Base] Failed to write custom materials:', err);
  }
  return newDoc;
}

export function listRegisteredAcademicDocuments(): AcademicDocumentRecord[] {
  loadCustomAcademicDocuments();
  return customAcademicDocuments;
}

// Initial load
loadCustomAcademicDocuments();

/**
 * Determine discipline and teaching paradigm from department & faculty
 */
function classifyAcademicDiscipline(faculty: string, department: string): {
  discipline: string;
  pedagogicalParadigm: string;
  suggestedStructure: string[];
} {
  const text = `${faculty} ${department}`.toLowerCase();

  if (text.includes('elect') || text.includes('circuit') || text.includes('power') || text.includes('telecom')) {
    return {
      discipline: 'Electrical and Electronic Engineering',
      pedagogicalParadigm: 'Rigorous engineering science: fundamental physical laws, circuit schematics, differential & algebraic circuit equations, SI units, worked circuit problems, and industrial applications.',
      suggestedStructure: [
        'Fundamental Circuit Axioms & Governing Laws',
        'Mathematical Formulations & Derivations from First Principles',
        'Circuit Schematics, Notations & Sign Conventions',
        'Systematic Analysis Methodologies',
        'Progressive Worked Circuit Problems (Basic to Exam-Grade)',
        'Practical Applications & Measurement Considerations',
      ],
    };
  }

  if (text.includes('mechanic') || text.includes('thermo') || text.includes('fluid') || text.includes('aero') || text.includes('mechatron')) {
    return {
      discipline: 'Mechanical Engineering',
      pedagogicalParadigm: 'Applied mechanics and thermodynamics: conservation laws (mass, momentum, energy), boundary conditions, free-body diagrams, parameter calculations, and design safety factors.',
      suggestedStructure: [
        'Physical Principles & Governing Laws',
        'System Boundaries, Free-Body Analysis & Assumptions',
        'Analytical Derivations & State Formulations',
        'Progressive Worked Engineering Calculations',
        'Industrial Machinery Applications & Failure Safeguards',
      ],
    };
  }

  if (text.includes('civil') || text.includes('structur') || text.includes('soil') || text.includes('survey') || text.includes('water resourc')) {
    return {
      discipline: 'Civil and Environmental Engineering',
      pedagogicalParadigm: 'Structural mechanics and geotechnics: equilibrium equations, load distributions, stress-strain behavior, Eurocode/British Standard/Nigerian Building Codes, and design criteria.',
      suggestedStructure: [
        'Structural & Geotechnical Governing Principles',
        'Analytical Formulations, Free-Body & Stress Distribution',
        'Design Codes, Material Properties & Safety Factors',
        'Step-by-Step Worked Structural Calculations',
        'Site Implementation, Construction Practice & Failure Modes',
      ],
    };
  }

  if (text.includes('comput') || text.includes('software') || text.includes('data sci') || text.includes('cyber') || text.includes('inform')) {
    return {
      discipline: 'Computer Science and Software Engineering',
      pedagogicalParadigm: 'Computational theory and software architecture: algorithmic complexity (Big-O), data invariants, memory mechanics, system architectures, pseudocode/code logic, and edge cases.',
      suggestedStructure: [
        'Core Computational Principles & Abstract Data Models',
        'Algorithmic Complexity, Memory Allocation & State Transitions',
        'Architecture, Component Interactions & Flow Diagrams',
        'Step-by-Step Traces, Pseudocode & Worked Implementations',
        'Enterprise Applications, Optimization & Security Considerations',
      ],
    };
  }

  if (text.includes('medic') || text.includes('surger') || text.includes('anat') || text.includes('physiol') || text.includes('pathol')) {
    return {
      discipline: 'Medicine and Clinical Sciences',
      pedagogicalParadigm: 'Evidence-based biomedical science: anatomical topography, physiological control loops, pathophysiology, clinical presentations, diagnostic criteria, and clinical management pathways.',
      suggestedStructure: [
        'Anatomical & Physiological Foundations',
        'Etiology, Molecular Mechanisms & Pathophysiology',
        'Clinical Manifestations & Diagnostic Workup',
        'Differential Diagnoses & Evidence-Based Management',
        'Clinical Scenarios with Progressive Diagnostic Reasoning',
      ],
    };
  }

  if (text.includes('nurs')) {
    return {
      discipline: 'Nursing Sciences',
      pedagogicalParadigm: 'Holistic clinical nursing: nursing process (assessment, diagnosis, planning, intervention, evaluation), pathophysiology, clinical medication administration, and patient safety protocols.',
      suggestedStructure: [
        'Biomedical Basis & Pathophysiological Overview',
        'Nursing Assessment & Clinical Manifestations',
        'Nursing Process: Care Planning & Priority Interventions',
        'Pharmacological Considerations & Safe Medication Delivery',
        'Clinical Case Scenarios & Patient Discharge Teaching',
      ],
    };
  }

  if (text.includes('pharm')) {
    return {
      discipline: 'Pharmacy and Pharmaceutical Sciences',
      pedagogicalParadigm: 'Pharmacodynamics and pharmacokinetics: drug receptors, mechanism of action, ADME profiles, dosage arithmetic, adverse reactions, and drug interactions.',
      suggestedStructure: [
        'Chemical Structure & Mechanism of Action',
        'Pharmacokinetics: Absorption, Distribution, Metabolism, Excretion',
        'Clinical Indications & Therapeutic Regimens',
        'Dosage Calculations, Adverse Effects & Contraindications',
        'Clinical Case Scenarios & Dispensing Considerations',
      ],
    };
  }

  if (text.includes('law') || text.includes('juris') || text.includes('legal')) {
    return {
      discipline: 'Law and Jurisprudence',
      pedagogicalParadigm: 'Legal doctrine: statutory provisions (e.g. 1999 Constitution, CAMA 2020, Evidence Act, Criminal/Penal Code), landmark judicial authorities, elements of legal claims, and the IRAC method.',
      suggestedStructure: [
        'Nature, Theoretical Foundations & Statutory Framework',
        'Essential Elements & Legal Doctrines',
        'Leading Judicial Precedents & Authoritative Case Analyses',
        'Defences, Exceptions, and Procedural Distinctions',
        'Comprehensive Problem Scenarios with Full IRAC Legal Resolution',
      ],
    };
  }

  if (text.includes('account') || text.includes('tax') || text.includes('audit')) {
    return {
      discipline: 'Accounting and Financial Reporting',
      pedagogicalParadigm: 'Financial accounting standards (IFRS/IPSAS): double-entry bookkeeping, recognition criteria, valuation rules, journal entries, ledger accounts, and balance sheet presentations.',
      suggestedStructure: [
        'Conceptual Framework & Relevant Accounting Standards (IFRS/IPSAS)',
        'Recognition, Measurement, and Presentation Criteria',
        'Accounting Treatments, Journal Entries & Ledger Postings',
        'Worked Comprehensive Financial Accounting Problems with Full Schedules',
        'Practical Auditing Pitfalls & Financial Statement Impact',
      ],
    };
  }

  if (text.includes('econ') || text.includes('financ') || text.includes('bank')) {
    return {
      discipline: 'Economics and Finance',
      pedagogicalParadigm: 'Economic modeling: microeconomic/macroeconomic equilibrium, mathematical optimization, marginal analysis, econometric indicators, and policy implications.',
      suggestedStructure: [
        'Theoretical Axioms & Economic Behavioral Assumptions',
        'Mathematical Models, Equations & Graphical Equilibrium',
        'Empirical Dynamics & Comparative Statics',
        'Worked Numerical Economic Problems & Optimizations',
        'Macroeconomic Policy Applications & Real-World Case Studies',
      ],
    };
  }

  if (text.includes('biolog') || text.includes('biochem') || text.includes('microbio') || text.includes('botany') || text.includes('zoolog')) {
    return {
      discipline: 'Biological and Life Sciences',
      pedagogicalParadigm: 'Biological systems: cellular structures, biochemical reaction pathways, genetic mechanisms, evolutionary/ecological dynamics, and experimental assays.',
      suggestedStructure: [
        'Cellular, Molecular & Structural Organization',
        'Biochemical Mechanisms, Pathways & Energetics',
        'Regulation, Homeostasis & Environmental Factors',
        'Experimental Methodologies & Data Interpretation',
        'Real-World Biotechnological & Ecological Applications',
      ],
    };
  }

  if (text.includes('chem')) {
    return {
      discipline: 'Chemical Sciences',
      pedagogicalParadigm: 'Chemical principles: molecular orbitals, thermodynamic state functions, reaction kinetics, curved-arrow reaction mechanisms, and stoichiometric quantitative calculations.',
      suggestedStructure: [
        'Fundamental Chemical Principles & Molecular Structure',
        'Reaction Mechanisms, Energetics & Kinetics',
        'Thermodynamic & Equilibrium Formulations',
        'Step-by-Step Stoichiometric & Analytical Worked Calculations',
        'Laboratory Synthesis & Industrial Chemical Applications',
      ],
    };
  }

  if (text.includes('physic')) {
    return {
      discipline: 'Physics',
      pedagogicalParadigm: 'Fundamental physics: fundamental laws, vector/differential formulations, dimensional analysis, derivations from first principles, and experimental validation.',
      suggestedStructure: [
        'Physical Principles & Governing Laws',
        'Mathematical Derivations from First Principles',
        'Boundary Conditions & Vector Analysis',
        'Progressive Quantitative Worked Problems with Full SI Units',
        'Experimental Verification & Modern Physical Applications',
      ],
    };
  }

  if (text.includes('math') || text.includes('statist')) {
    return {
      discipline: 'Mathematical Sciences',
      pedagogicalParadigm: 'Rigorous mathematics: formal definitions, axioms, stated theorems, step-by-step rigorous proofs, analytical methods, and progressive computational exercises.',
      suggestedStructure: [
        'Formal Axiomatic Definitions & Mathematical Framework',
        'Statement of Major Theorems, Lemmas & Corollaries',
        'Rigorous Step-by-Step Proofs from First Principles',
        'Analytical Methods & Computational Techniques',
        'Progressive Worked Examples (Foundational to Complex Proofs)',
      ],
    };
  }

  if (text.includes('educat') || text.includes('pedagog')) {
    return {
      discipline: 'Education and Instructional Pedagogy',
      pedagogicalParadigm: 'Educational science: learning theories (Behaviorist, Constructivist, Cognitivist), curriculum design (Bloom\'s Taxonomy, Tyler Model), instructional media, and psychometric assessment.',
      suggestedStructure: [
        'Theoretical Foundations & Psychological Underpinnings',
        'Curricular Models & Instructional Strategies',
        'Classroom Implementation & Behavioral Dynamics',
        'Measurement, Assessment & Evaluation Rubrics',
        'Practical Pedagogical Case Scenarios & Lesson Plans',
      ],
    };
  }

  // Default General Tertiary Academic
  return {
    discipline: 'Tertiary Academic Studies',
    pedagogicalParadigm: 'Comprehensive academic study: clear conceptual definitions, historical and theoretical evolution, structural analysis, analytical reasoning, and practical case studies.',
    suggestedStructure: [
      'Historical & Theoretical Foundations',
      'Core Principles, Frameworks & System Mechanics',
      'Analytical Models & Deep Theoretical Analysis',
      'Progressive Case Studies & Worked Applications',
      'Contemporary Issues, Examinations & Future Directions',
    ],
  };
}

/**
 * Determine academic level expectations
 */
function getLevelDepthProfile(level: string): string {
  const norm = level.toLowerCase();
  if (norm.includes('100') || norm.includes('nd i') || norm.includes('freshman') || norm.includes('nce i')) {
    return '100 Level / Introductory: Focus on clear foundational concepts, definitions, intuitive physical/logical analogies, fundamental laws, and progressive introductory worked problems. Avoid overly dense graduate abstraction, but maintain university-level rigor.';
  }
  if (norm.includes('200') || norm.includes('nd ii') || norm.includes('sophomore') || norm.includes('nce ii')) {
    return '200 Level / Intermediate: Establish solid theoretical and mathematical grounding. Introduce formal derivations, standard multi-parameter equations, balanced quantitative problem solving, and formal domain notation.';
  }
  if (norm.includes('300') || norm.includes('hnd i') || norm.includes('junior') || norm.includes('nce iii')) {
    return '300 Level / Advanced Undergraduate: Deep analytical depth, multi-variable interactions, state equations, system-level design/application considerations, and comprehensive exam-level analytical problems.';
  }
  if (norm.includes('400') || norm.includes('hnd ii') || norm.includes('senior')) {
    return '400 Level / Senior Professional: High-level specialization, industry-grade design standards, regulatory compliance, complex edge cases, critical comparative critiques, and advanced professional practice.';
  }
  if (norm.includes('500') || norm.includes('postgraduate') || norm.includes('m.sc') || norm.includes('phd') || norm.includes('finalist')) {
    return '500 Level / Specialist & Postgraduate: Master-level analytical rigor, cutting-edge research paradigms, mathematical proofs from first principles, fault analysis, and state-of-the-art developments.';
  }
  return 'Standard Tertiary Undergraduate Level: Balanced academic depth with clear theoretical principles, step-by-step worked examples, and comprehensive examination mastery.';
}

/**
 * Topic boundary analyzer:
 * Prevents topic drift (e.g. induction motors appearing in Kirchhoff's laws or Contract Law)
 */
function computeTopicBoundaries(topic: string, course: string, discipline: string): string[] {
  const t = topic.toLowerCase();
  const c = course.toLowerCase();
  const boundaries: string[] = [];

  // Crucial: Specific guard against the reported regression!
  if (t.includes('kirchhoff') || t.includes('kcl') || t.includes('kvl') || t.includes('circuit law') || t.includes('nodal') || t.includes('mesh')) {
    boundaries.push(
      'STRICT TOPIC FOCUS: This handout is STRICTLY on Kirchhoff\'s Laws and linear circuit network analysis.',
      'CRITICAL NEGATIVE CONSTRAINT: DO NOT introduce induction motor torque equations, stator copper losses, slip calculations, thermal derating Maiduguri, grounding grid resistance, or unrelated rotating machinery calculations.',
      'Every single module and calculation MUST focus exclusively on electric circuits, nodes, meshes, branches, branch currents, loop voltages, and sign conventions.'
    );
  } else if (t.includes('contract') || t.includes('offer') || t.includes('acceptance') || t.includes('consideration')) {
    boundaries.push(
      'STRICT TOPIC FOCUS: Focus exclusively on the law of contract (consensus ad idem, communication of acceptance, postal rule, intention to create legal relations).',
      'CRITICAL NEGATIVE CONSTRAINT: DO NOT wander into unrelated criminal law, tort negligence, or engineering formulas.'
    );
  } else if (t.includes('photo') || t.includes('chloroplast') || t.includes('calvin')) {
    boundaries.push(
      'STRICT TOPIC FOCUS: Focus exclusively on plant cellular bioenergetics, light and dark reactions, thylakoid proton gradients, and carbon fixation.',
      'CRITICAL NEGATIVE CONSTRAINT: DO NOT include animal organ systems or unrelated mechanical engineering concepts.'
    );
  } else if (t.includes('balance sheet') || t.includes('ledger') || t.includes('trial balance') || t.includes('double entry')) {
    boundaries.push(
      'STRICT TOPIC FOCUS: Focus exclusively on accounting principles, debit/credit mechanics, financial statements, and IFRS/GAAP disclosure.',
      'CRITICAL NEGATIVE CONSTRAINT: DO NOT introduce unrelated macroeconomic inflation debates or physical science formulas.'
    );
  } else {
    boundaries.push(
      `STRICT TOPIC FOCUS: Every module, definition, formula, worked example, and review question MUST be directly and strictly centered on "${topic}".`,
      `CRITICAL NEGATIVE CONSTRAINT: Do NOT introduce extraneous engineering equipment, induction motors, industrial thermal derating, or unrelated sub-disciplines unless genuinely essential to explaining "${topic}".`
    );
  }

  return boundaries;
}

/**
 * RAG Retrieval function:
 * Searches custom academic files and accredited curriculum benchmarks for relevant academic source material.
 */
export function retrieveAcademicKnowledge(params: {
  institutionType: string;
  institution?: string;
  faculty: string;
  department: string;
  level: string;
  course: string;
  topic: string;
}): AcademicRetrievalResult {
  const { faculty, department, level, course, topic, institutionType } = params;

  loadCustomAcademicDocuments();

  const { discipline, pedagogicalParadigm, suggestedStructure } = classifyAcademicDiscipline(faculty, department);
  const levelExpectations = getLevelDepthProfile(level);
  const cautionaryTopicBoundaries = computeTopicBoundaries(topic, course, discipline);

  // 1. Search in custom uploaded/stored academic documents
  const searchTerms = [topic, course, department].map((s) => s.toLowerCase());
  const matchedDocs = customAcademicDocuments.filter((doc) => {
    const docText = `${doc.title} ${doc.keywords.join(' ')} ${doc.summary} ${doc.content}`.toLowerCase();
    return searchTerms.some((term) => docText.includes(term));
  });

  const hasSpecificCustomMaterial = matchedDocs.length > 0;
  const sourceExcerpts: string[] = [];
  const referenceCitations: string[] = [];

  if (hasSpecificCustomMaterial) {
    matchedDocs.slice(0, 3).forEach((d) => {
      sourceExcerpts.push(`[Source: ${d.title}] ${d.summary}\n${d.content.slice(0, 600)}...`);
      referenceCitations.push(...d.citations);
    });
  }

  // 2. National benchmark standard based on institution type
  const benchmarkName =
    institutionType === 'Polytechnic'
      ? 'National Board for Technical Education (NBTE) Approved National Diploma & Higher National Diploma Curriculum Standards'
      : institutionType === 'College of Education'
      ? 'National Commission for Colleges of Education (NCCE) Minimum Academic Standards'
      : 'National Universities Commission (NUC) Core Curriculum and Minimum Academic Standards (CCMAS)';

  return {
    hasSpecificMaterial: hasSpecificCustomMaterial,
    sourceTitle: hasSpecificCustomMaterial ? matchedDocs[0].title : `${benchmarkName} - ${discipline}`,
    discipline,
    pedagogicalParadigm,
    levelExpectations,
    curriculumBenchmark: benchmarkName,
    sourceExcerpts,
    recommendedStructure: suggestedStructure,
    cautionaryTopicBoundaries,
    referenceCitations: referenceCitations.length > 0 ? referenceCitations : [
      `${discipline} Departmental Course Outline & Syllabus, Accredited Tertiary Curriculum Standard.`,
      `${benchmarkName}, Federal Ministry of Education.`,
    ],
  };
}
