import {
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from './firebase';
import {
  GusCompetition,
  GusSeason,
  GusRound,
  GusLiveState,
  GusParticipantRecord,
  GusQuestionBankItem,
  GusWinner,
  GusRoundEligibility,
  GusPrizeVisibility,
  GusParticipantStatus,
  GusPrizeConfig,
} from '../types';

export const DEFAULT_GUS_COMPETITION_ID = 'gus_competition_s1';
export const DEFAULT_GUS_SEASON_ID = 'gus_season_1';

// =========================================================================
// TEXT NORMALIZATION FOR TYPED ANSWERS
// =========================================================================

export const normalizeGusAnswer = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics/accents
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '') // remove punctuations
    .replace(/\s+/g, ' '); // collapse whitespace
};

// =========================================================================
// 1. DEFAULT SEED DATA: 8 ROUNDS × 10 ACADEMIC QUESTIONS = 80 QUESTIONS
// =========================================================================

export const SEED_GUS_ROUND_THEMES: Record<number, { title: string; topic: string; date?: string }> = {
  1: { title: 'Round 1 — Fundamental Logic & Quantitative Reasoning', topic: 'Mathematics & Logic', date: '2026-09-01' },
  2: { title: 'Round 2 — Quantum Computing & Theoretical Physics', topic: 'Physics & Computing', date: '2026-09-08' },
  3: { title: 'Round 3 — Computational Neuroscience & Bio-Systems', topic: 'Neuroscience & Biology', date: '2026-09-15' },
  4: { title: 'Round 4 — Applied Game Theory & Strategic Economics', topic: 'Economics & Mathematics', date: '2026-09-22' },
  5: { title: 'Round 5 — Autonomous AI Governance & Machine Ethics', topic: 'AI Ethics & Philosophy', date: '2026-09-29' },
  6: { title: 'Round 6 — Cryptographic Proofs & Decentralized Protocols', topic: 'Cryptography & Security', date: '2026-10-06' },
  7: { title: 'Round 7 — Advanced Thermodynamics & Astro-Physics', topic: 'Astrophysics & Chemistry', date: '2026-10-13' },
  8: { title: 'Round 8 — Grandmaster Apex Olympiad (Final Round)', topic: 'Grandmaster Synthesis', date: '2026-10-20' },
};

