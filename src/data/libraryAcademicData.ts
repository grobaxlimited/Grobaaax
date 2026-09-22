export type InstitutionCategory =
  | 'University'
  | 'Polytechnic'
  | 'College of Education'
  | 'College of Health & Nursing'
  | 'Specialized Institute';

export interface CourseItem {
  code: string;
  title: string;
  level: string;
  units?: number;
  description: string;
  coreTopics: string[];
  category?: InstitutionCategory;
}

export interface DepartmentData {
  name: string;
  codePrefix: string;
  description?: string;
  courses: CourseItem[];
}

export interface FacultyData {
  faculty: string;
  iconName: string;
  description: string;
  category: InstitutionCategory;
  departments: DepartmentData[];
}

export interface InstitutionCategoryMeta {
  id: InstitutionCategory;
  name: string;
  shortLabel: string;
  badgeLabel: string;
  iconName: string;
  facultyNomenclature: string;
  levels: string[];
  description: string;
}

export const INSTITUTION_CATEGORIES: InstitutionCategoryMeta[] = [
  {
    id: 'University',
    name: 'Universities (Federal, State & Private)',
    shortLabel: 'Universities',
    badgeLabel: 'University Academic Research',
    iconName: 'GraduationCap',
    facultyNomenclature: 'Faculties & Colleges',
    levels: [
      '100 Level (Freshman)',
      '200 Level (Sophomore)',
      '300 Level (Junior)',
      '400 Level (Senior)',
      '500 Level (Finalist / Eng / Med)',
      'Postgraduate (Masters / PGD / PhD)',
    ],
    description: 'Degree-awarding institutions (B.Sc, B.Eng, MBBS, B.A, LL.B, M.Sc, PhD) focusing on academic theory, mathematical rigor, and research methodologies.',
  },
  {
    id: 'Polytechnic',
    name: 'Polytechnics & Monotechnics',
    shortLabel: 'Polytechnics',
    badgeLabel: 'Polytechnic Applied Technology',
    iconName: 'Cpu',
    facultyNomenclature: 'Schools & Directorates',
    levels: [
      'ND I (National Diploma Year 1)',
      'ND II (National Diploma Year 2)',
      'HND I (Higher National Diploma Year 1)',
      'HND II (Higher National Diploma Year 2)',
      'Post-HND & Professional Certifications',
    ],
    description: 'Technical and vocational institutions (ND/HND) centered on applied sciences, engineering workshops, laboratory testing, industrial design, and practical skills.',
  },
  {
    id: 'College of Education',
    name: 'Colleges of Education',
    shortLabel: 'Colleges of Education',
    badgeLabel: 'Teacher Pedagogy & Education',
    iconName: 'BookOpen',
    facultyNomenclature: 'Schools of Education',
    levels: [
      'NCE I (Year 1)',
      'NCE II (Year 2)',
      'NCE III (Year 3 Finalist)',
      'B.Ed Affiliation (300L / 400L)',
    ],
    description: 'Teacher education institutions (NCE / B.Ed) emphasizing pedagogical science, curriculum development, instructional psychology, micro-teaching, and lesson delivery.',
  },
  {
    id: 'College of Health & Nursing',
    name: 'Colleges of Health Technology & Nursing / Midwifery',
    shortLabel: 'Health Tech & Nursing',
    badgeLabel: 'Clinical Sciences & Healthcare',
    iconName: 'Activity',
    facultyNomenclature: 'Schools & Professional Health Departments',
    levels: [
      'Year 1 (Foundations / Pre-Clinical)',
      'Year 2 (Clinical & Practicum)',
      'Year 3 (Fieldwork & Licensure)',
      'Year 4 (Professional Diploma / HND)',
    ],
    description: 'Professional healthcare colleges training Community Health Extension Workers (CHEW/JCHEW), Registered Nurses & Midwives, Medical Lab Techs, and Pharmacy Techs.',
  },
  {
    id: 'Specialized Institute',
    name: 'Specialized Academies & Monotechnics (Maritime, Aviation, Petroleum, Agriculture)',
    shortLabel: 'Specialized Institutes',
    badgeLabel: 'Specialized Industry Standards',
    iconName: 'Compass',
    facultyNomenclature: 'Specialized Academies & Directorates',
    levels: [
      'Cadet / Year 1 (ND I)',
      'Intermediate / Year 2 (ND II)',
      'Advanced / Year 3 (HND I)',
      'Master / Year 4 (HND II / Licensure)',
    ],
    description: 'Sector-specific institutes including Maritime Academies (Nautical/Marine), Aviation Technology (AME/Piloting), Petroleum Institutes (Drilling/Refining), and Federal Colleges of Agriculture.',
  },
];

// Universal levels list
export const ACADEMIC_LEVELS = [
  'All Levels (Comprehensive Directory)',
  '100 Level (Freshman)',
  '200 Level (Sophomore)',
  '300 Level (Junior)',
  '400 Level (Senior)',
  '500 Level (Finalist / Eng / Med)',
  'Postgraduate (Masters / PGD / PhD)',
  'ND I (National Diploma Year 1)',
  'ND II (National Diploma Year 2)',
  'HND I (Higher National Diploma Year 1)',
  'HND II (Higher National Diploma Year 2)',
  'NCE I (Year 1)',
  'NCE II (Year 2)',
  'NCE III (Year 3 Finalist)',
  'Year 1 (Foundations / Pre-Clinical)',
  'Year 2 (Clinical & Practicum)',
  'Year 3 (Fieldwork & Licensure)',
  'Year 4 (Professional Diploma / HND)',
];