export const INITIAL_80_GUS_QUESTIONS: GusQuestionBankItem[] = [
  // ROUND 1: Quantitative & Logic (Q1..10)
  {
    id: 'gus_q_r1_1',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 1,
    question: 'If f(x) = 3x² - 4x + 7, what is the exact numerical value of the derivative f\'(2)?',
    correctAnswer: '8',
    acceptedAnswers: ['8', 'eight', '8.0'],
    options: ['8', '12', '16', '20'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'f\'(x) = 6x - 4. At x=2, f\'(2) = 6(2) - 4 = 8.',
    active: true,
  },
  {
    id: 'gus_q_r1_2',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 2,
    question: 'In propositional logic, what is the contrapositive of the conditional statement (P → Q)?',
    correctAnswer: '¬Q → ¬P',
    acceptedAnswers: ['¬Q → ¬P', '~Q -> ~P', 'not Q implies not P', 'not Q -> not P'],
    options: ['¬P → ¬Q', '¬Q → ¬P', 'Q → P', 'P ∧ ¬Q'],
    correctOptionIndex: 1,
    topic: 'Mathematics & Logic',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'The contrapositive of P → Q is ¬Q → ¬P, logically equivalent to the original statement.',
    active: true,
  },
  {
    id: 'gus_q_r1_3',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 3,
    question: 'What is the exact sum of the infinite geometric series 1 + 1/3 + 1/9 + 1/27 + ...?',
    correctAnswer: '1.5',
    acceptedAnswers: ['1.5', '3/2', '1 1/2', '1.50'],
    options: ['4/3', '1.5', '2', '3/2'],
    correctOptionIndex: 1,
    topic: 'Mathematics & Logic',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'S = a / (1 - r) = 1 / (1 - 1/3) = 1 / (2/3) = 1.5 (or 3/2).',
    active: true,
  },
  {
    id: 'gus_q_r1_4',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 4,
    question: 'How many distinct permutations exist for the letters in the word "QUANTUM"?',
    correctAnswer: '2520',
    acceptedAnswers: ['2520', '2,520', '2520 permutations'],
    options: ['2,520', '5,040', '1,260', '720'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: '7 letters total with 2 "U"s: 7! / 2! = 5040 / 2 = 2520.',
    active: true,
  },
  {
    id: 'gus_q_r1_5',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 5,
    question: 'What is the determinant of the 2x2 matrix [[4, 3], [2, 5]]?',
    correctAnswer: '14',
    acceptedAnswers: ['14', 'fourteen', '14.0'],
    options: ['14', '20', '26', '6'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'det = (4)(5) - (3)(2) = 20 - 6 = 14.',
    active: true,
  },
  {
    id: 'gus_q_r1_6',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 6,
    question: 'If a fair 6-sided die is rolled twice, what is the probability of rolling a sum of 8 (as a fraction)?',
    correctAnswer: '5/36',
    acceptedAnswers: ['5/36', '5 / 36', '5 out of 36'],
    options: ['5/36', '1/6', '7/36', '1/9'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Combinations that sum to 8: (2,6), (3,5), (4,4), (5,3), (6,2) -> 5 outcomes out of 36.',
    active: true,
  },
  {
    id: 'gus_q_r1_7',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 7,
    question: 'What is the binary representation of the decimal integer 45?',
    correctAnswer: '101101',
    acceptedAnswers: ['101101', '101101_2', '0b101101'],
    options: ['101101', '110011', '101010', '100101'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: '32 + 8 + 4 + 1 = 45 = 101101₂.',
    active: true,
  },
  {
    id: 'gus_q_r1_8',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 8,
    question: 'What is the limit of (sin x) / x as x approaches 0?',
    correctAnswer: '1',
    acceptedAnswers: ['1', 'one', '1.0'],
    options: ['1', '0', 'Undefined', 'Infinity'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'lim (x->0) (sin x)/x = 1 by L\'Hopital\'s rule / standard Taylor expansion.',
    active: true,
  },
  {
    id: 'gus_q_r1_9',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 9,
    question: 'If a triangle has side lengths 7, 24, and 25, what is the exact area of the triangle?',
    correctAnswer: '84',
    acceptedAnswers: ['84', '84 square units', '84 sq units', '84.0'],
    options: ['84', '168', '175', '96'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: '7² + 24² = 49 + 576 = 625 = 25² (right triangle). Area = (1/2)(7)(24) = 84.',
    active: true,
  },
  {
    id: 'gus_q_r1_10',
    roundNumber: 1,
    roundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    questionOrder: 10,
    question: 'In Boolean algebra, what is the simplified algebraic form of the expression A + A\'B?',
    correctAnswer: 'A + B',
    acceptedAnswers: ['A + B', 'A+B', 'A or B', 'A OR B'],
    options: ['A + B', 'A · B', 'A\' + B', '1'],
    correctOptionIndex: 0,
    topic: 'Mathematics & Logic',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'A + A\'B = (A + A\')(A + B) = 1 · (A + B) = A + B.',
    active: true,
  },

  // ROUND 2: Quantum Computing & Theoretical Physics (Q1..10)
  {
    id: 'gus_q_r2_1',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 1,
    question: 'What quantum principle allows a qubit to represent a linear combination of |0⟩ and |1⟩ simultaneously?',
    correctAnswer: 'Superposition',
    acceptedAnswers: ['Superposition', 'Quantum Superposition', 'Principle of Superposition'],
    options: ['Superposition', 'Quantum Decoherence', 'Tunneling', 'Adiabatic Compression'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Superposition enables a quantum state |ψ⟩ = α|0⟩ + β|1⟩ where |α|² + |β|² = 1.',
    active: true,
  },
  {
    id: 'gus_q_r2_2',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 2,
    question: 'What is the action of the Hadamard quantum gate (H) when applied to the computational base state |0⟩?',
    correctAnswer: '(|0⟩ + |1⟩)/√2',
    acceptedAnswers: ['(|0⟩ + |1⟩)/√2', '(|0> + |1>)/sqrt(2)', '|+>', '|+⟩', '1/sqrt(2)(|0>+|1>)'],
    options: ['(|0⟩ + |1⟩)/√2', '(|0⟩ - |1⟩)/√2', '|1⟩', 'i|0⟩'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'H|0⟩ creates the balanced equal superposition (|0⟩ + |1⟩)/√2, denoted |+⟩.',
    active: true,
  },
  {
    id: 'gus_q_r2_3',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 3,
    question: 'Which famous quantum algorithm provides an exponential speedup for finding prime factors of an integer?',
    correctAnswer: 'Shor\'s Algorithm',
    acceptedAnswers: ['Shor\'s Algorithm', 'Shors Algorithm', 'Peter Shor Algorithm', 'Shor Algorithm'],
    options: ['Shor\'s Algorithm', 'Grover\'s Algorithm', 'Deutsch-Jozsa Algorithm', 'VQE'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Shor\'s algorithm factors integers in polynomial time O((log N)³), breaking RSA.',
    active: true,
  },
  {
    id: 'gus_q_r2_4',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 4,
    question: 'What speedup does Grover\'s search algorithm achieve over classical unstructured search (e.g. O(√N))?',
    correctAnswer: 'Quadratic speedup',
    acceptedAnswers: ['Quadratic speedup', 'Quadratic', 'O(sqrt(N))', 'O(√N)'],
    options: ['Quadratic speedup O(√N)', 'Exponential speedup O(log N)', 'Linear speedup O(N/2)', 'Cubic speedup O(N^(1/3))'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Grover\'s algorithm finds a marked item in O(√N) oracle queries versus classical O(N).',
    active: true,
  },
  {
    id: 'gus_q_r2_5',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 5,
    question: 'What is the Pauli-Z operator matrix representation in the standard computational basis?',
    correctAnswer: '[[1, 0], [0, -1]]',
    acceptedAnswers: ['[[1, 0], [0, -1]]', 'diag(1, -1)', '[[1,0],[0,-1]]', '1 0; 0 -1'],
    options: ['[[1, 0], [0, -1]]', '[[0, 1], [1, 0]]', '[[0, -i], [i, 0]]', '[[1, 0], [0, 1]]'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Pauli-Z flips the phase of |1⟩: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ -> [[1,0],[0,-1]].',
    active: true,
  },
  {
    id: 'gus_q_r2_6',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 6,
    question: 'According to the No-Cloning Theorem in quantum mechanics, what operation is strictly impossible?',
    correctAnswer: 'Creating an identical copy of an arbitrary unknown quantum state',
    acceptedAnswers: ['Creating an identical copy of an arbitrary unknown quantum state', 'Cloning an unknown quantum state', 'Copying quantum state', 'Cloning quantum states'],
    options: ['Creating an identical copy of an arbitrary unknown quantum state', 'Entangling two qubits', 'Measuring a qubit without collapse', 'Transferring quantum information via teleportation'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Due to linearity of unitary operators, an arbitrary unknown state |ψ⟩ cannot be perfectly duplicated.',
    active: true,
  },
  {
    id: 'gus_q_r2_7',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 7,
    question: 'What quantum property is characterized by non-local correlation between two spatially separated particles violating Bell inequalities?',
    correctAnswer: 'Quantum Entanglement',
    acceptedAnswers: ['Quantum Entanglement', 'Entanglement', 'Bell Entanglement'],
    options: ['Quantum Entanglement', 'Spontaneous Emission', 'Photoelectric Threshold', 'Compton Scattering'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Entangled states like Bell states (|00⟩ + |11⟩)/√2 violate classical local realism.',
    active: true,
  },
  {
    id: 'gus_q_r2_8',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 8,
    question: 'What is the formula for the energy E of a photon with frequency ν according to the Planck-Einstein relation?',
    correctAnswer: 'E = hν',
    acceptedAnswers: ['E = hν', 'E = hv', 'E=hf', 'E = hf', 'hf', 'hv'],
    options: ['E = hν', 'E = mc²', 'E = 1/2 hν²', 'E = h/λ²'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'E = hν (where h is Planck\'s constant 6.626 × 10⁻³⁴ J·s).',
    active: true,
  },
  {
    id: 'gus_q_r2_9',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 9,
    question: 'What metric tensor describes flat spacetime in Special Relativity?',
    correctAnswer: 'Minkowski metric',
    acceptedAnswers: ['Minkowski metric', 'Minkowski', 'eta_munu', 'Minkowski spacetime'],
    options: ['Minkowski metric η_μν = diag(-1, 1, 1, 1)', 'Schwarzschild metric', 'Kerr metric', 'FLRW metric'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Flat spacetime is represented by the Minkowski metric with signature (-,+,+,+) or (+,-,-,-).',
    active: true,
  },
  {
    id: 'gus_q_r2_10',
    roundNumber: 2,
    roundName: 'Round 2 — Quantum Computing & Theoretical Physics',
    questionOrder: 10,
    question: 'In quantum error correction, what is the minimum number of physical qubits required to detect and correct any single-qubit error (Steane / Shor codes)?',
    correctAnswer: '5 qubits',
    acceptedAnswers: ['5 qubits', '5', 'five', '5 qubit code'],
    options: ['5 qubits', '3 qubits', '7 qubits', '9 qubits'],
    correctOptionIndex: 0,
    topic: 'Physics & Computing',
    difficulty: 'Master',
    timeLimitSeconds: 20,
    explanation: 'The 5-qubit code is the smallest quantum error-correcting code protecting against any arbitrary single-qubit error.',
    active: true,
  },

  // ROUND 3: Computational Neuroscience & Bio-Systems (Q1..10)
  {
    id: 'gus_q_r3_1',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 1,
    question: 'Which mathematical differential equations model action potentials in giant squid axons (Hodgkin & Huxley)?',
    correctAnswer: 'Hodgkin-Huxley Model',
    acceptedAnswers: ['Hodgkin-Huxley Model', 'Hodgkin Huxley', 'Hodgkin-Huxley', 'HH model'],
    options: ['Hodgkin-Huxley Model', 'FitzHugh-Nagumo Model', 'Navier-Stokes Equations', 'Lotka-Volterra Equations'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Hodgkin and Huxley (1952) modeled ionic conductances (Na+, K+, leak) across neuronal membranes.',
    active: true,
  },
  {
    id: 'gus_q_r3_2',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 2,
    question: 'What biological macromolecule enzyme functions as the primary catalyst in cellular transcription?',
    correctAnswer: 'RNA Polymerase',
    acceptedAnswers: ['RNA Polymerase', 'RNAP', 'RNA pol'],
    options: ['RNA Polymerase', 'DNA Helicase', 'Ribosome', 'DNA Ligase'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'RNA Polymerase synthesizes mRNA transcripts from template DNA strands.',
    active: true,
  },
  {
    id: 'gus_q_r3_3',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 3,
    question: 'What neurotransmitter is predominantly responsible for long-term potentiation (LTP) in the hippocampus?',
    correctAnswer: 'Glutamate',
    acceptedAnswers: ['Glutamate', 'Glutamatergic', 'Glutamic acid'],
    options: ['Glutamate', 'Dopamine', 'GABA', 'Serotonin'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Glutamate activates NMDA and AMPA receptors to induce synaptic plasticity and LTP.',
    active: true,
  },
  {
    id: 'gus_q_r3_4',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 4,
    question: 'What is the typical resting membrane potential of a mammalian cortical neuron in millivolts?',
    correctAnswer: '-70 mV',
    acceptedAnswers: ['-70 mV', '-70mV', '-70', '-65 to -70 mV'],
    options: ['Approximately -70 mV', '+30 mV', '-20 mV', '0 mV'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'Resting potential is maintained between -65 mV and -70 mV by Na+/K+ ATPases.',
    active: true,
  },
  {
    id: 'gus_q_r3_5',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 5,
    question: 'What CRISPR-associated endonuclease is widely utilized for targeted genomic double-strand breaks?',
    correctAnswer: 'Cas9',
    acceptedAnswers: ['Cas9', 'CRISPR Cas9', 'CRISPR-Cas9', 'Cas-9'],
    options: ['Cas9', 'Taq Polymerase', 'Topoisomerase II', 'Reverse Transcriptase'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'Cas9 guided by single-guide RNA (sgRNA) produces precise blunt double-strand breaks.',
    active: true,
  },
  {
    id: 'gus_q_r3_6',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 6,
    question: 'In computational neuroscience, what rule states that "neurons that fire together, wire together"?',
    correctAnswer: 'Hebbian Learning Rule',
    acceptedAnswers: ['Hebbian Learning Rule', 'Hebb\'s Rule', 'Hebbian learning', 'Hebbian plasticity', 'Hebbs rule'],
    options: ['Hebbian Learning Rule', 'Hopfield Convergence Theorem', 'Bayesian Plasticity', 'Spike-Timing-Dependent Plasticity (STDP)'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'Donald Hebb (1949) postulated that persistent co-activation increases synaptic efficacy.',
    active: true,
  },
  {
    id: 'gus_q_r3_7',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 7,
    question: 'What structure in bacterial cells facilitates horizontal gene transfer via conjugation?',
    correctAnswer: 'Sex Pilus',
    acceptedAnswers: ['Sex Pilus', 'Pilus', 'F-pilus', 'Conjugative pilus'],
    options: ['Sex Pilus', 'Flagellum', 'Peptidoglycan wall', 'Capsule'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'The F-pilus (sex pilus) establishes contact to transfer plasmid DNA between bacterial cells.',
    active: true,
  },
  {
    id: 'gus_q_r3_8',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 8,
    question: 'What cellular organelle is responsible for ATP synthesis via oxidative phosphorylation?',
    correctAnswer: 'Mitochondria',
    acceptedAnswers: ['Mitochondria', 'Mitochondrion'],
    options: ['Mitochondria', 'Golgi Apparatus', 'Endoplasmic Reticulum', 'Lysosome'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'Mitochondria produce cellular ATP through the electron transport chain and ATP synthase.',
    active: true,
  },
  {
    id: 'gus_q_r3_9',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 9,
    question: 'What primary inhibitory neurotransmitter in the mammalian central nervous system hyperpolarizes post-synaptic neurons?',
    correctAnswer: 'GABA',
    acceptedAnswers: ['GABA', 'Gamma-aminobutyric acid', 'gamma aminobutyric acid'],
    options: ['GABA', 'Acetylcholine', 'Norepinephrine', 'Histamine'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Easy',
    timeLimitSeconds: 20,
    explanation: 'GABA increases chloride conductance, hyperpolarizing the neuron and dampening action potential generation.',
    active: true,
  },
  {
    id: 'gus_q_r3_10',
    roundNumber: 3,
    roundName: 'Round 3 — Computational Neuroscience & Bio-Systems',
    questionOrder: 10,
    question: 'What mathematical equation calculates the equilibrium electrical potential across a membrane for a single ion species?',
    correctAnswer: 'Nernst Equation',
    acceptedAnswers: ['Nernst Equation', 'Nernst', 'Nernst-Planck'],
    options: ['Nernst Equation', 'Goldman-Hodgkin-Katz Equation', 'Michaelis-Menten Equation', 'Arrhenius Equation'],
    correctOptionIndex: 0,
    topic: 'Neuroscience & Biology',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'The Nernst equation E = (RT/zF) ln([ion]_out / [ion]_in) determines single-ion reversal potential.',
    active: true,
  },

  // ROUND 8: Apex Grandmaster Olympiad (Q1..10)
  {
    id: 'gus_q_r8_1',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 1,
    question: 'In computational complexity theory, which Millennium Prize Problem asks if polynomial-time verification implies polynomial-time decision solvability?',
    correctAnswer: 'P versus NP Problem',
    acceptedAnswers: ['P versus NP Problem', 'P vs NP', 'P versus NP', 'P=NP', 'P vs NP Problem'],
    options: ['P versus NP Problem', 'Riemann Hypothesis', 'Navier-Stokes Existence', 'Hodge Conjecture'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'P vs NP investigates whether problems verifiable in polynomial time can also be solved in polynomial time.',
    active: true,
  },
  {
    id: 'gus_q_r8_2',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 2,
    question: 'What celebrated mathematical theorem states that any consistent formal axiomatic system capable of arithmetic cannot be both complete and consistent (1931)?',
    correctAnswer: 'First Incompleteness Theorem',
    acceptedAnswers: ['First Incompleteness Theorem', 'Gödel\'s Incompleteness Theorem', 'Godel Incompleteness Theorem', 'Incompleteness Theorem'],
    options: ['First Incompleteness Theorem', 'Halting Decidability Theorem', 'Compactness Theorem', 'Church-Turing Thesis'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Kurt Gödel proved that true but unprovable statements exist in any consistent arithmetic framework.',
    active: true,
  },
  {
    id: 'gus_q_r8_3',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 3,
    question: 'What complex-analytic conjecture asserts that all non-trivial zeros of the Riemann zeta function ζ(s) have a real part equal to 1/2?',
    correctAnswer: 'The Riemann Hypothesis',
    acceptedAnswers: ['The Riemann Hypothesis', 'Riemann Hypothesis', 'RH'],
    options: ['The Riemann Hypothesis', 'The Birch and Swinnerton-Dyer Conjecture', 'Goldbach\'s Conjecture', 'Collatz Conjecture'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'The Riemann Hypothesis is intimately linked to the asymptotic distribution of prime numbers.',
    active: true,
  },
  {
    id: 'gus_q_r8_4',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 4,
    question: 'What fundamental equation governs the quantum time evolution of non-relativistic wavefunctions (Schrödinger)?',
    correctAnswer: 'iℏ ∂ψ/∂t = Ĥψ',
    acceptedAnswers: ['iℏ ∂ψ/∂t = Ĥψ', 'Schrodinger Equation', 'Schrödinger equation', 'ih dpsi/dt = H psi'],
    options: ['iℏ ∂ψ/∂t = Ĥψ', '∇²ψ = 0', 'E = mc²', '∂²ψ/∂t² = c² ∇²ψ'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Medium',
    timeLimitSeconds: 20,
    explanation: 'The time-dependent Schrödinger equation equates the time derivative to the Hamiltonian operator applied to |ψ⟩.',
    active: true,
  },
  {
    id: 'gus_q_r8_5',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 5,
    question: 'What cryptographic zero-knowledge construct avoids trusted setups entirely by using transparent hash functions and error-correcting codes (Ben-Sasson et al.)?',
    correctAnswer: 'zk-STARKs',
    acceptedAnswers: ['zk-STARKs', 'STARKs', 'zkSTARKs', 'zk-STARK'],
    options: ['zk-STARKs', 'Groth16 zk-SNARKs', 'PLONK', 'KZG Polynomial Commitments'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Master',
    timeLimitSeconds: 20,
    explanation: 'zk-STARKs (Scalable Transparent Arguments of Knowledge) are post-quantum secure and require no trusted setup ceremony.',
    active: true,
  },
  {
    id: 'gus_q_r8_6',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 6,
    question: 'What theoretical limit states that erasing 1 bit of information dissipates at least kT ln(2) of heat into the environment?',
    correctAnswer: 'Landauer\'s Principle',
    acceptedAnswers: ['Landauer\'s Principle', 'Landauers Principle', 'Landauer Limit', 'Landauer principle'],
    options: ['Landauer\'s Principle', 'Bremermann\'s Limit', 'Margolus-Levitin Theorem', 'Bekenstein Bound'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Master',
    timeLimitSeconds: 20,
    explanation: 'Rolf Landauer (1961) proved logical irreversibility requires thermodynamic entropy dissipation.',
    active: true,
  },
  {
    id: 'gus_q_r8_7',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 7,
    question: 'What mathematical principle in information theory establishes that the maximum lossless data compression rate of a source X is bounded by its Shannon entropy H(X)?',
    correctAnswer: 'Shannon\'s Source Coding Theorem',
    acceptedAnswers: ['Shannon\'s Source Coding Theorem', 'Source Coding Theorem', 'Shannons Source Coding Theorem', 'Noiseless Coding Theorem'],
    options: ['Shannon\'s Source Coding Theorem', 'Nyquist-Shannon Sampling Theorem', 'Noisy-Channel Coding Theorem', 'Kraft-McMillan Inequality'],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Claude Shannon (1948) proved expected codeword length cannot be compressed below H(X) bits per symbol.',
    active: true,
  },
  {
    id: 'gus_q_r8_8',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 8,
    question: 'What topological property was proven by Grigori Perelman (2003) resolving the Poincaré Conjecture using Ricci flow with surgery?',
    correctAnswer: 'Every simply connected, closed 3-manifold is homeomorphic to the 3-sphere S³',
    acceptedAnswers: ['Every simply connected, closed 3-manifold is homeomorphic to the 3-sphere S³', 'Poincare conjecture', 'Poincaré Conjecture', 'Geometrization conjecture'],
    options: [
      'Every simply connected, closed 3-manifold is homeomorphic to the 3-sphere S³',
      'The 4-color theorem holds on all toroidal embeddings',
      'Knot invariants determine fundamental homotopy groups',
      'Smooth 4-manifolds admit non-standard differential structures'
    ],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Master',
    timeLimitSeconds: 20,
    explanation: 'Perelman proved Thurston\'s Geometrization Conjecture, establishing the Poincaré Conjecture.',
    active: true,
  },
  {
    id: 'gus_q_r8_9',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 9,
    question: 'In deep reinforcement learning, what equation recursively computes the optimal state-value function V*(s)?',
    correctAnswer: 'Bellman Optimality Equation',
    acceptedAnswers: ['Bellman Optimality Equation', 'Bellman Equation', 'Bellman optimality', 'Bellman'],
    options: [
      'Bellman Optimality Equation: V*(s) = max_a [ R(s,a) + γ ∑ P(s\'|s,a) V*(s\') ]',
      'Kalman Filter Update Equation',
      'Markov Chain Monte Carlo Transition Kernel',
      'Backpropagation Gradient Descent'
    ],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Hard',
    timeLimitSeconds: 20,
    explanation: 'Richard Bellman\'s optimality principle forms the core foundation of MDPs and Q-learning.',
    active: true,
  },
  {
    id: 'gus_q_r8_10',
    roundNumber: 8,
    roundName: 'Round 8 — Grandmaster Apex Olympiad (Final Round)',
    questionOrder: 10,
    question: 'What universal holographic bound establishes the maximum entropy S that can be contained within a region bounded by surface area A?',
    correctAnswer: 'Bekenstein-Hawking Bound',
    acceptedAnswers: ['Bekenstein-Hawking Bound', 'Bekenstein bound', 'Bekenstein Hawking', 'Bekenstein-Hawking formula'],
    options: [
      'Bekenstein-Hawking Bound: S ≤ (k c³ A) / (4 G ℏ)',
      'Planck Length Limit: L_p = √(ℏG/c³)',
      'Hubble Horizon Entropy: S = 2π k R_H',
      'Gibbs Entropy Ceiling: S = k ln Ω'
    ],
    correctOptionIndex: 0,
    topic: 'Grandmaster Synthesis',
    difficulty: 'Master',
    timeLimitSeconds: 20,
    explanation: 'The Bekenstein-Hawking formula bounds the information content of any physical volume by its boundary area in Planck units.',
    active: true,
  },
];

// =========================================================================
// 2. INITIALIZATION & SETUP
// =========================================================================

export const ensureGusDefaultCompetition = async (): Promise<GusCompetition> => {
  const compRef = doc(db, 'gusCompetitions', DEFAULT_GUS_COMPETITION_ID);
  const snap = await getDoc(compRef);

  let compData: GusCompetition;

  if (snap.exists()) {
    compData = snap.data() as GusCompetition;
  } else {
    compData = {
      id: DEFAULT_GUS_COMPETITION_ID,
      seasonId: DEFAULT_GUS_SEASON_ID,
      title: 'GUS Season 1 — Grandmaster Elimination Olympiad',
      status: 'Registration Open',
      prizePoolGP: 500000,
      prizePoolVisibility: 'VISIBLE',
      currentRound: 1,
      currentRoundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
      currentQuestionIndex: 0,
      totalRounds: 8,
      questionsPerRound: 10,
      totalQuestions: 80,
      timePerQuestionSeconds: 20,
      roundEligibility: {
        1: 'FREE_AND_PREMIUM',
        2: 'FREE_AND_PREMIUM',
        3: 'PREMIUM_ONLY',
        4: 'PREMIUM_ONLY',
        5: 'PREMIUM_ONLY',
        6: 'PREMIUM_ONLY',
        7: 'PREMIUM_ONLY',
        8: 'PREMIUM_ONLY',
      },
      rules: [
        'GUS is a synchronized live typed-answer elimination competition.',
        'Scholars type their answers directly in real time before the synchronized countdown reaches zero.',
        'No individual GP is awarded per question — survival and advancement is the sole objective.',
        'Submitting an incorrect answer or failing to submit before the timer expires results in immediate elimination.',
        'The entire prize pool is awarded exclusively to the final surviving Grandmaster(s) upon completing all rounds.',
      ],
      totalParticipants: 0,
      activeParticipants: 0,
      eliminatedParticipants: 0,
      startedAt: new Date().toISOString(),
    };
    await setDoc(compRef, compData);
  }

  // Initialize Season 1 in gusSeasons if not present
  const seasonRef = doc(db, 'gusSeasons', DEFAULT_GUS_SEASON_ID);
  const seasonSnap = await getDoc(seasonRef);
  if (!seasonSnap.exists()) {
    const defaultSeason: GusSeason = {
      id: DEFAULT_GUS_SEASON_ID,
      title: 'GUS Season 1 — Grandmaster Elimination Olympiad',
      seasonNumber: 1,
      description: 'The premier national inter-university typed-answer academic olympiad.',
      status: 'Registration Open',
      registrationStartDate: '2026-08-01',
      registrationEndDate: '2026-08-31',
      competitionStartDate: '2026-09-01',
      competitionEndDate: '2026-10-31',
      prizePoolGP: 500000,
      prizePoolVisibility: 'VISIBLE',
      rules: compData.rules || [
        'GUS is a synchronized live typed-answer elimination competition.',
        'Scholars type their answers directly in real time before the countdown reaches zero.',
        'Wrong answers or timeouts result in elimination.',
      ],
      registeredParticipantIds: [],
      activeParticipantIds: [],
      eliminatedParticipantIds: [],
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
      rounds: Array.from({ length: 8 }).map((_, idx) => {
        const rNum = idx + 1;
        const theme = SEED_GUS_ROUND_THEMES[rNum];
        return {
          id: `round_${DEFAULT_GUS_SEASON_ID}_${rNum}`,
          seasonId: DEFAULT_GUS_SEASON_ID,
          roundNumber: rNum,
          name: theme.title,
          title: theme.title,
          date: theme.date || `2026-09-0${rNum}`,
          status: 'Upcoming',
          timePerQuestionSeconds: 20,
          eligibility: rNum <= 2 ? 'FREE_AND_PREMIUM' : 'PREMIUM_ONLY',
        };
      }),
      prizes: [
        { position: 1, title: '1st Place Grandmaster', percentage: 70, gpAmount: 350000 },
        { position: 2, title: '2nd Place Finalist', percentage: 20, gpAmount: 100000 },
        { position: 3, title: '3rd Place Finalist', percentage: 10, gpAmount: 50000 },
      ],
      winners: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(seasonRef, defaultSeason);
  }

  // Initialize live state document if not present
  const liveRef = doc(db, 'gusLive', DEFAULT_GUS_COMPETITION_ID);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) {
    const initialQ = INITIAL_80_GUS_QUESTIONS[0];
    const defaultLive: GusLiveState = {
      competitionId: DEFAULT_GUS_COMPETITION_ID,
      seasonId: DEFAULT_GUS_SEASON_ID,
      title: compData.title || 'GUS Season 1 — Grandmaster Elimination Olympiad',
      status: 'WAITING',
      currentRound: 1,
      currentRoundName: compData.currentRoundName || 'Round 1 — Fundamental Logic & Quantitative Reasoning',
      currentQuestionOrder: 1,
      currentQuestionIndex: 0,
      totalRounds: 8,
      questionsPerRound: 10,
      question: {
        id: initialQ.id,
        question: initialQ.question,
        topic: initialQ.topic,
        difficulty: initialQ.difficulty,
        timeLimitSeconds: initialQ.timeLimitSeconds,
        correctAnswer: initialQ.correctAnswer,
        options: initialQ.options,
      },
      questionStartedAt: Date.now(),
      questionEndsAt: Date.now() + 20000,
      timeLimitSeconds: 20,
      totalParticipants: compData.totalParticipants || 0,
      activeParticipants: compData.activeParticipants || 0,
      eliminatedParticipants: compData.eliminatedParticipants || 0,
      roundEligibility: 'FREE_AND_PREMIUM',
      prizePoolGP: compData.prizePoolGP || 500000,
      prizePoolVisibility: compData.prizePoolVisibility || 'VISIBLE',
    };
    await setDoc(liveRef, defaultLive);
  }

  // Seed default question bank with seasonId tagged
  await seedGusQuestionBank(DEFAULT_GUS_SEASON_ID);

  return compData;
};

export const seedGusQuestionBank = async (seasonId?: string): Promise<void> => {
  const targetSeasonId = seasonId || DEFAULT_GUS_SEASON_ID;
  const storageKey = `grobax_seeded_gus_questions_${targetSeasonId}`;
  
  if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
    return;
  }

  try {
    // Check if the question bank was already initialized using a single meta check
    const metaRef = doc(db, 'gusQuestionsMeta', targetSeasonId);
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, 'true');
      }
      return;
    }

    // Seed questions in atomic batches rather than 80 individual getDoc queries
    const batch = writeBatch(db);
    let count = 0;
    for (const q of INITIAL_80_GUS_QUESTIONS) {
      const qDocId = `${targetSeasonId}_${q.id}`;
      const qRef = doc(db, 'gusQuestions', qDocId);
      batch.set(qRef, {
        ...q,
        id: qDocId,
        seasonId: targetSeasonId,
        createdAt: new Date().toISOString(),
      }, { merge: true });
      count++;
    }
    batch.set(metaRef, {
      seasonId: targetSeasonId,
      questionCount: count,
      seededAt: new Date().toISOString(),
    });
    await batch.commit();

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  } catch (err) {
    console.warn('GUS question bank seeding notice (using fallback):', err);
  }
};

// =========================================================================
// 3. MULTI-SEASON MANAGEMENT
// =========================================================================

export const subscribeToGusSeasons = (callback: (seasons: GusSeason[]) => void) => {
  const q = query(collection(db, 'gusSeasons'), limit(20));
  return onSnapshot(
    q,
    async snapshot => {
      if (snapshot.empty) {
        // Auto-seed default Season 1 once
        await ensureGusDefaultCompetition().catch(() => {});
        return;
      }
      const seasons: GusSeason[] = [];
      snapshot.forEach(docSnap => {
        seasons.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      seasons.sort((a, b) => (b.seasonNumber || 1) - (a.seasonNumber || 1));
      callback(seasons);
    },
    err => {
      console.warn('GUS Seasons snapshot error:', err);
      callback([]);
    }
  );
};

export const createGusSeason = async (seasonData: Partial<GusSeason>): Promise<GusSeason> => {
  const seasonId = seasonData.id || `gus_season_${Date.now()}`;
  const totalRounds = seasonData.rounds?.length || 8;
  const initialRounds: GusRound[] = seasonData.rounds || [
    {
      id: `r_1_${Date.now()}`,
      seasonId,
      roundNumber: 1,
      name: 'Round 1 — Preliminary Logic & Reasoning',
      date: new Date().toISOString().split('T')[0],
      status: 'Upcoming',
      timePerQuestionSeconds: 20,
      eligibility: 'FREE_AND_PREMIUM',
    },
  ];

  const fullSeason: GusSeason = {
    id: seasonId,
    title: seasonData.title || `GUS Season ${Date.now()}`,
    seasonNumber: seasonData.seasonNumber || 1,
    description: seasonData.description || 'National Inter-Institutional Academic Olympiad.',
    status: seasonData.status || 'Draft',
    registrationStartDate: seasonData.registrationStartDate || new Date().toISOString().split('T')[0],
    registrationEndDate: seasonData.registrationEndDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    competitionStartDate: seasonData.competitionStartDate || new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
    competitionEndDate: seasonData.competitionEndDate || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    prizePoolGP: seasonData.prizePoolGP || 500000,
    prizePoolVisibility: seasonData.prizePoolVisibility || 'VISIBLE',
    rules: seasonData.rules || [
      'GUS is a live typed-answer elimination competition.',
      'Scholars type their answers in real time.',
      'Wrong answers or timeouts result in elimination.',
    ],
    registeredParticipantIds: [],
    activeParticipantIds: [],
    eliminatedParticipantIds: [],
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    rounds: initialRounds,
    prizes: seasonData.prizes || [
      { position: 1, title: 'Grandmaster Champion', percentage: 100, gpAmount: seasonData.prizePoolGP || 500000 },
    ],
    winners: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const seasonRef = doc(db, 'gusSeasons', seasonId);
  await setDoc(seasonRef, fullSeason);

  // Sync to competition if active
  const compRef = doc(db, 'gusCompetitions', DEFAULT_GUS_COMPETITION_ID);
  await updateDoc(compRef, {
    seasonId,
    title: fullSeason.title,
    prizePoolGP: fullSeason.prizePoolGP,
    totalRounds: fullSeason.rounds.length,
  }).catch(() => {});

  return fullSeason;
};

export const updateGusSeason = async (seasonId: string, updates: Partial<GusSeason>): Promise<void> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  await updateDoc(seasonRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Sync to main competition document if modifying active season
  const compRef = doc(db, 'gusCompetitions', DEFAULT_GUS_COMPETITION_ID);
  const compUpdates: any = {};
  if (updates.title) compUpdates.title = updates.title;
  if (updates.prizePoolGP !== undefined) compUpdates.prizePoolGP = updates.prizePoolGP;
  if (updates.prizePoolVisibility) compUpdates.prizePoolVisibility = updates.prizePoolVisibility;
  if (updates.status) compUpdates.status = updates.status;
  if (updates.rounds) compUpdates.totalRounds = updates.rounds.length;

  if (Object.keys(compUpdates).length > 0) {
    await updateDoc(compRef, compUpdates).catch(() => {});
  }
};

export const deleteGusSeason = async (seasonId: string): Promise<void> => {
  // 1. Batch delete all questions under this season
  const qSnap = await getDocs(
    query(collection(db, 'gusQuestions'), where('seasonId', '==', seasonId))
  );
  const batch1 = writeBatch(db);
  qSnap.docs.forEach((d) => batch1.delete(d.ref));
  if (!qSnap.empty) {
    await batch1.commit();
  }

  // 2. Batch delete all participants under this season
  const pSnap = await getDocs(
    query(collection(db, 'gusParticipants'), where('seasonId', '==', seasonId))
  );
  const batch2 = writeBatch(db);
  pSnap.docs.forEach((d) => batch2.delete(d.ref));
  if (!pSnap.empty) {
    await batch2.commit();
  }

  // 3. Batch delete all answers submitted under this season
  const aSnap = await getDocs(
    query(collection(db, 'gusAnswers'), where('seasonId', '==', seasonId))
  );
  const batch3 = writeBatch(db);
  aSnap.docs.forEach((d) => batch3.delete(d.ref));
  if (!aSnap.empty) {
    await batch3.commit();
  }

  // 4. Delete the season document itself
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  await deleteDoc(seasonRef);
};

// =========================================================================
// 4. DYNAMIC ROUND MANAGEMENT
// =========================================================================

export const addGusRoundToSeason = async (
  seasonId: string,
  round: {
    name: string;
    date: string;
    roundNumber?: number;
    timePerQuestionSeconds?: number;
    eligibility?: GusRoundEligibility;
  }
): Promise<GusRound> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const snap = await getDoc(seasonRef);

  let rounds: GusRound[] = [];
  if (snap.exists()) {
    const sData = snap.data() as GusSeason;
    rounds = sData.rounds || [];
  }

  const nextNum = round.roundNumber || rounds.length + 1;
  const newRound: GusRound = {
    id: `round_${seasonId}_${nextNum}_${Date.now()}`,
    seasonId,
    roundNumber: nextNum,
    name: round.name.trim(),
    title: round.name.trim(),
    date: round.date,
    status: 'Upcoming',
    timePerQuestionSeconds: round.timePerQuestionSeconds || 20,
    eligibility: round.eligibility || (nextNum <= 2 ? 'FREE_AND_PREMIUM' : 'PREMIUM_ONLY'),
  };

  rounds.push(newRound);
  rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  await updateDoc(seasonRef, {
    rounds,
    updatedAt: new Date().toISOString(),
  });

  // Also update totalRounds on competition
  const compRef = doc(db, 'gusCompetitions', DEFAULT_GUS_COMPETITION_ID);
  await updateDoc(compRef, {
    totalRounds: rounds.length,
  }).catch(() => {});

  return newRound;
};

export const updateGusRoundInSeason = async (
  seasonId: string,
  roundId: string,
  updates: Partial<GusRound>
): Promise<void> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const snap = await getDoc(seasonRef);

  if (snap.exists()) {
    const sData = snap.data() as GusSeason;
    const rounds = (sData.rounds || []).map(r => {
      if (r.id === roundId || r.roundNumber === updates.roundNumber) {
        return { ...r, ...updates, title: updates.name || r.name };
      }
      return r;
    });

    await updateDoc(seasonRef, {
      rounds,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const deleteGusRoundFromSeason = async (
  seasonId: string,
  roundId: string
): Promise<void> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const snap = await getDoc(seasonRef);

  if (snap.exists()) {
    const sData = snap.data() as GusSeason;
    const rounds = (sData.rounds || []).filter(r => r.id !== roundId);
    // Re-index remaining rounds
    rounds.forEach((r, idx) => {
      r.roundNumber = idx + 1;
    });

    await updateDoc(seasonRef, {
      rounds,
      updatedAt: new Date().toISOString(),
    });

    const compRef = doc(db, 'gusCompetitions', DEFAULT_GUS_COMPETITION_ID);
    await updateDoc(compRef, {
      totalRounds: rounds.length,
    }).catch(() => {});
  }
};

// =========================================================================
// 5. REALTIME SUBSCRIPTIONS
// =========================================================================

export const subscribeToGusLiveState = (
  competitionId: string,
  callback: (state: GusLiveState | null) => void
) => {
  const liveRef = doc(db, 'gusLive', competitionId);
  return onSnapshot(
    liveRef,
    docSnap => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GusLiveState);
      } else {
        callback(null);
      }
    },
    err => {
      console.warn('GUS Live state snapshot error:', err);
      callback(null);
    }
  );
};

export const subscribeToGusCompetition = (
  competitionId: string,
  callback: (comp: GusCompetition | null) => void
) => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  return onSnapshot(
    compRef,
    docSnap => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GusCompetition);
      } else {
        callback(null);
      }
    },
    err => {
      console.warn('GUS competition doc snapshot error:', err);
      callback(null);
    }
  );
};

export const subscribeToGusParticipant = (
  competitionId: string,
  userId: string,
  callback: (participant: GusParticipantRecord | null) => void
) => {
  const partDocId = `${competitionId}_${userId}`;
  const partRef = doc(db, 'gusParticipants', partDocId);

  return onSnapshot(
    partRef,
    docSnap => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GusParticipantRecord);
      } else {
        callback(null);
      }
    },
    err => {
      console.warn('GUS participant snapshot error:', err);
      callback(null);
    }
  );
};

export const subscribeToGusParticipantsList = (
  competitionId: string,
  callback: (participants: GusParticipantRecord[]) => void
) => {
  const q = query(
    collection(db, 'gusParticipants'),
    where('competitionId', '==', competitionId),
    limit(50)
  );

  return onSnapshot(
    q,
    snapshot => {
      const list: GusParticipantRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as GusParticipantRecord);
      });
      callback(list);
    },
    err => {
      console.warn('GUS participants list snapshot error:', err);
      callback([]);
    }
  );
};

export const fetchGusQuestionBank = async (seasonId?: string): Promise<GusQuestionBankItem[]> => {
  try {
    const snap = await getDocs(query(collection(db, 'gusQuestions'), limit(100)));
    if (!snap.empty) {
      let list = snap.docs.map(d => d.data() as GusQuestionBankItem);
      if (seasonId) {
        list = list.filter(q => !q.seasonId || q.seasonId === seasonId);
      }
      list.sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
        return a.questionOrder - b.questionOrder;
      });
      return list;
    }
    return INITIAL_80_GUS_QUESTIONS;
  } catch (err) {
    console.warn('Error fetching GUS question bank:', err);
    return INITIAL_80_GUS_QUESTIONS;
  }
};

export const subscribeToGusQuestionBank = (
  seasonIdOrCallback?: string | ((questions: GusQuestionBankItem[]) => void),
  possibleCallback?: (questions: GusQuestionBankItem[]) => void
) => {
  let targetSeasonId: string | undefined;
  let callback: (questions: GusQuestionBankItem[]) => void;

  if (typeof seasonIdOrCallback === 'function') {
    callback = seasonIdOrCallback;
    targetSeasonId = undefined;
  } else {
    targetSeasonId = seasonIdOrCallback;
    callback = possibleCallback || (() => {});
  }

  const q = query(collection(db, 'gusQuestions'), orderBy('roundNumber', 'asc'), limit(100));

  return onSnapshot(
    q,
    snapshot => {
      const list: GusQuestionBankItem[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data() as GusQuestionBankItem;
        if (!targetSeasonId || !item.seasonId || item.seasonId === targetSeasonId) {
          list.push(item);
        }
      });
      list.sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
        return a.questionOrder - b.questionOrder;
      });
      callback(list);
    },
    err => {
      console.warn('GUS Question bank snapshot error:', err);
      callback([]);
    }
  );
};

// =========================================================================
// 6. USER ACTIONS: REGISTRATION & TYPED ANSWER SUBMISSION
// =========================================================================

export const registerForGusCompetition = async (
  competitionId: string,
  user: {
    id: string;
    name: string;
    avatar?: string;
    institution?: string;
    department?: string;
    level?: string;
    tier?: string;
  },
  isPremium: boolean = false,
  seasonId?: string
): Promise<GusParticipantRecord> => {
  const targetSeasonId = seasonId || DEFAULT_GUS_SEASON_ID;
  const partDocId = `${competitionId}_${user.id}`;
  const partRef = doc(db, 'gusParticipants', partDocId);
  const partSnap = await getDoc(partRef);

  if (partSnap.exists()) {
    const existing = partSnap.data() as GusParticipantRecord;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`gus_registered_${targetSeasonId}_${user.id}`, 'true');
        localStorage.setItem(`gus_registered_${competitionId}_${user.id}`, 'true');
      }
    } catch {}
    return existing;
  }

  // Double check query by seasonId & userId to ensure no re-registration
  const existingQuerySnap = await getDocs(
    query(
      collection(db, 'gusParticipants'),
      where('competitionId', '==', competitionId),
      where('userId', '==', user.id)
    )
  );

  if (!existingQuerySnap.empty) {
    const existing = existingQuerySnap.docs[0].data() as GusParticipantRecord;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`gus_registered_${targetSeasonId}_${user.id}`, 'true');
        localStorage.setItem(`gus_registered_${competitionId}_${user.id}`, 'true');
      }
    } catch {}
    return existing;
  }

  const record: GusParticipantRecord = {
    id: partDocId,
    competitionId,
    seasonId: targetSeasonId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '',
    institution: user.institution || 'Grobaax Academy',
    department: user.department || 'General Sciences',
    level: user.level || '300 Level',
    registrationStatus: 'REGISTERED',
    status: 'ACTIVE',
    currentRound: 1,
    currentQuestion: 1,
    questionsCompleted: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    isPremium,
    registeredAt: new Date().toISOString(),
  };

  await setDoc(partRef, record);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`gus_registered_${targetSeasonId}_${user.id}`, 'true');
      localStorage.setItem(`gus_registered_${competitionId}_${user.id}`, 'true');
    }
  } catch {}

  // Update counts in competition and liveState
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const compSnap = await getDoc(compRef);
  if (compSnap.exists()) {
    const cData = compSnap.data() as GusCompetition;
    const newTotal = (cData.totalParticipants || 0) + 1;
    const newActive = (cData.activeParticipants || 0) + 1;
    await updateDoc(compRef, {
      totalParticipants: newTotal,
      activeParticipants: newActive,
    });
    const liveRef = doc(db, 'gusLive', competitionId);
    await updateDoc(liveRef, {
      totalParticipants: newTotal,
      activeParticipants: newActive,
    }).catch(() => {});
  }

  // Also record participant in season
  const seasonRef = doc(db, 'gusSeasons', targetSeasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (seasonSnap.exists()) {
    const sData = seasonSnap.data() as GusSeason;
    const currentRegs = sData.registeredParticipantIds || [];
    const currentActive = sData.activeParticipantIds || [];
    if (!currentRegs.includes(user.id)) {
      await updateDoc(seasonRef, {
        registeredParticipantIds: [...currentRegs, user.id],
        activeParticipantIds: [...currentActive, user.id],
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  return record;
};

export const submitGusAnswer = async (
  competitionId: string,
  userId: string,
  roundNumber: number,
  questionOrder: number,
  submittedAnswer: string | number
): Promise<{
  isCorrect: boolean;
  status: 'ACTIVE' | 'ELIMINATED';
  correctAnswer: string;
  explanation?: string;
}> => {
  const liveRef = doc(db, 'gusLive', competitionId);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) {
    throw new Error('Live competition room not found.');
  }

  const liveState = liveSnap.data() as GusLiveState;
  const now = Date.now();

  const partDocId = `${competitionId}_${userId}`;
  const partRef = doc(db, 'gusParticipants', partDocId);
  const partSnap = await getDoc(partRef);

  if (!partSnap.exists()) {
    throw new Error('You are not registered for this GUS competition.');
  }

  const participant = partSnap.data() as GusParticipantRecord;
  if (participant.status === 'ELIMINATED') {
    return {
      isCorrect: false,
      status: 'ELIMINATED',
      correctAnswer: '',
    };
  }

  // Find question in question bank to verify answer
  const qId = liveState.question?.id || `gus_q_r${roundNumber}_${questionOrder}`;
  const qDocRef = doc(db, 'gusQuestions', qId);
  const qDocSnap = await getDoc(qDocRef);

  let targetCorrectAnswer = '';
  let acceptedAlternatives: string[] = [];
  let explanation = '';

  if (qDocSnap.exists()) {
    const qData = qDocSnap.data() as GusQuestionBankItem;
    targetCorrectAnswer = qData.correctAnswer || (qData.options && qData.options[qData.correctOptionIndex || 0]) || '';
    acceptedAlternatives = qData.acceptedAnswers || [];
    explanation = qData.explanation || '';
  } else {
    const seedQ = INITIAL_80_GUS_QUESTIONS.find(
      q => q.roundNumber === roundNumber && q.questionOrder === questionOrder
    );
    if (seedQ) {
      targetCorrectAnswer = seedQ.correctAnswer || seedQ.options?.[seedQ.correctOptionIndex || 0] || '';
      acceptedAlternatives = seedQ.acceptedAnswers || [];
      explanation = seedQ.explanation || '';
    }
  }

  const isTimeout =
    submittedAnswer === -1 ||
    submittedAnswer === '-1' ||
    (liveState.questionEndsAt && now > liveState.questionEndsAt + 4000);

  let isCorrect = false;

  if (!isTimeout) {
    const normalizedSub = normalizeGusAnswer(submittedAnswer);
    const normalizedTarget = normalizeGusAnswer(targetCorrectAnswer);

    if (normalizedSub && normalizedTarget && normalizedSub === normalizedTarget) {
      isCorrect = true;
    } else if (
      acceptedAlternatives &&
      acceptedAlternatives.some(alt => normalizeGusAnswer(alt) === normalizedSub)
    ) {
      isCorrect = true;
    } else if (typeof submittedAnswer === 'number' && liveState.question?.options) {
      // Legacy index support
      const chosenOpt = liveState.question.options[submittedAnswer];
      if (chosenOpt && normalizeGusAnswer(chosenOpt) === normalizedTarget) {
        isCorrect = true;
      }
    }
  }

  // Record Answer in Firestore
  const ansDocId = `${competitionId}_r${roundNumber}_q${questionOrder}_${userId}`;
  const ansRef = doc(db, 'gusAnswers', ansDocId);
  await setDoc(ansRef, {
    id: ansDocId,
    competitionId,
    userId,
    roundNumber,
    questionOrder,
    submittedAnswer: String(submittedAnswer),
    isCorrect,
    submittedAt: now,
  });

  if (isCorrect) {
    await updateDoc(partRef, {
      questionsCompleted: (participant.questionsCompleted || 0) + 1,
      correctAnswers: (participant.correctAnswers || 0) + 1,
      currentQuestion: questionOrder + 1,
      lastAnswerSubmittedAt: now,
      lastAnswerCorrect: true,
      lastSubmittedAnswerText: String(submittedAnswer),
    });
    return {
      isCorrect: true,
      status: 'ACTIVE',
      correctAnswer: targetCorrectAnswer,
      explanation,
    };
  } else {
    const reason = isTimeout ? 'Time Expired' : 'Wrong Answer';
    await updateDoc(partRef, {
      status: 'ELIMINATED',
      incorrectAnswers: (participant.incorrectAnswers || 0) + 1,
      eliminatedAtRound: roundNumber,
      eliminatedAtQuestion: questionOrder,
      eliminationReason: reason,
      lastAnswerSubmittedAt: now,
      lastAnswerCorrect: false,
      lastSubmittedAnswerText: String(submittedAnswer),
    });

    const newActive = Math.max(0, (liveState.activeParticipants || 1) - 1);
    const newElim = (liveState.eliminatedParticipants || 0) + 1;
    await updateDoc(liveRef, {
      activeParticipants: newActive,
      eliminatedParticipants: newElim,
    }).catch(() => {});

    const compRef = doc(db, 'gusCompetitions', competitionId);
    await updateDoc(compRef, {
      activeParticipants: newActive,
      eliminatedParticipants: newElim,
    }).catch(() => {});

    return {
      isCorrect: false,
      status: 'ELIMINATED',
      correctAnswer: targetCorrectAnswer,
      explanation,
    };
  }
};

// =========================================================================
// 7. LIVE COMPETITION ENGINE & ADMIN CONTROLS
// =========================================================================

export const adminStartGusCompetition = async (
  competitionId: string,
  startRound: number = 1,
  seasonId?: string
): Promise<void> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const liveRef = doc(db, 'gusLive', competitionId);
  const targetSeasonId = seasonId || DEFAULT_GUS_SEASON_ID;

  // Query question bank for this season & round
  let qItem: GusQuestionBankItem | null = null;
  const qSnap = await getDocs(
    query(
      collection(db, 'gusQuestions'),
      where('seasonId', '==', targetSeasonId),
      where('roundNumber', '==', startRound),
      where('questionOrder', '==', 1)
    )
  );

  if (!qSnap.empty) {
    qItem = qSnap.docs[0].data() as GusQuestionBankItem;
  } else {
    // Fallback: roundNumber only (backward compatibility)
    const fallbackSnap = await getDocs(
      query(
        collection(db, 'gusQuestions'),
        where('roundNumber', '==', startRound),
        where('questionOrder', '==', 1)
      )
    );
    if (!fallbackSnap.empty) {
      qItem = fallbackSnap.docs[0].data() as GusQuestionBankItem;
    } else {
      qItem = INITIAL_80_GUS_QUESTIONS.find(
        q => q.roundNumber === startRound && q.questionOrder === 1
      ) || INITIAL_80_GUS_QUESTIONS[0];
    }
  }

  const compSnap = await getDoc(compRef);
  const compData = compSnap.exists() ? (compSnap.data() as GusCompetition) : null;
  const timeLimit = qItem?.timeLimitSeconds || compData?.timePerQuestionSeconds || 20;

  const now = Date.now();
  const endsAt = now + timeLimit * 1000;

  const roundElig = compData?.roundEligibility?.[startRound] || 'FREE_AND_PREMIUM';
  const roundTheme = SEED_GUS_ROUND_THEMES[startRound]?.title || `Round ${startRound}`;

  await updateDoc(compRef, {
    status: 'Live',
    currentRound: startRound,
    currentRoundName: roundTheme,
    currentQuestionIndex: 0,
    startedAt: new Date().toISOString(),
    ...(seasonId ? { seasonId } : {}),
  });

  await updateDoc(liveRef, {
    status: 'LIVE',
    currentRound: startRound,
    currentRoundName: roundTheme,
    currentQuestionOrder: 1,
    currentQuestionIndex: 0,
    seasonId: targetSeasonId,
    question: {
      id: qItem.id,
      question: qItem.question,
      topic: qItem.topic,
      difficulty: qItem.difficulty,
      timeLimitSeconds: timeLimit,
      correctAnswer: qItem.correctAnswer,
      options: qItem.options,
    },
    questionStartedAt: now,
    questionEndsAt: endsAt,
    timeLimitSeconds: timeLimit,
    roundEligibility: roundElig,
    prizePoolGP: compData?.prizePoolGP || 500000,
    prizePoolVisibility: compData?.prizePoolVisibility || 'VISIBLE',
  });

  // Also update season status if season exists
  const seasonRef = doc(db, 'gusSeasons', targetSeasonId);
  await updateDoc(seasonRef, {
    status: 'In Progress',
    currentRoundIndex: startRound - 1,
    currentQuestionIndex: 0,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
};

export const adminAdvanceGusQuestion = async (
  competitionId: string,
  seasonId?: string
): Promise<{ finished: boolean; currentRound: number; currentQuestionOrder: number }> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const liveRef = doc(db, 'gusLive', competitionId);

  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) {
    throw new Error('Live competition not found.');
  }

  const liveState = liveSnap.data() as GusLiveState;
  const compSnap = await getDoc(compRef);
  const compData = compSnap.exists() ? (compSnap.data() as GusCompetition) : null;
  const targetSeasonId = seasonId || liveState.seasonId || compData?.seasonId || DEFAULT_GUS_SEASON_ID;

  // Check how many questions exist in current round for this season
  const currentRoundQs = await getDocs(
    query(
      collection(db, 'gusQuestions'),
      where('seasonId', '==', targetSeasonId),
      where('roundNumber', '==', liveState.currentRound)
    )
  );
  const maxQsInRound = currentRoundQs.empty ? 10 : currentRoundQs.size;

  let nextRound = liveState.currentRound;
  let nextQOrder = liveState.currentQuestionOrder + 1;

  if (nextQOrder > maxQsInRound) {
    const totalRounds = compData?.totalRounds || 8;
    if (nextRound >= totalRounds) {
      await concludeGusCompetition(competitionId, targetSeasonId);
      return { finished: true, currentRound: totalRounds, currentQuestionOrder: maxQsInRound };
    } else {
      nextRound += 1;
      nextQOrder = 1;
    }
  }

  // Load question for nextRound, nextQOrder
  const qSnap = await getDocs(
    query(
      collection(db, 'gusQuestions'),
      where('seasonId', '==', targetSeasonId),
      where('roundNumber', '==', nextRound),
      where('questionOrder', '==', nextQOrder)
    )
  );

  let qItem: GusQuestionBankItem | null = null;
  if (!qSnap.empty) {
    qItem = qSnap.docs[0].data() as GusQuestionBankItem;
  } else {
    // Fallback: roundNumber and order only
    const fallbackSnap = await getDocs(
      query(
        collection(db, 'gusQuestions'),
        where('roundNumber', '==', nextRound),
        where('questionOrder', '==', nextQOrder)
      )
    );
    if (!fallbackSnap.empty) {
      qItem = fallbackSnap.docs[0].data() as GusQuestionBankItem;
    } else {
      qItem = INITIAL_80_GUS_QUESTIONS.find(
        q => q.roundNumber === nextRound && q.questionOrder === nextQOrder
      ) || null;
    }
  }

  if (!qItem) {
    qItem = {
      id: `gus_q_r${nextRound}_${nextQOrder}`,
      roundNumber: nextRound,
      roundName: `Round ${nextRound}`,
      questionOrder: nextQOrder,
      question: `GUS Round ${nextRound} — Grandmaster Challenge ${nextQOrder}`,
      correctAnswer: 'Master Solution',
      acceptedAnswers: ['Master Solution'],
      topic: SEED_GUS_ROUND_THEMES[nextRound]?.topic || 'Academic Synthesis',
      difficulty: 'Master',
      timeLimitSeconds: 20,
      active: true,
      seasonId: targetSeasonId,
    };
  }

  const timeLimit = qItem.timeLimitSeconds || compData?.timePerQuestionSeconds || 20;
  const now = Date.now();
  const endsAt = now + timeLimit * 1000;
  const roundElig = compData?.roundEligibility?.[nextRound] || (nextRound <= 2 ? 'FREE_AND_PREMIUM' : 'PREMIUM_ONLY');
  const roundTheme = SEED_GUS_ROUND_THEMES[nextRound]?.title || `Round ${nextRound}`;

  await updateDoc(compRef, {
    currentRound: nextRound,
    currentRoundName: roundTheme,
    currentQuestionIndex: nextQOrder - 1,
  });

  await updateDoc(liveRef, {
    status: 'LIVE',
    currentRound: nextRound,
    currentRoundName: roundTheme,
    currentQuestionOrder: nextQOrder,
    currentQuestionIndex: nextQOrder - 1,
    question: {
      id: qItem.id,
      question: qItem.question,
      topic: qItem.topic,
      difficulty: qItem.difficulty,
      timeLimitSeconds: timeLimit,
      correctAnswer: qItem.correctAnswer,
      options: qItem.options,
    },
    questionStartedAt: now,
    questionEndsAt: endsAt,
    timeLimitSeconds: timeLimit,
    roundEligibility: roundElig,
  });

  // Also sync season progress
  const seasonRef = doc(db, 'gusSeasons', targetSeasonId);
  await updateDoc(seasonRef, {
    currentRoundIndex: nextRound - 1,
    currentQuestionIndex: nextQOrder - 1,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  return { finished: false, currentRound: nextRound, currentQuestionOrder: nextQOrder };
};

export const adminPauseGusCompetition = async (competitionId: string): Promise<void> => {
  const liveRef = doc(db, 'gusLive', competitionId);
  await updateDoc(liveRef, { status: 'PAUSED' });
  const compRef = doc(db, 'gusCompetitions', competitionId);
  await updateDoc(compRef, { status: 'Paused' });
};

export const adminResumeGusCompetition = async (competitionId: string): Promise<void> => {
  const liveRef = doc(db, 'gusLive', competitionId);
  const snap = await getDoc(liveRef);
  if (snap.exists()) {
    const data = snap.data() as GusLiveState;
    const now = Date.now();
    const endsAt = now + (data.timeLimitSeconds || 20) * 1000;
    await updateDoc(liveRef, {
      status: 'LIVE',
      questionStartedAt: now,
      questionEndsAt: endsAt,
    });
    const compRef = doc(db, 'gusCompetitions', competitionId);
    await updateDoc(compRef, { status: 'Live' });
  }
};

export const concludeGusCompetition = async (
  competitionId: string,
  seasonId?: string
): Promise<{ winners: GusWinner[]; prizePerWinner: number }> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const liveRef = doc(db, 'gusLive', competitionId);

  const compSnap = await getDoc(compRef);
  const comp = compSnap.exists() ? (compSnap.data() as GusCompetition) : null;
  const targetSeasonId = seasonId || comp?.seasonId || DEFAULT_GUS_SEASON_ID;
  const prizePool = comp?.prizePoolGP || 500000;

  const pSnap = await getDocs(
    query(
      collection(db, 'gusParticipants'),
      where('competitionId', '==', competitionId),
      where('status', '==', 'ACTIVE')
    )
  );

  const survivors: GusParticipantRecord[] = [];
  pSnap.forEach(d => survivors.push(d.data() as GusParticipantRecord));

  let finalWinners: GusWinner[] = [];
  let prizePerWinner = prizePool;

  if (survivors.length > 0) {
    prizePerWinner = Math.floor(prizePool / survivors.length);
    finalWinners = survivors.map((p, idx) => ({
      id: `win_${competitionId}_${p.userId}`,
      position: idx + 1,
      positionTitle: survivors.length === 1 ? '1st Place — Ultimate Scholar Champion' : `Co-Champion (#${idx + 1})`,
      userId: p.userId,
      userName: p.userName,
      userAvatar: p.userAvatar,
      institution: p.institution,
      gpAwarded: prizePerWinner,
      finalRoundReached: 8,
      finalScore: p.correctAnswers || 80,
    }));

    for (const p of survivors) {
      const partRef = doc(db, 'gusParticipants', `${competitionId}_${p.userId}`);
      await updateDoc(partRef, {
        status: 'COMPLETED',
        prizeAwardedGP: prizePerWinner,
      });

      const txId = `tx_gus_${competitionId}_${p.userId}`;
      const txRef = doc(db, 'transactions', txId);
      await setDoc(txRef, {
        id: txId,
        userId: p.userId,
        userName: p.userName,
        type: 'GUS_PRIZE',
        amount: prizePerWinner,
        currency: 'GP',
        status: 'completed',
        description: `GUS Season Grand Prize — ${survivors.length === 1 ? 'Solo Ultimate Champion' : 'Co-Champion Split'}`,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      const userRef = doc(db, 'users', p.userId);
      const uSnap = await getDoc(userRef);
      if (uSnap.exists()) {
        const uData = uSnap.data();
        const currentGP = uData?.gpBalance || 0;
        await updateDoc(userRef, {
          gpBalance: currentGP + prizePerWinner,
          gusTier: 'Grandmaster',
          gusRank: 1,
        }).catch(() => {});
      }
    }
  }

  await updateDoc(compRef, {
    status: 'Completed',
    completedAt: new Date().toISOString(),
    winners: finalWinners,
    activeParticipants: 0,
  });

  await updateDoc(liveRef, {
    status: 'COMPLETED',
    winners: finalWinners,
    activeParticipants: 0,
  });

  const seasonRef = doc(db, 'gusSeasons', targetSeasonId);
  await updateDoc(seasonRef, {
    status: 'Completed',
    winners: finalWinners,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  return { winners: finalWinners, prizePerWinner };
};

export const adminResetGusCompetition = async (
  competitionId: string,
  seasonId?: string
): Promise<void> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const liveRef = doc(db, 'gusLive', competitionId);

  const compSnap = await getDoc(compRef);
  const compData = compSnap.exists() ? (compSnap.data() as GusCompetition) : null;
  const targetSeasonId = seasonId || compData?.seasonId || DEFAULT_GUS_SEASON_ID;

  const pSnap = await getDocs(
    query(collection(db, 'gusParticipants'), where('competitionId', '==', competitionId))
  );

  const batchUpdates: Promise<any>[] = [];
  const activeIds: string[] = [];
  pSnap.forEach(d => {
    activeIds.push(d.id);
    batchUpdates.push(
      updateDoc(d.ref, {
        status: 'ACTIVE',
        currentRound: 1,
        currentQuestion: 1,
        questionsCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        eliminatedAtRound: null,
        eliminatedAtQuestion: null,
        eliminationReason: null,
        lastAnswerCorrect: null,
        lastSubmittedAnswerText: null,
        lastAnswerSubmittedAt: null,
        prizeAwardedGP: 0,
      })
    );
  });
  await Promise.all(batchUpdates);

  const total = pSnap.size;

  // Retrieve initial question for this season
  let initialQ: GusQuestionBankItem | null = null;
  const qSnap = await getDocs(
    query(
      collection(db, 'gusQuestions'),
      where('seasonId', '==', targetSeasonId),
      where('roundNumber', '==', 1),
      where('questionOrder', '==', 1)
    )
  );

  if (!qSnap.empty) {
    initialQ = qSnap.docs[0].data() as GusQuestionBankItem;
  } else {
    initialQ = INITIAL_80_GUS_QUESTIONS[0];
  }

  await updateDoc(compRef, {
    status: 'Registration Open',
    currentRound: 1,
    currentRoundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    currentQuestionIndex: 0,
    totalParticipants: total,
    activeParticipants: total,
    eliminatedParticipants: 0,
    winners: [],
    ...(seasonId ? { seasonId } : {}),
  });

  await updateDoc(liveRef, {
    status: 'WAITING',
    currentRound: 1,
    currentRoundName: 'Round 1 — Fundamental Logic & Quantitative Reasoning',
    currentQuestionOrder: 1,
    currentQuestionIndex: 0,
    seasonId: targetSeasonId,
    question: {
      id: initialQ.id,
      question: initialQ.question,
      topic: initialQ.topic,
      difficulty: initialQ.difficulty,
      timeLimitSeconds: initialQ.timeLimitSeconds || 20,
      correctAnswer: initialQ.correctAnswer,
      options: initialQ.options,
    },
    questionStartedAt: Date.now(),
    questionEndsAt: Date.now() + 20000,
    totalParticipants: total,
    activeParticipants: total,
    eliminatedParticipants: 0,
    winners: [],
  });

  // Update Season document
  const seasonRef = doc(db, 'gusSeasons', targetSeasonId);
  await updateDoc(seasonRef, {
    status: 'Registration Open',
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    activeParticipantIds: activeIds,
    eliminatedParticipantIds: [],
    winners: [],
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
};

export const adminUpdateGusSettings = async (
  competitionId: string,
  settings: {
    prizePoolGP?: number;
    prizePoolVisibility?: GusPrizeVisibility;
    timePerQuestionSeconds?: number;
    roundEligibility?: Record<number, GusRoundEligibility>;
  }
): Promise<void> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  await updateDoc(compRef, settings);

  const liveRef = doc(db, 'gusLive', competitionId);
  const liveUpdates: any = {};
  if (settings.prizePoolGP !== undefined) liveUpdates.prizePoolGP = settings.prizePoolGP;
  if (settings.prizePoolVisibility !== undefined) liveUpdates.prizePoolVisibility = settings.prizePoolVisibility;
  if (settings.timePerQuestionSeconds !== undefined) liveUpdates.timeLimitSeconds = settings.timePerQuestionSeconds;
  if (Object.keys(liveUpdates).length > 0) {
    await updateDoc(liveRef, liveUpdates).catch(() => {});
  }
};

// =========================================================================
// 8. QUESTION BANK CRUD (TYPED-ANSWER BASED)
// =========================================================================

export const adminSaveGusQuestion = async (
  question: Partial<GusQuestionBankItem> & { roundNumber: number; questionOrder: number; correctAnswer: string }
): Promise<GusQuestionBankItem> => {
  const qId = question.id || `gus_q_r${question.roundNumber}_${question.questionOrder}_${Date.now()}`;
  const fullQ: GusQuestionBankItem = {
    id: qId,
    seasonId: question.seasonId,
    roundId: question.roundId,
    roundNumber: question.roundNumber,
    roundName: question.roundName || `Round ${question.roundNumber}`,
    questionOrder: question.questionOrder,
    question: question.question || '',
    correctAnswer: question.correctAnswer.trim(),
    acceptedAnswers: question.acceptedAnswers || [question.correctAnswer.trim()],
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    topic: question.topic || SEED_GUS_ROUND_THEMES[question.roundNumber]?.topic || 'Academic Logic',
    difficulty: question.difficulty || 'Medium',
    timeLimitSeconds: question.timeLimitSeconds || 20,
    explanation: question.explanation || '',
    active: question.active ?? true,
    createdAt: question.createdAt || new Date().toISOString(),
  };

  const qRef = doc(db, 'gusQuestions', qId);
  await setDoc(qRef, fullQ);
  return fullQ;
};

export const adminDeleteGusQuestion = async (questionId: string): Promise<void> => {
  const qRef = doc(db, 'gusQuestions', questionId);
  await deleteDoc(qRef);
};

export const adminBulkDeleteGusQuestions = async (options?: {
  seasonId?: string;
  roundNumber?: number;
  questionIds?: string[];
}): Promise<number> => {
  try {
    if (options?.questionIds && options.questionIds.length > 0) {
      const ids = options.questionIds;
      for (let i = 0; i < ids.length; i += 400) {
        const chunk = ids.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.delete(doc(db, 'gusQuestions', id)));
        await batch.commit();
      }
      return ids.length;
    }

    const qSnap = await getDocs(collection(db, 'gusQuestions'));
    let docsToDelete = qSnap.docs;

    if (options?.seasonId) {
      docsToDelete = docsToDelete.filter(d => {
        const data = d.data();
        return !data.seasonId || data.seasonId === options.seasonId;
      });
    }

    if (options?.roundNumber !== undefined) {
      docsToDelete = docsToDelete.filter(d => {
        const data = d.data();
        return data.roundNumber === options.roundNumber;
      });
    }

    const total = docsToDelete.length;
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const chunk = docsToDelete.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return total;
  } catch (err) {
    console.error('adminBulkDeleteGusQuestions error:', err);
    throw err;
  }
};

// =========================================================================
// 9. PARTICIPANTS CRUD (ADMIN)
// =========================================================================

export const adminSaveParticipant = async (
  competitionId: string,
  participantData: Partial<GusParticipantRecord> & { userId: string; userName: string }
): Promise<GusParticipantRecord> => {
  const partDocId = participantData.id || `${competitionId}_${participantData.userId}`;
  const partRef = doc(db, 'gusParticipants', partDocId);
  const snap = await getDoc(partRef);
  const isNew = !snap.exists();

  const record: GusParticipantRecord = {
    id: partDocId,
    competitionId,
    seasonId: participantData.seasonId || DEFAULT_GUS_SEASON_ID,
    userId: participantData.userId.trim(),
    userName: participantData.userName.trim(),
    userAvatar: participantData.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${participantData.userId}`,
    institution: participantData.institution || 'Federal University of Technology',
    department: participantData.department || 'Computer Science & Engineering',
    level: participantData.level || '400 Level',
    registrationStatus: 'REGISTERED',
    status: participantData.status || 'ACTIVE',
    currentRound: participantData.currentRound ?? 1,
    currentQuestion: participantData.currentQuestion ?? 1,
    questionsCompleted: participantData.questionsCompleted ?? 0,
    correctAnswers: participantData.correctAnswers ?? 0,
    incorrectAnswers: participantData.incorrectAnswers ?? 0,
    isPremium: participantData.isPremium ?? false,
    eliminatedAtRound: participantData.eliminatedAtRound,
    eliminatedAtQuestion: participantData.eliminatedAtQuestion,
    eliminationReason: participantData.eliminationReason,
    prizeAwardedGP: participantData.prizeAwardedGP ?? 0,
    registeredAt: participantData.registeredAt || new Date().toISOString(),
    lastSubmittedAnswerText: participantData.lastSubmittedAnswerText || '',
  };

  await setDoc(partRef, record, { merge: true });

  // Recalculate participant counts
  await recalculateGusParticipantCounts(competitionId);

  return record;
};

export const adminDeleteParticipant = async (
  competitionId: string,
  participantDocId: string
): Promise<void> => {
  const partRef = doc(db, 'gusParticipants', participantDocId);
  await deleteDoc(partRef);

  // Recalculate participant counts
  await recalculateGusParticipantCounts(competitionId);
};

export const adminUpdateParticipantStatus = async (
  competitionId: string,
  participantDocId: string,
  status: GusParticipantStatus,
  reason?: 'Wrong Answer' | 'Time Expired' | 'Premium Required' | 'Disqualified'
): Promise<void> => {
  const partRef = doc(db, 'gusParticipants', participantDocId);
  const updates: any = { status };
  if (status === 'ACTIVE') {
    updates.eliminatedAtRound = null;
    updates.eliminatedAtQuestion = null;
    updates.eliminationReason = null;
  } else if (status === 'ELIMINATED' || status === 'DISQUALIFIED') {
    if (reason) updates.eliminationReason = reason;
  }

  await updateDoc(partRef, updates);
  await recalculateGusParticipantCounts(competitionId);
};

export const recalculateGusParticipantCounts = async (competitionId: string): Promise<void> => {
  const pSnap = await getDocs(
    query(collection(db, 'gusParticipants'), where('competitionId', '==', competitionId))
  );
  let total = 0;
  let active = 0;
  let eliminated = 0;

  pSnap.forEach(d => {
    total++;
    const p = d.data() as GusParticipantRecord;
    if (p.status === 'ACTIVE') active++;
    else if (p.status === 'ELIMINATED' || p.status === 'DISQUALIFIED') eliminated++;
  });

  const compRef = doc(db, 'gusCompetitions', competitionId);
  await updateDoc(compRef, {
    totalParticipants: total,
    activeParticipants: active,
    eliminatedParticipants: eliminated,
  }).catch(() => {});

  const liveRef = doc(db, 'gusLive', competitionId);
  await updateDoc(liveRef, {
    totalParticipants: total,
    activeParticipants: active,
    eliminatedParticipants: eliminated,
  }).catch(() => {});
};

// =========================================================================
// 10. MANUAL LIVE STATE OVERRIDE (ADMIN)
// =========================================================================

export const adminUpdateLiveStateManually = async (
  competitionId: string,
  updates: Partial<GusLiveState>
): Promise<void> => {
  const liveRef = doc(db, 'gusLive', competitionId);
  await updateDoc(liveRef, updates);

  // Sync key fields to competition doc
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const compUpdates: any = {};
  if (updates.status) {
    compUpdates.status = updates.status === 'LIVE' ? 'Live' : updates.status === 'PAUSED' ? 'Paused' : updates.status === 'COMPLETED' ? 'Completed' : 'Upcoming';
  }
  if (updates.currentRound !== undefined) compUpdates.currentRound = updates.currentRound;
  if (updates.currentRoundName) compUpdates.currentRoundName = updates.currentRoundName;
  if (updates.currentQuestionIndex !== undefined) compUpdates.currentQuestionIndex = updates.currentQuestionIndex;
  if (updates.prizePoolGP !== undefined) compUpdates.prizePoolGP = updates.prizePoolGP;
  if (updates.prizePoolVisibility) compUpdates.prizePoolVisibility = updates.prizePoolVisibility;
  if (updates.activeParticipants !== undefined) compUpdates.activeParticipants = updates.activeParticipants;
  if (updates.eliminatedParticipants !== undefined) compUpdates.eliminatedParticipants = updates.eliminatedParticipants;

  if (Object.keys(compUpdates).length > 0) {
    await updateDoc(compRef, compUpdates).catch(() => {});
  }
};

// =========================================================================
// 11. PRIZE TIERS & WINNERS CRUD (ADMIN)
// =========================================================================

export const adminSavePrizeTier = async (
  seasonId: string,
  prize: GusPrizeConfig
): Promise<void> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const snap = await getDoc(seasonRef);
  if (!snap.exists()) return;

  const sData = snap.data() as GusSeason;
  let prizes = [...(sData.prizes || [])];

  const existingIdx = prizes.findIndex(p => p.id === prize.id || p.position === prize.position);
  if (existingIdx >= 0) {
    prizes[existingIdx] = { ...prizes[existingIdx], ...prize };
  } else {
    prizes.push({
      id: prize.id || `prize_${seasonId}_${prize.position}_${Date.now()}`,
      ...prize,
    });
  }

  prizes.sort((a, b) => a.position - b.position);

  await updateDoc(seasonRef, {
    prizes,
    updatedAt: new Date().toISOString(),
  });
};

export const adminDeletePrizeTier = async (
  seasonId: string,
  positionOrId: number | string
): Promise<void> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const snap = await getDoc(seasonRef);
  if (!snap.exists()) return;

  const sData = snap.data() as GusSeason;
  const prizes = (sData.prizes || []).filter(
    p => p.id !== positionOrId && p.position !== positionOrId
  );

  await updateDoc(seasonRef, {
    prizes,
    updatedAt: new Date().toISOString(),
  });
};

export const adminSaveWinnerRecord = async (
  competitionId: string,
  winner: Partial<GusWinner> & { userId: string; userName: string }
): Promise<GusWinner> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const snap = await getDoc(compRef);
  let winners: GusWinner[] = [];
  if (snap.exists()) {
    winners = (snap.data() as GusCompetition).winners || [];
  }

  const winId = winner.id || `win_${competitionId}_${winner.userId}_${Date.now()}`;
  const fullWin: GusWinner = {
    id: winId,
    position: winner.position || winners.length + 1,
    positionTitle: winner.positionTitle || `${winner.position || winners.length + 1} Place Grandmaster`,
    userId: winner.userId,
    userName: winner.userName,
    userAvatar: winner.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.userId}`,
    institution: winner.institution || 'Federal University of Technology',
    gpAwarded: winner.gpAwarded || 500000,
    finalRoundReached: winner.finalRoundReached || 8,
    finalScore: winner.finalScore || 80,
  };

  const existingIdx = winners.findIndex(w => w.id === winId || w.userId === winner.userId);
  if (existingIdx >= 0) {
    winners[existingIdx] = fullWin;
  } else {
    winners.push(fullWin);
  }

  winners.sort((a, b) => a.position - b.position);

  await updateDoc(compRef, { winners });
  const liveRef = doc(db, 'gusLive', competitionId);
  await updateDoc(liveRef, { winners }).catch(() => {});

  return fullWin;
};

export const adminDeleteWinnerRecord = async (
  competitionId: string,
  winnerId: string
): Promise<void> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  const snap = await getDoc(compRef);
  if (!snap.exists()) return;

  const winners = ((snap.data() as GusCompetition).winners || []).filter(w => w.id !== winnerId);
  await updateDoc(compRef, { winners });
  const liveRef = doc(db, 'gusLive', competitionId);
  await updateDoc(liveRef, { winners }).catch(() => {});
};

export const adminUpdateRules = async (
  competitionId: string,
  rules: string[],
  seasonId?: string
): Promise<void> => {
  const compRef = doc(db, 'gusCompetitions', competitionId);
  await updateDoc(compRef, { rules });

  if (seasonId) {
    const seasonRef = doc(db, 'gusSeasons', seasonId);
    await updateDoc(seasonRef, {
      rules,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }
};