export const ACADEMIC_CURRICULUM_DATA: FacultyData[] = [
  // =========================================================================
  // 1. UNIVERSITIES (ALL ACCREDITED FACULTIES & DEPARTMENTS)
  // =========================================================================
  {
    faculty: 'Faculty of Science & Computing',
    iconName: 'Laptop',
    description: 'Mathematical, computational, physical, chemical, and biological sciences.',
    category: 'University',
    departments: [
      {
        name: 'Computer Science',
        codePrefix: 'CSC',
        description: 'Algorithmic computing, software architecture, artificial intelligence, and systems.',
        courses: [
          {
            code: 'CSC 101',
            title: 'Introduction to Computer Science & Problem Solving',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Foundations of computer systems, von Neumann architecture, binary arithmetic, flowcharting, and introductory programming in Python.',
            coreTopics: ['Von Neumann Architecture', 'Number Systems & Binary Logic', 'Algorithms & Flowcharting', 'Introduction to Python Control Structures', 'Memory Hierarchies & Operating System Basics'],
          },
          {
            code: 'CSC 201',
            title: 'Computer Programming I (Object-Oriented C++/Java)',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Object-oriented programming paradigms, classes, inheritance, polymorphism, encapsulation, memory pointers, and dynamic allocation.',
            coreTopics: ['Class Structure & Objects', 'Inheritance & Polymorphism', 'Encapsulation & Access Modifiers', 'Pointer Arithmetic & Memory Management', 'Exception Handling & File Streams'],
          },
          {
            code: 'CSC 202',
            title: 'Data Structures & Algorithms',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Asymptotic complexity analysis, linear and non-linear data structures, trees, hash tables, graphs, sorting algorithms, and recursion.',
            coreTopics: ['Asymptotic Big-O Analysis', 'Linked Lists, Stacks & Queues', 'Binary Search Trees & AVL Balancing', 'Graph Traversal (DFS, BFS, Dijkstra)', 'Hash Tables & Collision Resolution'],
          },
          {
            code: 'CSC 301',
            title: 'Operating Systems & Concurrency',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Process management, multithreading, CPU scheduling algorithms, synchronization primitives, semaphores, deadlocks, and virtual memory paging.',
            coreTopics: ['Process Control Blocks & Context Switching', 'CPU Scheduling (Round Robin, SJF, Priority)', 'Semaphores, Mutex & Dining Philosophers', 'Banker’s Algorithm & Deadlock Avoidance', 'Virtual Memory, Page Replacement & TLB'],
          },
          {
            code: 'CSC 305',
            title: 'Database Management Systems (DBMS)',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Relational algebra, SQL queries, normalization (1NF to BCNF), ACID transactions, B-tree indexing, and NoSQL architecture.',
            coreTopics: ['Relational Data Model & E-R Diagrams', 'SQL DDL, DML & Subqueries', 'Database Normalization (1NF, 2NF, 3NF, BCNF)', 'ACID Properties & Transaction Scheduling', 'Indexing (B-Trees, Hash Indexes) & Query Optimization'],
          },
          {
            code: 'CSC 401',
            title: 'Artificial Intelligence & Machine Learning',
            level: '400 Level (Senior)',
            units: 3,
            description: 'Heuristic search algorithms, neural networks, supervised/unsupervised learning, gradient descent, natural language processing, and deep learning.',
            coreTopics: ['A* Search & Minimax Alpha-Beta Pruning', 'Linear & Logistic Regression Models', 'Neural Networks & Backpropagation', 'Convolutional & Recurrent Neural Architectures', 'Reinforcement Learning & Q-Learning'],
          },
          {
            code: 'CSC 408',
            title: 'Compiler Construction & Automata Theory',
            level: '400 Level (Senior)',
            units: 3,
            description: 'Regular expressions, finite automata, context-free grammars, LL/LR parsing, semantic analysis, and intermediate code generation.',
            coreTopics: ['DFA, NFA & Regular Expressions', 'Lexical Analysis & Tokenization', 'Context-Free Grammars & LL(1)/LR(1) Parsers', 'Syntax-Directed Translation & Abstract Syntax Trees', 'Intermediate Code Generation & Optimization'],
          },
        ],
      },
      {
        name: 'Software Engineering & IT',
        codePrefix: 'SEN',
        description: 'Software lifecycle, enterprise architecture, agile practices, cloud computing, and DevOps.',
        courses: [
          {
            code: 'SEN 201',
            title: 'Software Engineering Principles & Methodologies',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'SDLC models, Waterfall, Agile Scrum, requirements engineering, user stories, and UML modeling.',
            coreTopics: ['Agile Scrum & Kanban Methodologies', 'Software Requirements Specification (SRS)', 'UML Class, Sequence & Activity Diagrams', 'Software Verification & Validation', 'Code Quality & Refactoring'],
          },
          {
            code: 'SEN 302',
            title: 'Software Architecture & Design Patterns',
            level: '300 Level (Junior)',
            units: 3,
            description: 'GoF design patterns, microservices architecture, MVC, event-driven systems, and API design.',
            coreTopics: ['Creational Patterns (Singleton, Factory, Builder)', 'Structural Patterns (Adapter, Composite, Proxy)', 'Behavioral Patterns (Observer, Strategy, Command)', 'Microservices & RESTful API Architecture', 'Cloud Deployment & Containerization (Docker, Kubernetes)'],
          },
        ],
      },
      {
        name: 'Cybersecurity & Data Science',
        codePrefix: 'CYB',
        description: 'Information security, cryptography, network defense, ethical hacking, and predictive data analytics.',
        courses: [
          {
            code: 'CYB 301',
            title: 'Cryptography & Network Security',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Symmetric & asymmetric encryption, AES, RSA, Diffie-Hellman, SHA hashing, TLS/SSL, firewalls, and penetration testing.',
            coreTopics: ['Symmetric Ciphers (DES, AES, Block Cipher Modes)', 'Public Key Cryptography (RSA, ECC, Diffie-Hellman)', 'Cryptographic Hash Functions (SHA-256) & HMAC', 'Digital Signatures & PKI Infrastructure', 'Network Firewalls, IDS/IPS & Zero Trust'],
          },
          {
            code: 'DAT 302',
            title: 'Applied Data Science & Statistical Learning',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Exploratory data analysis, probability distributions, random forests, clustering, dimensionality reduction (PCA), and big data frameworks.',
            coreTopics: ['Exploratory Data Analysis with Pandas/NumPy', 'Supervised Learning (Random Forests, SVM)', 'Unsupervised Clustering (K-Means, Hierarchical)', 'Principal Component Analysis (PCA)', 'Hypothesis Testing & Statistical Inference'],
          },
        ],
      },
      {
        name: 'Mathematics',
        codePrefix: 'MTH',
        description: 'Pure and applied mathematics, calculus, differential equations, real analysis, and topology.',
        courses: [
          {
            code: 'MTH 101',
            title: 'Elementary Mathematics I (Algebra & Trigonometry)',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Set theory, quadratic equations, mathematical induction, binomial theorem, complex numbers, matrices, and circular functions.',
            coreTopics: ['Set Operations & Venn Diagrams', 'Theory of Quadratic Equations & Polynomials', 'Mathematical Induction & Binomial Expansion', 'Complex Numbers (Argand Diagrams & De Moivre’s Theorem)', 'Trigonometric Identities & Equations'],
          },
          {
            code: 'MTH 201',
            title: 'Mathematical Methods & Differential Equations',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'First and second order ODEs, integrating factors, Laplace transforms, Fourier series, and eigenvalue boundary problems.',
            coreTopics: ['First-Order Differential Equations (Separable, Exact, Linear)', 'Second-Order Linear Homogeneous & Non-Homogeneous ODEs', 'Laplace Transforms & Inverse Transforms', 'Fourier Series & Harmonic Analysis', 'Partial Differential Equations (Wave & Heat Equations)'],
          },
          {
            code: 'MTH 301',
            title: 'Real Analysis & Metric Spaces',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Axioms of real numbers, Bolzano-Weierstrass theorem, Riemann integration, metric spaces, convergence, and compact sets.',
            coreTopics: ['Completeness Axiom & Supremum/Infimum', 'Sequences, Cauchy Criteria & Series Convergence', 'Riemann-Stieltjes Integral & Fundamental Theorem of Calculus', 'Metric Spaces, Open/Closed Sets & Continuity', 'Compactness & Connectedness in R^n'],
          },
        ],
      },
      {
        name: 'Physics & Electronics',
        codePrefix: 'PHY',
        description: 'Classical mechanics, electromagnetism, optics, thermodynamics, quantum physics, and semiconductor electronics.',
        courses: [
          {
            code: 'PHY 101',
            title: 'General Physics I (Mechanics, Thermal Physics & Waves)',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Kinematics, Newton’s laws of motion, work-energy theorem, rotational dynamics, gravitation, elasticity, fluid mechanics, and thermodynamics.',
            coreTopics: ['Vectors & Kinematics in 2D/3D', 'Newton’s Laws & Friction Dynamics', 'Work, Kinetic Energy & Conservation of Energy', 'Rotational Mechanics & Moment of Inertia', 'First & Second Laws of Thermodynamics'],
          },
          {
            code: 'PHY 202',
            title: 'Electromagnetism & Maxwell’s Equations',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Coulomb’s law, Gauss’s law, Biot-Savart law, Ampere’s circuital law, Faraday’s induction, and Maxwell’s four unified field equations.',
            coreTopics: ['Electric Field, Potential & Gauss’s Law', 'Capacitance & Dielectric Polarization', 'Magnetic Forces, Biot-Savart & Ampere’s Law', 'Faraday’s Law of Induction & Lenz’s Law', 'Maxwell’s Equations & Electromagnetic Wave Propagation'],
          },
          {
            code: 'PHY 301',
            title: 'Quantum Mechanics & Atomic Structure',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Wave-particle duality, Schrödinger wave equation, operators, potential wells, harmonic oscillator, and hydrogen atom energy levels.',
            coreTopics: ['Photoelectric Effect & Compton Scattering', 'Time-Dependent & Time-Independent Schrödinger Equation', 'Particle in an Infinite Potential Well (1D Box)', 'Quantum Harmonic Oscillator & Ladder Operators', 'Hydrogen Atom Quantum Numbers & Angular Momentum'],
          },
        ],
      },
      {
        name: 'Chemistry & Industrial Chemistry',
        codePrefix: 'CHM',
        description: 'Physical chemistry, organic reaction mechanisms, inorganic coordination chemistry, and analytical spectrometry.',
        courses: [
          {
            code: 'CHM 101',
            title: 'General Chemistry I (Physical & Inorganic Chemistry)',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Atomic structure, periodic trends, chemical bonding, stoichiometry, gas laws, chemical equilibria, and acid-base buffers.',
            coreTopics: ['Quantum Numbers & Electronic Configuration', 'Ionic, Covalent & Metallic Chemical Bonding', 'Ideal Gas Law & Real Gas Van der Waals Equations', 'Chemical Kinetics & Reaction Rates', 'Acid-Base Equilibria, pH & Buffer Solutions'],
          },
          {
            code: 'CHM 201',
            title: 'Organic Chemistry II (Functional Groups & Reaction Mechanisms)',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Alkanes, alkenes, alkynes, aromatic compounds, electrophilic aromatic substitution, nucleophilic addition, and stereochemistry.',
            coreTopics: ['Electrophilic Addition & Markovnikov Rule', 'Nucleophilic Substitution (SN1 vs SN2 Mechanisms)', 'Elimination Reactions (E1 vs E2)', 'Electrophilic Aromatic Substitution (Nitration, Halogenation)', 'Chirality, Enantiomers & Optical Isomerism'],
          },
          {
            code: 'CHM 305',
            title: 'Instrumental Methods of Chemical Analysis',
            level: '300 Level (Junior)',
            units: 3,
            description: 'UV-Visible spectroscopy, Infrared (FTIR), Nuclear Magnetic Resonance (1H & 13C NMR), Mass Spectrometry, and Chromatography (HPLC/GC).',
            coreTopics: ['Beer-Lambert Law & UV-Vis Spectrophotometry', 'FTIR Spectroscopy & Functional Group Vibration', 'Proton & Carbon-13 NMR Spectroscopy', 'Mass Spectrometry & Molecular Ion Fragmentation', 'Gas Chromatography & High-Performance Liquid Chromatography'],
          },
        ],
      },
      {
        name: 'Biochemistry & Molecular Biology',
        codePrefix: 'BCH',
        description: 'Enzymology, metabolic pathways, glycolysis, citric acid cycle, lipid metabolism, and recombinant DNA.',
        courses: [
          {
            code: 'BCH 201',
            title: 'General Biochemistry I (Biomolecules & Enzymes)',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Structure and properties of amino acids, proteins, carbohydrates, lipids, nucleic acids, and enzyme kinetics (Michaelis-Menten).',
            coreTopics: ['Amino Acid Structures & Peptide Bond Synthesis', 'Protein Primary, Secondary, Tertiary & Quaternary Structure', 'Carbohydrate Monosaccharides & Polysaccharides', 'Lipid Membranes & Fatty Acid Classification', 'Michaelis-Menten Enzyme Kinetics & Lineweaver-Burk Plots'],
          },
          {
            code: 'BCH 301',
            title: 'Intermediary Metabolism & Bioenergetics',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Glycolysis, Gluconeogenesis, TCA Cycle, Oxidative Phosphorylation, Beta-oxidation of fatty acids, and ATP synthase mechanics.',
            coreTopics: ['Glycolytic Pathway Steps & Rate-Limiting Enzymes', 'Tricarboxylic Acid (Krebs/TCA) Cycle', 'Mitochondrial Electron Transport Chain Complexes', 'Chemiosmotic ATP Synthase Mechanism', 'Beta-Oxidation of Saturated & Unsaturated Fatty Acids'],
          },
        ],
      },
      {
        name: 'Microbiology & Biotechnology',
        codePrefix: 'MCB',
        description: 'Bacteriology, virology, immunology, mycology, environmental microbiology, and industrial fermentation.',
        courses: [
          {
            code: 'MCB 201',
            title: 'General Microbiology & Microbial Physiology',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Microbial taxonomy, Gram staining, cell wall chemistry, bacterial growth curve, sterilization methods, and culturing techniques.',
            coreTopics: ['Gram-Positive vs Gram-Negative Cell Wall Architecture', 'Bacterial Growth Kinetics (Lag, Log, Stationary Phases)', 'Physical & Chemical Sterilization Principles', 'Bacterial Culture Media Preparation & Inoculation', 'Antimicrobial Susceptibility Testing (Kirby-Bauer Disk Diffusion)'],
          },
        ],
      },
      {
        name: 'Geology & Applied Geophysics',
        codePrefix: 'GLY',
        description: 'Mineralogy, petrology, structural geology, seismic exploration, stratigraphy, and hydrogeology.',
        courses: [
          {
            code: 'GLY 201',
            title: 'Physical Geology, Mineralogy & Petrology',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Earth structure, plate tectonics, mineral crystallization, rock-forming minerals, igneous, sedimentary, and metamorphic petrogenesis.',
            coreTopics: ['Plate Tectonics & Continental Drift Mechanics', 'Bowen’s Reaction Series & Igneous Petrogenesis', 'Sedimentary Basin Formation & Stratification', 'Metamorphic Grades & Metasomatism', 'Seismic Reflection & Refraction Surveying'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Engineering & Technology',
    iconName: 'Cpu',
    description: 'Applied engineering design, mechanics, electronics, civil infrastructure, chemical processes, and mechatronics.',
    category: 'University',
    departments: [
      {
        name: 'Mechanical Engineering',
        codePrefix: 'MEE',
        description: 'Applied thermodynamics, machine design, fluid mechanics, heat transfer, CAD/CAM, and robotics.',
        courses: [
          {
            code: 'MEE 201',
            title: 'Engineering Mechanics (Statics & Dynamics)',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Vector forces, moments, 2D/3D equilibrium, truss analysis (methods of joints/sections), friction, kinematics, and kinetics of particles.',
            coreTopics: ['Force Vectors & Moment Equilibria', 'Truss Analysis (Method of Joints & Sections)', 'Centroids, Center of Gravity & Moment of Inertia', 'Kinematics & Kinetics of Rigid Bodies', 'Work-Energy & Impulse-Momentum Principles'],
          },
          {
            code: 'MEE 311',
            title: 'Applied Engineering Thermodynamics',
            level: '300 Level (Junior)',
            units: 3,
            description: 'First and second laws of thermodynamics, entropy, Rankine cycle, Brayton gas turbine cycle, Otto/Diesel cycles, and psychrometrics.',
            coreTopics: ['Control Volume First Law Energy Balance', 'Second Law & Clausius Inequality Entropy Calculations', 'Rankine Steam Power Cycle with Superheat & Reheat', 'Brayton Gas Turbine Cycle with Intercooling & Regeneration', 'Otto, Diesel & Dual Combustion Air-Standard Cycles'],
          },
          {
            code: 'MEE 315',
            title: 'Fluid Mechanics & Hydraulic Machinery',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Fluid statics, Bernoulli equation, Navier-Stokes equations, pipe flow friction (Moody chart), boundary layers, and centrifugal pumps.',
            coreTopics: ['Hydrostatic Pressure & Buoyancy Calculations', 'Bernoulli Equation & Torricelli’s Theorem', 'Navier-Stokes Equations & Continuity Formulation', 'Laminar vs Turbulent Pipe Flow & Darcy-Weisbach Friction Factor', 'Centrifugal Pump Performance Curves & Cavitation (NPSH)'],
          },
          {
            code: 'MEE 401',
            title: 'Machine Design & Stress Analysis',
            level: '400 Level (Senior)',
            units: 3,
            description: 'Static failure theories (Von Mises, Tresca), fatigue failure (S-N curve, Goodman diagram), shaft design, gears, bearings, and bolted joints.',
            coreTopics: ['Von Mises & Maximum Shear Stress Failure Theories', 'High-Cycle Fatigue & Modified Goodman Diagram', 'Power Transmission Shaft Design with Combined Loading', 'Spur, Helical & Bevel Gear Kinematics & Stress', 'Rolling-Contact Bearing Life & Dynamic Load Ratings'],
          },
        ],
      },
      {
        name: 'Electrical & Electronic Engineering',
        codePrefix: 'EEE',
        description: 'Circuit analysis, analog/digital electronics, power systems, electromagnetism, signals and control systems.',
        courses: [
          {
            code: 'EEE 201',
            title: 'Electric Circuit Theory I (DC & AC Circuits)',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Ohm’s law, Kirchhoff’s laws (KVL/KCL), Thevenin and Norton theorems, superposition, AC phasors, RLC resonance, and 3-phase power.',
            coreTopics: ['Kirchhoff’s Current & Voltage Laws (KVL/KCL)', 'Mesh & Nodal Circuit Analysis Techniques', 'Thevenin & Norton Equivalent Circuits', 'Sinusoidal Steady-State AC Phasor Calculations', 'Series & Parallel RLC Resonant Circuits & Quality Factor'],
          },
          {
            code: 'EEE 301',
            title: 'Analog Electronics & Semiconductor Devices',
            level: '300 Level (Junior)',
            units: 3,
            description: 'PN junction diode physics, BJT/MOSFET amplifiers, small-signal models, operational amplifiers (inverting/non-inverting), and active filters.',
            coreTopics: ['Bipolar Junction Transistor (BJT) Biasing & Small-Signal Models', 'MOSFET Characteristics & Amplifier Topologies', 'Operational Amplifier Configurations (Inverting, Non-Inverting, Summing)', 'Negative Feedback & Gain-Bandwidth Product', 'Active Sallen-Key Low-Pass & High-Pass Filters'],
          },
          {
            code: 'EEE 305',
            title: 'Control Systems Engineering',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Transfer functions, block diagram reduction, Routh-Hurwitz stability criterion, Root Locus, Bode plots, Nyquist criterion, and PID tuning.',
            coreTopics: ['Laplace Transform Modeling & Transfer Functions', 'Block Diagram Algebra & Mason’s Gain Formula', 'Routh-Hurwitz Stability Criterion', 'Root Locus Design & Transient Response Specs', 'Bode Frequency Response & PID Controller Tuning (Ziegler-Nichols)'],
          },
          {
            code: 'EEE 401',
            title: 'Power Systems Analysis & High Voltage',
            level: '400 Level (Senior)',
            units: 3,
            description: 'Per-unit systems, transmission line modeling, power flow (Gauss-Seidel, Newton-Raphson), symmetrical/unsymmetrical faults, and protection relays.',
            coreTopics: ['Per-Unit Impedance & Power Calculations', 'Transmission Line Models (Short, Medium, Long Nominal-Pi)', 'Power Flow Analysis (Newton-Raphson Method)', 'Symmetrical 3-Phase & Symmetrical Components Unsymmetrical Faults', 'Overcurrent & Differential Protection Relaying'],
          },
        ],
      },
      {
        name: 'Civil & Structural Engineering',
        codePrefix: 'CVE',
        description: 'Structural mechanics, reinforced concrete design, soil mechanics, hydrology, and highway engineering.',
        courses: [
          {
            code: 'CVE 201',
            title: 'Strength of Materials & Mechanics of Deformable Bodies',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Axial stress/strain, shear and bending moment diagrams (SFD/BMD), beam flexure formula, torsion of circular shafts, and Mohr’s circle.',
            coreTopics: ['Direct Stress, Strain & Young’s Modulus Elasticity', 'Shear Force & Bending Moment Diagrams for Cantilevers & Beams', 'Flexural Formula for Beam Bending Stresses', 'Torsional Shear Stress in Circular Shafts', '2D Plane Stress Transformation & Mohr’s Circle'],
          },
          {
            code: 'CVE 301',
            title: 'Reinforced Concrete Structural Design',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Limit state design (Eurocode 2 / BS 8110), singly and doubly reinforced beam bending, shear reinforcement (stirrups), slabs, and column design.',
            coreTopics: ['Limit State Philosophy & Material Safety Factors', 'Singly & Doubly Reinforced Concrete Beam Flexural Design', 'Shear Resistance & Stirrup Reinforcement Calculations', 'One-Way & Two-Way Continuous Solid Slab Design', 'Short & Slender Axially/Eccentrically Loaded Columns'],
          },
          {
            code: 'CVE 305',
            title: 'Soil Mechanics & Geotechnical Engineering',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Soil classification (USCS), compaction, Darcy’s permeability, effective stress, Terzaghi 1D consolidation, and shear strength (Mohr-Coulomb).',
            coreTopics: ['Phase Relations (Void Ratio, Porosity, Water Content)', 'Atterberg Limits & Unified Soil Classification System (USCS)', 'Darcy’s Law & Flow Net Seepage Calculations', 'Terzaghi Effective Stress Principle & 1D Consolidation Settlement', 'Mohr-Coulomb Shear Strength & Direct Shear/Triaxial Testing'],
          },
        ],
      },
      {
        name: 'Chemical & Petroleum Engineering',
        codePrefix: 'CHE',
        description: 'Mass and energy balances, chemical reaction engineering, transport phenomena, separation processes, and reservoir simulation.',
        courses: [
          {
            code: 'CHE 301',
            title: 'Chemical Engineering Thermodynamics & Phase Equilibria',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Equations of state, fugacity, activity coefficients, vapor-liquid equilibria (VLE Raoult’s law), and chemical reaction equilibrium.',
            coreTopics: ['Cubic Equations of State (Peng-Robinson, Redlich-Kwong)', 'Vapor-Liquid Equilibrium (VLE Raoult & Modified Raoult Laws)', 'Fugacity & Activity Coefficient Models (Wilson, NRTL, UNIQUAC)', 'Gibbs Free Energy Minimization & Reaction Equilibria'],
          },
          {
            code: 'PET 302',
            title: 'Petroleum Reservoir Engineering & Fluid Flow',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Reservoir rock properties, porosity, permeability, Darcy’s law for radial flow, fluid PVT analysis, material balance equation, and drive mechanisms.',
            coreTopics: ['Reservoir Rock Properties (Porosity, Permeability, Wettability)', 'Darcy’s Law for Radial Fluid Inflow in Porous Media', 'Hydrocarbon Phase Behavior & PVT Properties (Bo, Rs, Bg)', 'Havlena-Odeh General Material Balance Equation', 'Primary Recovery Drive Mechanisms (Water Drive, Gas Cap, Solution Gas)'],
          },
        ],
      },
      {
        name: 'Mechatronics & Robotics Engineering',
        codePrefix: 'MCE',
        description: 'Microcontroller systems, pneumatic/hydraulic actuators, forward/inverse kinematics, sensor fusion, and automated manufacturing.',
        courses: [
          {
            code: 'MCE 301',
            title: 'Sensors, Actuators & Microcontroller Interfacing',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Optical encoders, LVDT, strain gauges, stepper/servo motors, PWM control, ADC/DAC conversion, and embedded ARM/Arduino interfacing.',
            coreTopics: ['Transducer Principles & Signal Conditioning Circuits', 'Stepper & Brushless DC Servo Motor Drive Calculations', 'Pulse Width Modulation (PWM) Speed & Position Control', 'Denavit-Hartenberg (D-H) Robotic Kinematics Parameters', 'PID Robotic Joint Trajectory Tracking'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Medicine & Health Sciences',
    iconName: 'Activity',
    description: 'Human anatomy, physiology, pharmacology, clinical medicine, pathology, medical laboratory, and public health.',
    category: 'University',
    departments: [
      {
        name: 'Medicine & Surgery (MBBS)',
        codePrefix: 'MED',
        description: 'Pre-clinical anatomy, clinical physiology, internal medicine, surgery, pediatrics, and obstetrics.',
        courses: [
          {
            code: 'ANA 201',
            title: 'Gross Human Anatomy (Upper & Lower Limbs, Thorax)',
            level: '200 Level (Sophomore)',
            units: 4,
            description: 'Osteology, myology, neurovascular bundles of limbs, mediastinum, pleural cavity, heart chambers, coronary blood supply, and surface anatomy.',
            coreTopics: ['Brachial Plexus Organization & Clinical Nerve Injuries', 'Anatomy of the Heart Chambers, Valves & Coronary Circulation', 'Lungs, Bronchopulmonary Segments & Pleural Reflections', 'Femoral Triangle & Lower Limb Neurovascular Compartments', 'Inguinal Canal Anatomy & Hernia Classification'],
          },
          {
            code: 'PHS 201',
            title: 'Medical Physiology I (Cardiovascular & Respiratory Systems)',
            level: '200 Level (Sophomore)',
            units: 4,
            description: 'Action potentials, cardiac cycle, pressure-volume loops, Starling’s law, blood pressure regulation, lung mechanics, ventilation-perfusion, and gas exchange.',
            coreTopics: ['Cardiac Electrophysiology & Action Potentials (SA Node vs Ventricle)', 'Cardiac Cycle Phases & Wiggers Diagram Pressure-Volume Loops', 'Frank-Starling Law & Mean Arterial Pressure Regulation', 'Mechanics of Pulmonary Ventilation, Compliance & Surfactant', 'Oxygen-Hemoglobin Dissociation Curve & Bohr/Haldane Effects'],
          },
          {
            code: 'MED 301',
            title: 'General Pathology & Immunopathology',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Cellular injury, apoptosis vs necrosis, acute/chronic inflammation, hemodynamic disorders (thrombosis, embolism, shock), and hypersensitivity.',
            coreTopics: ['Mechanisms of Reversible vs Irreversible Cell Injury & Necrosis', 'Vascular & Cellular Events of Acute Inflammation', 'Wound Healing & Granulation Tissue Maturation', 'Virchow’s Triad, Thrombogenesis & Thromboembolism', 'Types I-IV Gel & Coombs Hypersensitivity Immune Reactions'],
          },
        ],
      },
      {
        name: 'Nursing Science (B.N.Sc)',
        codePrefix: 'NUR',
        description: 'Foundations of nursing care, clinical practicum, medical-surgical nursing, maternal-child health, and pharmacology.',
        courses: [
          {
            code: 'NUR 201',
            title: 'Foundations of Professional Nursing & Health Assessment',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Nursing process (ADPIE), vital signs assessment, aseptic techniques, infection control, wound care, medication administration, and patient safety.',
            coreTopics: ['Five Steps of the Nursing Process (Assessment, Diagnosis, Planning, Implementation, Evaluation)', 'Vital Signs Normal Ranges & Pathological Deviations', 'Surgical Asepsis & Hand Hygiene Guidelines', 'Medication Administration Rights & Dosage Calculations', 'Nursing Care Plans & NANDA Diagnostic Statements'],
          },
          {
            code: 'NUR 301',
            title: 'Medical-Surgical Nursing I (Systemic Disorders)',
            level: '300 Level (Junior)',
            units: 4,
            description: 'Pathophysiology and nursing interventions for cardiovascular (hypertension, heart failure), respiratory (asthma, COPD), and endocrine (diabetes) diseases.',
            coreTopics: ['Nursing Management of Hypertensive Crises & Heart Failure', 'Acute Asthma Exacerbation & Oxygen Delivery Devices', 'Diabetic Ketoacidosis (DKA) Protocols & Insulin Administration', 'Pre-Operative Preparation & Post-Operative Care Protocols', 'Fluid & Electrolyte Balance (Hypokalemia, Hypernatremia)'],
          },
        ],
      },
      {
        name: 'Medical Laboratory Science (MLS)',
        codePrefix: 'MLS',
        description: 'Clinical chemistry, hematology, blood transfusion science, medical microbiology, and histopathology.',
        courses: [
          {
            code: 'MLS 301',
            title: 'Clinical Hematology & Hemostasis',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Erythropoiesis, anemia classification, leukocyte disorders, leukemia morphology, coagulation cascade (intrinsic/extrinsic), and PT/APTT assays.',
            coreTopics: ['Erythrocyte Maturation & Anemia Morphological Classification', 'Complete Blood Count (CBC) Parameters & Automated Cell Counters', 'Leukemia Classification (AML, ALL, CML, CLL) & Peripheral Smear Examination', 'Coagulation Cascade Pathways (Intrinsic, Extrinsic, Common)', 'Prothrombin Time (PT/INR) & Activated Partial Thromboplastin Time (APTT)'],
          },
        ],
      },
      {
        name: 'Pharmacy & Pharmacology',
        codePrefix: 'PHA',
        description: 'Pharmaceutics, pharmacokinetics, pharmacodynamics, clinical therapeutics, and medicinal chemistry.',
        courses: [
          {
            code: 'PHA 201',
            title: 'General Pharmacology & Pharmacokinetics',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'ADME processes, bioavailability, volume of distribution, drug clearance, receptor agonism/antagonism, therapeutic index, and autonomic drugs.',
            coreTopics: ['Drug Absorption, Distribution, Metabolism & Excretion (ADME)', 'Bioavailability (F), Volume of Distribution (Vd) & Clearance (CL) Formulas', 'Receptor Theory, G-Protein Coupled Receptors & Dose-Response Curves', 'Autonomic Nervous System Pharmacology (Sympathomimetics & Parasympathomimetics)', 'Antibiotic Mechanism of Action (Beta-Lactams, Aminoglycosides, Quinolones)'],
          },
        ],
      },
      {
        name: 'Public Health & Community Medicine',
        codePrefix: 'PUB',
        description: 'Epidemiology, biostatistics, environmental health, disease surveillance, immunization, and health policy.',
        courses: [
          {
            code: 'PUB 301',
            title: 'Principles of Epidemiology & Biostatistics',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Measures of disease frequency (incidence, prevalence), study designs (cohort, case-control, RCT), odds ratio, relative risk, and outbreak investigation.',
            coreTopics: ['Incidence Rate, Prevalence & Attack Rate Calculations', 'Cohort Studies vs Case-Control Studies (Relative Risk & Odds Ratio)', 'Epidemiological Triad & Chain of Infection Transmission', 'Ten Steps of Outbreak Investigation & Epidemic Curves', 'Diagnostic Test Sensitivity, Specificity, Positive/Negative Predictive Value'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Management & Social Sciences',
    iconName: 'TrendingUp',
    description: 'Economics, accounting, business administration, finance, political science, sociology, and mass communication.',
    category: 'University',
    departments: [
      {
        name: 'Economics',
        codePrefix: 'ECO',
        description: 'Microeconomic optimization, macroeconomic policy, econometrics, public finance, and development economics.',
        courses: [
          {
            code: 'ECO 101',
            title: 'Principles of Microeconomics',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Scarcity, opportunity cost, demand and supply elasticities, consumer choice (indifference curves), production functions, and market structures.',
            coreTopics: ['Price Elasticity of Demand & Supply Calculations', 'Consumer Utility Maximization & Marginal Rate of Substitution', 'Short-Run & Long-Run Cost Curves (TC, ATC, MC)', 'Perfect Competition vs Monopoly Price & Output Determination', 'Market Failures, Externalities & Public Goods'],
          },
          {
            code: 'ECO 201',
            title: 'Principles of Macroeconomics & National Income',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'GDP accounting methods, Keynesian aggregate expenditure multiplier, IS-LM framework, inflation-unemployment trade-off (Phillips curve), and monetary policy.',
            coreTopics: ['Gross Domestic Product (GDP) Measurement Approaches', 'Keynesian Consumption Function & Investment Multiplier', 'IS-LM General Equilibrium Model (Goods & Money Markets)', 'Inflation Types (Demand-Pull vs Cost-Push) & Phillips Curve', 'Central Bank Monetary Policy Tools (Reserve Ratio, Discount Rate, OMO)'],
          },
          {
            code: 'ECO 301',
            title: 'Econometrics & Quantitative Modeling',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Ordinary Least Squares (OLS) regression, Gauss-Markov assumptions, hypothesis testing (t-test, F-test), heteroskedasticity, multicollinearity, and autocorrelation.',
            coreTopics: ['Ordinary Least Squares (OLS) Derivation & Parameter Estimation', 'Gauss-Markov Assumptions for BLUE Estimators', 'Goodness of Fit (R-squared & Adjusted R-squared)', 'Diagnostic Testing for Heteroskedasticity (White & Breusch-Pagan Tests)', 'Multicollinearity (VIF) & Autocorrelation (Durbin-Watson Test)'],
          },
        ],
      },
      {
        name: 'Accounting & Finance',
        codePrefix: 'ACC',
        description: 'Financial accounting (IFRS), cost & management accounting, corporate finance, taxation, and auditing.',
        courses: [
          {
            code: 'ACC 101',
            title: 'Principles of Financial Accounting I',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Double-entry bookkeeping, trial balance, ledger accounts, bank reconciliation statements, suspense accounts, and final financial statements.',
            coreTopics: ['Double-Entry Accounting System (Debit & Credit Rules)', 'General Journal, Cash Book & General Ledger Posting', 'Trial Balance Preparation & Correction of Accounting Errors', 'Bank Reconciliation Statement Adjustments', 'Statement of Profit or Loss & Statement of Financial Position (Balance Sheet)'],
          },
          {
            code: 'FIN 201',
            title: 'Corporate Financial Management',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Time value of money (NPV, IRR), capital budgeting, cost of capital (WACC), working capital management, and dividend policy.',
            coreTopics: ['Time Value of Money (Compounding, Discounting & Annuities)', 'Capital Budgeting Evaluation (Net Present Value, Internal Rate of Return, Payback)', 'Weighted Average Cost of Capital (WACC) Formulation', 'Working Capital Cash Conversion Cycle Management', 'Capital Asset Pricing Model (CAPM) & Beta Risk Valuation'],
          },
        ],
      },
      {
        name: 'Business Administration & Management',
        codePrefix: 'BUS',
        description: 'Organizational behavior, strategic management, marketing management, human resources, and operations research.',
        courses: [
          {
            code: 'BUS 201',
            title: 'Principles of Management & Organizational Theory',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Management functions (Planning, Organizing, Leading, Controlling), classical/human relations schools, organizational structures, and leadership styles.',
            coreTopics: ['Fayol’s 14 Principles of Management & Taylor’s Scientific Management', 'Organizational Hierarchy & Span of Control', 'Maslow’s Hierarchy of Needs & Herzberg’s Two-Factor Motivation Theory', 'Leadership Models (Transformational vs Transactional)', 'SWOT & PESTLE Strategic Environmental Analysis'],
          },
        ],
      },
      {
        name: 'Political Science & International Relations',
        codePrefix: 'POL',
        description: 'Political theory, comparative politics, public administration, international law, diplomacy, and global governance.',
        courses: [
          {
            code: 'POL 101',
            title: 'Introduction to Political Science & Government',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Statehood, sovereignty, power, authority, constitution, democracy, authoritarianism, separation of powers, and political ideologies.',
            coreTopics: ['Elements of the Modern State & Theories of Sovereignty', 'Constitutionalism & Rule of Law Principles', 'Montesquieu Separation of Powers & Checks and Balances', 'Forms of Government (Unitary vs Federal, Presidential vs Parliamentary)', 'Political Ideologies (Liberalism, Socialism, Conservatism, Fascism)'],
          },
        ],
      },
      {
        name: 'Mass Communication & Media Studies',
        codePrefix: 'MAC',
        description: 'Journalism, broadcasting, public relations, advertising, media law, ethics, and digital communication.',
        courses: [
          {
            code: 'MAC 201',
            title: 'Mass Communication Theories & Media Ethics',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Agenda-setting theory, framing, cultivation theory, two-step flow, uses and gratifications, defamation law, copyright, and ethical journalism.',
            coreTopics: ['Agenda-Setting Theory & Media Framing Mechanisms', 'Hypodermic Needle vs Limited Effects Communication Models', 'Cultivation Theory & Mean World Syndrome', 'Libel, Slander & Defamation Legal Defenses in Media', 'Code of Professional Journalism Conduct & Ethical Standards'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Law & Jurisprudence',
    iconName: 'Scale',
    description: 'Constitutional law, contract law, criminal law, torts, property law, commercial law, jurisprudence, and international law.',
    category: 'University',
    departments: [
      {
        name: 'Public & Private Law',
        codePrefix: 'LAW',
        description: 'Substantive civil and public law doctrines, judicial precedents, statutes, and legal reasoning.',
        courses: [
          {
            code: 'LAW 101',
            title: 'Nigerian Legal System & Constitutional Law I',
            level: '100 Level (Freshman)',
            units: 4,
            description: 'Sources of Nigerian law, court hierarchy, judicial precedent (stare decisis), statutory interpretation, and fundamental human rights.',
            coreTopics: ['Sources of Law (Received English Law, Customary Law, Statutes)', 'Hierarchy of Courts & Doctrine of Stare Decisis Precedents', 'Rules of Statutory Interpretation (Literal, Golden, Mischief Rules)', 'Fundamental Human Rights Enforcement (Chapter IV of 1999 Constitution)', 'Judicial Review of Administrative & Executive Actions'],
          },
          {
            code: 'LAW 201',
            title: 'Law of Contract (Offer, Acceptance & Consideration)',
            level: '200 Level (Sophomore)',
            units: 4,
            description: 'Elements of a valid contract, intention to create legal relations, consideration rules, vitiating elements (misrepresentation, mistake), and remedies for breach.',
            coreTopics: ['Offer vs Invitation to Treat (Carlill v Carbolic Smoke Ball Co)', 'Rules of Acceptance & Postal Acceptance Rule Exceptions', 'Doctrine of Consideration & Promissory Estoppel (High Trees Case)', 'Vitiating Factors (Fraudulent Misrepresentation, Duress, Undue Influence)', 'Remedies for Breach of Contract (Damages, Specific Performance, Injunction)'],
          },
          {
            code: 'LAW 203',
            title: 'Law of Torts (Negligence, Nuisance & Defamation)',
            level: '200 Level (Sophomore)',
            units: 4,
            description: 'Duty of care (Donoghue v Stevenson), breach of duty, causation and remoteness of damage, private/public nuisance, defamation, and strict liability (Rylands v Fletcher).',
            coreTopics: ['Duty of Care & Neighbor Principle (Donoghue v Stevenson, Caparo Test)', 'Breach of Duty & Reasonable Man Standard (Bolam Test)', 'Causation in Fact ("But-For" Test) & Remoteness of Damage (Wagon Mound)', 'Strict Liability Rule in Rylands v Fletcher & Defenses', 'Defamation (Libel vs Slander, Justification, Fair Comment, Privilege)'],
          },
          {
            code: 'LAW 301',
            title: 'Criminal Law & Principles of Liability',
            level: '300 Level (Junior)',
            units: 4,
            description: 'Actus reus, mens rea, strict liability crimes, general defenses (insanity, self-defense, provocation), homicide (murder/manslaughter), and theft.',
            coreTopics: ['Actus Reus & Mens Rea (Concurrence & Causation Principles)', 'General Defenses (Self-Defense, Automatism, M’Naghten Insanity Rules)', 'Homicide: Murder vs Voluntary Manslaughter (Provocation & Diminished Responsibility)', 'Offenses Against Property (Theft, Robbery, Obtaining by False Pretenses)', 'Inchoate Offenses (Conspiracy, Attempt, Incitement)'],
          },
        ],
      },
      {
        name: 'Commercial & Corporate Law',
        codePrefix: 'CML',
        description: 'Company law (CAMA), sale of goods, agency, banking law, intellectual property, and arbitration.',
        courses: [
          {
            code: 'CML 301',
            title: 'Company Law & Corporate Governance (CAMA)',
            level: '300 Level (Junior)',
            units: 4,
            description: 'Corporate personality (Salomon v Salomon), lifting the veil of incorporation, promoter duties, shares, debentures, director duties, and shareholder remedies (Foss v Harbottle).',
            coreTopics: ['Doctrine of Separate Legal Personality (Salomon v Salomon & Co Ltd)', 'Lifting the Veil of Incorporation (Statutory & Judicial Grounds)', 'Directors’ Fiduciary Duties & Duty of Care/Skill under CAMA', 'Rule in Foss v Harbottle & Statutory Shareholder Protection Exceptions', 'Corporate Insolvency, Winding Up & Receivership Procedures'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Arts & Humanities',
    iconName: 'BookOpen',
    description: 'English literature, linguistics, history, philosophy, religious studies, theatre arts, and foreign languages.',
    category: 'University',
    departments: [
      {
        name: 'English & Literary Studies',
        codePrefix: 'ENG',
        description: 'English syntax, phonetics, African literature, postcolonial criticism, drama, and creative writing.',
        courses: [
          {
            code: 'ENG 101',
            title: 'English Phonetics, Phonology & Grammar',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'IPA phonetic transcription, vowel/consonant articulation, stress and intonation patterns, sentence structure, phrase structure rules, and concord.',
            coreTopics: ['International Phonetic Alphabet (IPA) Vowel & Consonant Charts', 'Stress Placement, Syllable Structure & Intonation Contours', 'Phrase Structure Rules & Tree Diagramming', 'Rules of Grammatical Concord & Agreement', 'Morphological Word Formation Processes (Affixation, Compounding, Blending)'],
          },
          {
            code: 'LIT 201',
            title: 'African Literature & Postcolonial Critical Theory',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Major African novelists, poets, and dramatists (Achebe, Soyinka, Ngugi, Adichie), postcolonial theory, hybridity, orientalism, and feminism in African literature.',
            coreTopics: ['Themes of Colonial Encounter & Cultural Dislocation in Achebe’s Fiction', 'Soyinka’s Tragic Vision & Mythopoetic Drama', 'Ngugi wa Thiong’o & the Language Question in African Literature', 'Postcolonial Concepts: Hybridity, Mimicry & Subaltern Voice (Spivak, Bhabha)', 'African Feminist & Womanist Literary Perspectives'],
          },
        ],
      },
      {
        name: 'History & Diplomatic Studies',
        codePrefix: 'HIS',
        description: 'Nigerian history, African civilizations, world wars, international organizations, diplomacy, and foreign policy.',
        courses: [
          {
            code: 'HIS 201',
            title: 'Nigerian History from Earliest Times to 1960',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Pre-colonial kingdoms (Kanem-Borno, Oyo, Benin, Sokoto Caliphate), transatlantic slave trade, British colonial conquest, 1914 amalgamation, and nationalism.',
            coreTopics: ['Socio-Political Systems of Pre-Colonial Nigerian Kingdoms', 'The Transatlantic Slave Trade & Legitimate Commerce Transitions', 'British Colonial Conquest & Indirect Rule Policy', 'The 1914 Amalgamation & Colonial Constitutional Developments (Clifford to Lyttelton)', 'Anti-Colonial Nationalist Movements & Independence (1960)'],
          },
        ],
      },
      {
        name: 'Philosophy & Logic',
        codePrefix: 'PHI',
        description: 'Epistemology, ethics, metaphysics, formal deductive logic, African philosophy, and philosophy of science.',
        courses: [
          {
            code: 'PHI 101',
            title: 'Introduction to Logic & Critical Thinking',
            level: '100 Level (Freshman)',
            units: 3,
            description: 'Propositional logic, truth tables, valid and sound arguments, formal and informal logical fallacies, syllogisms, and critical reasoning.',
            coreTopics: ['Nature of Deductive vs Inductive Arguments', 'Categorical Syllogisms & Venn Diagram Validity Tests', 'Propositional Logic Operators & Truth Table Evaluation', 'Informal Fallacies (Ad Hominem, Straw Man, Begging the Question, False Dilemma)', 'Scientific Method & Problem-Solving Logic'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Environmental Sciences & Design',
    iconName: 'Building',
    description: 'Architecture, building technology, estate management, quantity surveying, urban planning, and surveying.',
    category: 'University',
    departments: [
      {
        name: 'Architecture & Building Technology',
        codePrefix: 'ARC',
        description: 'Architectural drafting, building climatology, structural design, construction materials, and BIM modeling.',
        courses: [
          {
            code: 'ARC 201',
            title: 'Architectural Graphics & Design Studio I',
            level: '200 Level (Sophomore)',
            units: 4,
            description: 'Orthographic projections, isometric/axonometric drawings, architectural drafting conventions, passive climate design, and space planning.',
            coreTopics: ['Orthographic Floor Plans, Sections & Elevations Drafting Conventions', 'Isometric, Axonometric & 2-Point Perspective Renderings', 'Site Analysis & Solar Shading Angle Calculations', 'Building Climatology & Passive Ventilation Strategies', 'Building Information Modeling (BIM) Standards'],
          },
        ],
      },
      {
        name: 'Estate Management & Valuation',
        codePrefix: 'ESM',
        description: 'Property valuation methods, real estate economics, land law, property rating, and facility management.',
        courses: [
          {
            code: 'ESM 201',
            title: 'Principles of Property Valuation & Real Estate Economics',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Five valuation methods (Investment, Comparison, Cost/Contractor, Residual, Profit), Years Purchase (YP), and capitalization rates.',
            coreTopics: ['Five Traditional Methods of Real Estate Valuation', 'Investment Method of Valuation & Years’ Purchase (YP) Calculations', 'Residual Method for Property Development Appraisal', 'Depreciated Replacement Cost (DRC) Assessment', 'Land Use Act 1978 Provisions & Property Rights in Nigeria'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Agriculture, Forestry & Fisheries',
    iconName: 'Sprout',
    description: 'Agronomy, crop science, animal science, agricultural economics, soil science, fisheries, and food technology.',
    category: 'University',
    departments: [
      {
        name: 'Agronomy & Crop Science',
        codePrefix: 'AGR',
        description: 'Crop physiology, weed science, plant breeding, horticulture, pest management, and soil fertility.',
        courses: [
          {
            code: 'AGR 201',
            title: 'General Agriculture & Crop Production Principles',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Classification of arable and cash crops, seedbed preparation, planting geometry, soil nutrient dynamics (NPK), and integrated pest management (IPM).',
            coreTopics: ['Classification of Tropical Crops (Cereals, Pulses, Tubers, Cash Crops)', 'Soil Nutrient Chemistry (NPK Macro & Micronutrients)', 'Planting Density, Plant Spacing & Seed Rate Arithmetic', 'Weed Control Methods & Herbicide Selectivity', 'Integrated Pest Management (IPM) Protocols'],
          },
        ],
      },
      {
        name: 'Animal Science & Livestock Production',
        codePrefix: 'ANS',
        description: 'Animal nutrition, reproductive physiology, genetics, poultry, cattle, swine, and sheep/goat husbandry.',
        courses: [
          {
            code: 'ANS 301',
            title: 'Animal Nutrition & Feed Formulation (Pearson Square)',
            level: '300 Level (Junior)',
            units: 3,
            description: 'Nutrient digestion in ruminants vs non-ruminants, proximate analysis, energy systems (TDN, ME), and Pearson square feed balancing math.',
            coreTopics: ['Ruminant vs Non-Ruminant Digestive Physiology', 'Proximate Analysis (Moisture, Crude Protein, Crude Fiber, Ether Extract)', 'Total Digestible Nutrients (TDN) & Metabolizable Energy Calculations', 'Pearson Square Feed Formulation Method for Broiler/Layer Diets', 'Pasture Agronomy & Silage Preservation Techniques'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Faculty of Education',
    iconName: 'BookOpen',
    description: 'Educational foundations, curriculum studies, educational administration, guidance & counseling, and pedagogy.',
    category: 'University',
    departments: [
      {
        name: 'Educational Foundations & Pedagogy',
        codePrefix: 'EDU',
        description: 'Philosophy of education, sociology of education, history of Nigerian education, curriculum design, and assessment.',
        courses: [
          {
            code: 'EDU 201',
            title: 'Curriculum Theory & Educational Measurement',
            level: '200 Level (Sophomore)',
            units: 3,
            description: 'Bloom’s taxonomy of educational objectives, curriculum design models (Tyler, Taba), test construction, validity, and reliability.',
            coreTopics: ['Bloom’s Revised Taxonomy of Cognitive, Affective & Psychomotor Domains', 'Tyler’s Rational Curriculum Development Model', 'Constructing a Table of Specifications (Test Blueprint)', 'Test Reliability (Test-Retest, Cronbach Alpha) & Validity Measures', 'Continuous Assessment (CA) Implementation & Grading Schemes'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. POLYTECHNICS & MONOTECHNICS (APPLIED TECHNOLOGY)
  // =========================================================================
  {
    faculty: 'School of Engineering Technology',
    iconName: 'Cpu',
    description: 'Practical engineering technology, electrical machines, mechanical workshop, civil construction, and chemical fabrication.',
    category: 'Polytechnic',
    departments: [
      {
        name: 'Electrical & Electronic Engineering Tech',
        codePrefix: 'EEC',
        description: 'Electrical machines, power installation, electronics troubleshooting, instrumentation, and control wiring.',
        courses: [
          {
            code: 'EEC 111',
            title: 'Electrical Engineering Science I (ND I)',
            level: 'ND I (National Diploma Year 1)',
            units: 3,
            description: 'Direct current circuits, conductor resistance, temperature coefficient, electrostatics, electromagnetism, and primary cells.',
            coreTopics: ['Conductor Resistance & Temperature Coefficient of Resistance', 'Kirchhoff’s Laws Applied to Multi-Loop Circuits', 'Capacitors in Series & Parallel with Energy Storage', 'Magnetic Flux Density, Reluctance & B-H Curves', 'Induction & Faraday’s Electromagnetism Experiments'],
          },
          {
            code: 'EEC 232',
            title: 'Electrical Machines & Transformers (ND II)',
            level: 'ND II (National Diploma Year 2)',
            units: 3,
            description: 'Single-phase transformer equivalent circuits, voltage regulation, open/short circuit tests, DC motors, and 3-phase induction machines.',
            coreTopics: ['Single-Phase Transformer Equivalent Circuit Formulation', 'Open-Circuit & Short-Circuit Transformer Testing Math', 'Voltage Regulation & Transformer Efficiency Calculations', 'DC Generator EMF Equation & Motor Torque Development', 'Three-Phase Induction Motor Torque-Speed Characteristics'],
          },
        ],
      },
      {
        name: 'Mechanical Engineering Technology',
        codePrefix: 'MEC',
        description: 'Machine shop practice, lathe turning, milling, welding, thermodynamics, and foundry technology.',
        courses: [
          {
            code: 'MEC 111',
            title: 'Mechanical Engineering Workshop Technology I (ND I)',
            level: 'ND I (National Diploma Year 1)',
            units: 3,
            description: 'Benchwork, hand tools, precision measuring tools (vernier calipers, micrometer screw gauge), safety, and drilling operations.',
            coreTopics: ['Precision Measurement Using Vernier Calipers & Micrometers', 'Marking Out Tools, Scribing & Center Punching Procedures', 'Lathe Machine Parts, Chuck Types & Turning Operations', 'Cutting Speed, Feed Rate & RPM Calculations for Machining', 'Welding Safety, Arc Welding & Oxy-Acetylene Gas Pressures'],
          },
        ],
      },
      {
        name: 'Civil Engineering Technology',
        codePrefix: 'CEC',
        description: 'Land surveying, concrete testing, structural mechanics, water engineering, and highway drafting.',
        courses: [
          {
            code: 'CEC 201',
            title: 'Civil Engineering Construction & Materials (ND II)',
            level: 'ND II (National Diploma Year 2)',
            units: 3,
            description: 'Concrete batching, slump test, compressive cube strength testing, masonry bonding, and foundation types.',
            coreTopics: ['Concrete Mix Design (Batching by Weight vs Volume)', 'Slump Test Procedures & Workability Classification', 'Compressive Strength Testing of Concrete Test Cubes', 'English & Flemish Brickwork Bonding Methods', 'Shallow vs Deep Foundation Excavation & Timbering'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'School of Applied Sciences & Technology',
    iconName: 'Laptop',
    description: 'Computer science technology, science laboratory technology (SLT), food technology, and statistics.',
    category: 'Polytechnic',
    departments: [
      {
        name: 'Computer Science Technology',
        codePrefix: 'COM',
        description: 'Applied programming, web technologies, computer maintenance, networking, and relational databases.',
        courses: [
          {
            code: 'COM 111',
            title: 'Introduction to Computing & Logic Operations (ND I)',
            level: 'ND I (National Diploma Year 1)',
            units: 3,
            description: 'Hardware architecture, logic gates, operating systems, algorithm design, and structured programming in Python/VB.',
            coreTopics: ['Computer Logic Gates (AND, OR, NOT, NAND, NOR, XOR)', 'Truth Tables & Boolean Algebra Simplification', 'Structured Flowcharting & Pseudocode Writing', 'Motherboard Components & Peripheral Interfacing', 'Relational Database SQL Select Queries & Filtering'],
          },
        ],
      },
      {
        name: 'Science Laboratory Technology (SLT)',
        codePrefix: 'SLT',
        description: 'Instrumental analysis, chemical assays, microbiological techniques, biochemical preparation, and lab management.',
        courses: [
          {
            code: 'SLT 213',
            title: 'Instrumental Methods of Chemical Analysis (ND II)',
            level: 'ND II (National Diploma Year 2)',
            units: 3,
            description: 'UV-Visible spectrophotometry, Beer-Lambert calibration curves, refractometry, polarimetry, and flame photometry.',
            coreTopics: ['Beer-Lambert Law & Absorbance vs Transmittance Calculations', 'Spectrophotometer Calibration Curves & Standard Addition Methods', 'Flame Photometric Determination of Sodium & Potassium Ions', 'Refractometry & Sugar Brix Measurement Principles', 'Standard Solution Preparation & Titrimetric Calculations (Molarity, Normality)'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'School of Business & Management Studies',
    iconName: 'TrendingUp',
    description: 'Accountancy, business administration, marketing, banking and finance, and public administration.',
    category: 'Polytechnic',
    departments: [
      {
        name: 'Accountancy (ND/HND)',
        codePrefix: 'ACC',
        description: 'Applied bookkeeping, cost accounting, corporate taxation, and financial reporting.',
        courses: [
          {
            code: 'ACC 111',
            title: 'Principles of Accounts I (ND I)',
            level: 'ND I (National Diploma Year 1)',
            units: 3,
            description: 'Double-entry rules, journals, ledgers, cash book, trial balance, and manufacturing accounts.',
            coreTopics: ['Three-Column Cash Book Preparation & Petty Cash Imprest System', 'Bank Reconciliation Adjustments', 'Manufacturing Account (Prime Cost, Factory Overheads, Production Cost)', 'Depreciation Methods (Straight-Line & Reducing Balance Calculations)', 'Partnership Appropriation Accounts & Goodwill Adjustments'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. COLLEGES OF EDUCATION (TEACHER PEDAGOGY)
  // =========================================================================
  {
    faculty: 'School of Education (Core Foundations & Pedagogy)',
    iconName: 'BookOpen',
    description: 'Core teacher education, curriculum planning, educational psychology, microteaching, and educational technology.',
    category: 'College of Education',
    departments: [
      {
        name: 'Educational Foundations & Pedagogy',
        codePrefix: 'EDU',
        description: 'Educational psychology, philosophy, classroom management, test measurement, and microteaching.',
        courses: [
          {
            code: 'EDU 211',
            title: 'Educational Measurement, Evaluation & Test Construction (NCE II)',
            level: 'NCE II (Year 2)',
            units: 2,
            description: 'Item writing rules, table of specifications, item difficulty (P-index), discrimination index (D-index), and z/T standard scores.',
            coreTopics: ['Formulating Objective & Essay Test Questions', 'Table of Specifications (Test Blueprint) Design Matrix', 'Item Difficulty (P-Index) Calculation: P = R / N', 'Item Discrimination (D-Index) Calculation: D = (RU - RL) / (0.5N)', 'Z-Score & T-Score Standard Score Normalization'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'School of Sciences & Mathematics Education',
    iconName: 'Laptop',
    description: 'Mathematics education, physics education, chemistry education, biology education, and computer education.',
    category: 'College of Education',
    departments: [
      {
        name: 'Mathematics Education',
        codePrefix: 'MTH',
        description: 'Teaching secondary school mathematics, geometry, instructional aids, and algebra pedagogy.',
        courses: [
          {
            code: 'MTH 211',
            title: 'Geometry & Mathematical Manipulatives (NCE II)',
            level: 'NCE II (Year 2)',
            units: 2,
            description: 'Geometric proofs, Euclidean geometry, use of mathematical sets, protractors, geoboards, and lesson plans for secondary schools.',
            coreTopics: ['Pythagoras Theorem & Trigonometric Ratios Pedagogical Delivery', 'Properties of Polygons, Circle Theorems & Angle Proofs', 'Designing Daily Secondary School Mathematics Lesson Notes with Behavioral Objectives', 'Using Concrete Mathematical Manipulatives for Teaching Fractions', 'Diagnostic Remediation for Student Mathematics Anxiety'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. COLLEGES OF HEALTH TECHNOLOGY & NURSING (CLINICAL SCIENCES)
  // =========================================================================
  {
    faculty: 'School of Community Health Sciences',
    iconName: 'Activity',
    description: 'Community health extension work (CHEW/JCHEW), primary healthcare standing orders, epidemiology, and maternal health.',
    category: 'College of Health & Nursing',
    departments: [
      {
        name: 'Community Health Extension Work (CHEW)',
        codePrefix: 'CHEW',
        description: 'Use of national standing orders, community diagnosis, immunization schedules, and essential drug dispensing.',
        courses: [
          {
            code: 'CHEW 201',
            title: 'Use of Standing Orders in Primary Healthcare (Year 2)',
            level: 'Year 2 (Clinical & Practicum)',
            units: 3,
            description: 'Algorithm pathways in national standing orders, differential diagnosis, fever/malaria, respiratory distress, ORS preparation, and referral criteria.',
            coreTopics: ['Navigating National Standing Orders Clinical Decision Flowcharts', 'Severe Malaria Diagnosis & Artemisinin-Based Combination Therapy (ACT) Protocol', 'Oral Rehydration Salts (ORS) & Zinc Pediatric Diarrhea Management', 'National Immunization Schedule (EPI: BCG, Pentavalent, OPV, Measles, Yellow Fever)', 'Emergency Triage & Primary Healthcare Referral Protocols'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'School of Nursing & Midwifery',
    iconName: 'Activity',
    description: 'General nursing science, midwifery, clinical pharmacology, maternal health, and patient nursing care plans.',
    category: 'College of Health & Nursing',
    departments: [
      {
        name: 'General Nursing Science & Midwifery',
        codePrefix: 'NUR',
        description: 'Clinical nursing procedures, patient care plans, pharmacology dosage math, and sterile clinical procedures.',
        courses: [
          {
            code: 'NUR 203',
            title: 'Clinical Pharmacology & Dosage Calculations (Year 2)',
            level: 'Year 2 (Clinical & Practicum)',
            units: 3,
            description: 'IV drip flow rate calculations (drops/min), tablet fractions, pediatric weight-based dosage (mg/kg), and insulin unit scaling.',
            coreTopics: ['IV Infusion Drop Rate Formula: (Volume in mL x Drop Factor) / Time in Minutes', 'Pediatric Dosage Calculations Using Body Weight (mg/kg/day in Divided Doses)', 'Insulin Types (Rapid, Short, Intermediate, Long-Acting) & Syringe Unit Measurements', 'Seven Rights of Medication Administration & Adverse Drug Reaction Reporting', 'Opioid Analgesics Monitoring & Naloxone Reversal Protocol'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. SPECIALIZED ACADEMIES & MONOTECHNICS (MARITIME, AVIATION, PETROLEUM)
  // =========================================================================
  {
    faculty: 'Maritime Academy & Nautical Institute',
    iconName: 'Compass',
    description: 'Nautical science, marine engineering, navigation, radar plotting, COLREGs, and offshore vessel operations.',
    category: 'Specialized Institute',
    departments: [
      {
        name: 'Nautical Science & Marine Engineering',
        codePrefix: 'MRT',
        description: 'Bridge watchkeeping, celestial navigation, marine diesel propulsion, and ship stability.',
        courses: [
          {
            code: 'MRT 101',
            title: 'Principles of Nautical Navigation (Cadet / Year 1)',
            level: 'Cadet / Year 1 (ND I)',
            units: 3,
            description: 'Nautical chart reading, latitude/longitude plotting, magnetic compass deviation and variation, dead reckoning, and COLREGs rules.',
            coreTopics: ['Reading Nautical Mercator Charts & True vs Magnetic Bearings', 'Calculating Magnetic Variation & Ship Compass Deviation', 'COLREGs Rules of the Road (Overtaking, Head-On & Crossing Encounters)', 'Ship Stability Calculations (Metacentric Height GM & Center of Buoyancy KB)', 'SOLAS Marine Safety Equipment & Firefighting Drills'],
          },
        ],
      },
    ],
  },
  {
    faculty: 'Petroleum & Mining Institute',
    iconName: 'Cpu',
    description: 'Petroleum drilling, reservoir evaluation, well blowout prevention (BOP), natural gas processing, and mining.',
    category: 'Specialized Institute',
    departments: [
      {
        name: 'Petroleum Drilling & Production Tech',
        codePrefix: 'PNG',
        description: 'Drilling fluid hydrostatics, drill string design, casing cementing, well logging, and artificial lift.',
        courses: [
          {
            code: 'PNG 201',
            title: 'Petroleum Drilling Technology & Well Control (Year 2)',
            level: 'Intermediate / Year 2 (ND II)',
            units: 3,
            description: 'Hydrostatic pressure math, mud weight balancing, formation fracture gradient, kick detection, and Driller’s / Wait & Weight BOP well control methods.',
            coreTopics: ['Hydrostatic Pressure Calculation: P = 0.052 x Mud Weight (ppg) x TVD (ft)', 'Formation Pressure & Fracture Gradient Pore Pressure Modeling', 'Drilling Kick Detection Indicators (Pit Gain, Flow Rate Increase)', 'Driller’s Method vs Wait and Weight Method of Well Kill Circulation', 'Casing String Collapse, Burst & Tensile Load Calculations'],
          },
        ],
      },
    ],
  },
];

// Helper to get all faculties
export function getAllFaculties(): FacultyData[] {
  return ACADEMIC_CURRICULUM_DATA;
}

// Helper to filter faculties by institution category
export function getFacultiesByCategory(category: string): FacultyData[] {
  if (!category || category === 'All Categories') {
    return ACADEMIC_CURRICULUM_DATA;
  }
  return ACADEMIC_CURRICULUM_DATA.filter((f) => f.category === category);
}

// Helper to get levels by category
export function getLevelsByCategory(category: string): string[] {
  if (!category || category === 'All Categories') {
    return ACADEMIC_LEVELS;
  }
  const matched = INSTITUTION_CATEGORIES.find((c) => c.id === category);
  return matched ? ['All Levels (Comprehensive Directory)', ...matched.levels] : ACADEMIC_LEVELS;
}

// Helper to get departments for a faculty
export function getDepartmentsByFaculty(facultyName: string): DepartmentData[] {
  const fac = ACADEMIC_CURRICULUM_DATA.find((f) => f.faculty === facultyName);
  return fac ? fac.departments : [];
}

// Helper to get courses for a department
export function getCoursesByDepartment(facultyName: string, departmentName: string): CourseItem[] {
  const fac = ACADEMIC_CURRICULUM_DATA.find((f) => f.faculty === facultyName);
  if (!fac) return [];
  const dept = fac.departments.find((d) => d.name === departmentName);
  return dept ? dept.courses : [];
}

// Helper to flatten all courses for comprehensive search across all institutions
export function getAllCurriculumCourses(categoryFilter?: string): (CourseItem & {
  faculty: string;
  department: string;
  institutionCategory: string;
})[] {
  const results: (CourseItem & {
    faculty: string;
    department: string;
    institutionCategory: string;
  })[] = [];

  const targetFaculties =
    categoryFilter && categoryFilter !== 'All Categories'
      ? ACADEMIC_CURRICULUM_DATA.filter((f) => f.category === categoryFilter)
      : ACADEMIC_CURRICULUM_DATA;

  targetFaculties.forEach((f) => {
    f.departments.forEach((d) => {
      d.courses.forEach((c) => {
        results.push({
          ...c,
          faculty: f.faculty,
          department: d.name,
          institutionCategory: f.category,
        });
      });
    });
  });

  return results;
}

// Global search across curriculum
export function searchCurriculumDirectory(
  query: string,
  categoryFilter?: string
): (CourseItem & {
  faculty: string;
  department: string;
  institutionCategory: string;
})[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const all = getAllCurriculumCourses(categoryFilter);

  return all.filter((item) => {
    const matchCode = item.code.toLowerCase().includes(q);
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchDept = item.department.toLowerCase().includes(q);
    const matchFac = item.faculty.toLowerCase().includes(q);
    const matchCategory = item.institutionCategory.toLowerCase().includes(q);
    const matchDesc = item.description.toLowerCase().includes(q);
    const matchTopics = item.coreTopics.some((t) => t.toLowerCase().includes(q));
    return matchCode || matchTitle || matchDept || matchFac || matchCategory || matchDesc || matchTopics;
  });
}

// Backward compatibility helper
export const ALL_ACADEMIC_FACULTIES = ACADEMIC_CURRICULUM_DATA;

export const ACADEMIC_FACULTIES_DATA = ACADEMIC_CURRICULUM_DATA.map((fac) => ({
  faculty: fac.faculty,
  iconName: fac.iconName,
  departments: fac.departments.map((d) => d.name),
}));

export const POPULAR_TOPIC_SUGGESTIONS = [
  // 1. University Academic Topics
  {
    topic: 'Data Structures: Binary Search Trees, AVL Trees & Graph Traversal (DFS/BFS)',
    course: 'CSC 202: Data Structures & Algorithms',
    department: 'Computer Science',
    faculty: 'Faculty of Science & Computing',
    level: '200 Level (Sophomore)',
    category: 'University' as InstitutionCategory,
    categoryBadge: 'University Degree',
  },
  {
    topic: 'Thermodynamics: Rankine Steam Power Cycle with Superheat & Reheat Derivations',
    course: 'MEE 311: Applied Engineering Thermodynamics',
    department: 'Mechanical Engineering',
    faculty: 'Faculty of Engineering & Technology',
    level: '300 Level (Junior)',
    category: 'University' as InstitutionCategory,
    categoryBadge: 'University Degree',
  },
  {
    topic: 'Cardiovascular Hemodynamics & Cardiac Cycle: Pressure-Volume Loops and Starling’s Law',
    course: 'PHS 201: Medical Physiology I',
    department: 'Medicine & Surgery (MBBS)',
    faculty: 'Faculty of Medicine & Health Sciences',
    level: '200 Level (Sophomore)',
    category: 'University' as InstitutionCategory,
    categoryBadge: 'University Degree',
  },
  {
    topic: 'Photosynthesis & Cellular Respiration: Light-Dependent Reactions & Calvin Cycle Bioenergetics',
    course: 'BCH 201: General Biochemistry I',
    department: 'Biochemistry & Molecular Biology',
    faculty: 'Faculty of Science & Computing',
    level: '200 Level (Sophomore)',
    category: 'University' as InstitutionCategory,
    categoryBadge: 'University Degree',
  },
  {
    topic: 'Law of Contract: Offer, Acceptance, Consideration & High Trees Promissory Estoppel',
    course: 'LAW 201: Law of Contract',
    department: 'Public & Private Law',
    faculty: 'Faculty of Law & Jurisprudence',
    level: '200 Level (Sophomore)',
    category: 'University' as InstitutionCategory,
    categoryBadge: 'University Degree',
  },

  // 2. Polytechnic Applied Technology Topics
  {
    topic: 'Single-Phase Transformer Equivalent Circuit, Voltage Regulation & Open/Short Loss Calculations',
    course: 'EEC 232: Electrical Machines & Transformers',
    department: 'Electrical & Electronic Engineering Tech',
    faculty: 'School of Engineering Technology',
    level: 'ND II (National Diploma Year 2)',
    category: 'Polytechnic' as InstitutionCategory,
    categoryBadge: 'Polytechnic Technology',
  },
  {
    topic: 'Beer-Lambert Law & UV-Visible Spectrophotometric Calibration in Chemical Assays',
    course: 'SLT 213: Instrumental Methods of Chemical Analysis',
    department: 'Science Laboratory Technology (SLT)',
    faculty: 'School of Applied Sciences & Technology',
    level: 'ND II (National Diploma Year 2)',
    category: 'Polytechnic' as InstitutionCategory,
    categoryBadge: 'Polytechnic Technology',
  },

  // 3. College of Education Pedagogy Topics
  {
    topic: 'Formative Assessment, Table of Specifications (Test Blueprint) & Item Difficulty (P/D) Index',
    course: 'EDU 211: Educational Measurement & Evaluation',
    department: 'Educational Foundations & Pedagogy',
    faculty: 'School of Education (Core Foundations & Pedagogy)',
    level: 'NCE II (Year 2)',
    category: 'College of Education' as InstitutionCategory,
    categoryBadge: 'Teacher Pedagogy',
  },

  // 4. College of Health Technology & Nursing Topics
  {
    topic: 'National Primary Health Care Standing Orders: Clinical Algorithm Diagnosis & Artemisinin Protocol for Severe Malaria',
    course: 'CHEW 201: Use of Standing Orders in PHC',
    department: 'Community Health Extension Work (CHEW)',
    faculty: 'School of Community Health Sciences',
    level: 'Year 2 (Clinical & Practicum)',
    category: 'College of Health & Nursing' as InstitutionCategory,
    categoryBadge: 'Clinical Health Sciences',
  },
  {
    topic: 'IV Drip Rate Formulas (gtts/min), Pediatric mg/kg Body Surface Area Calculations & Drug Rights',
    course: 'NUR 203: Clinical Pharmacology & Dosage Calculations',
    department: 'General Nursing Science & Midwifery',
    faculty: 'School of Nursing & Midwifery',
    level: 'Year 2 (Clinical & Practicum)',
    category: 'College of Health & Nursing' as InstitutionCategory,
    categoryBadge: 'Nursing & Clinical Care',
  },

  // 5. Specialized Academy & Monotechnic Topics
  {
    topic: 'COLREGs Rule of the Road, Compass Deviation Calculation & Celestial Navigation Bearing Plotting',
    course: 'MRT 101: Principles of Nautical Navigation',
    department: 'Nautical Science & Marine Engineering',
    faculty: 'Maritime Academy & Nautical Institute',
    level: 'Cadet / Year 1 (ND I)',
    category: 'Specialized Institute' as InstitutionCategory,
    categoryBadge: 'Maritime & Nautical Standard',
  },
  {
    topic: 'Drilling Mud Weight Hydrostatic Pressure Math & Driller’s Method Blowout Prevention (BOP) Control',
    course: 'PNG 201: Petroleum Drilling Technology & Well Control',
    department: 'Petroleum Drilling & Production Tech',
    faculty: 'Petroleum & Mining Institute',
    level: 'Intermediate / Year 2 (ND II)',
    category: 'Specialized Institute' as InstitutionCategory,
    categoryBadge: 'Petroleum & Mining Institute',
  },
];

export const SUGGESTED_SEARCH_TOPICS = POPULAR_TOPIC_SUGGESTIONS;
