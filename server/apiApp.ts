import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { vtuRouter } from './vtuRoutes';
import { minimartRouter } from './minimartRouter';
import { paystackRouter } from './paystackRouter';
import { libraryRouter } from './libraryRouter';
import { campusRouter } from './campusRouter';
import { walletRouter } from './walletRouter';
import {
  enrichHandoutWithFullChaptersAndImages,
  getAcademicPhotoForChapter,
  generateVisualSvgDiagram,
} from '../src/lib/academicIllustrationService';
import { getAuthCallbackHtml } from './authCallbackHtml';

dotenv.config();

export const apiApp = express();

// Global CORS Middleware - allow cross-origin API calls and handle preflight FIRST
apiApp.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Vercel Serverless Path Normalizer Middleware
// Accurately maps paths rewritten by Vercel (?__path=... or [...all]) back to standard Express paths while preserving query strings
apiApp.use((req: Request, _res: Response, next: NextFunction) => {
  const rawPath = req.query && (req.query.__path || req.query.all);
  if (rawPath) {
    const raw = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    const cleanPath = String(raw).replace(/^\/+/, '');
    if (req.query) {
      delete req.query.__path;
      delete req.query.all;
    }

    const queryIdx = cleanPath.indexOf('?');
    const pathPart = queryIdx >= 0 ? cleanPath.substring(0, queryIdx) : cleanPath;
    const internalQuery = queryIdx >= 0 ? cleanPath.substring(queryIdx + 1) : '';

    const withSlash = pathPart ? (pathPart.startsWith('/') ? pathPart : '/' + pathPart) : '';
    const apiPrefixed = withSlash.startsWith('/api') ? withSlash : (withSlash ? '/api' + withSlash : '/api/health');

    const existingQueryStr = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '')
      .split('&')
      .filter((part) => part && !part.startsWith('__path='))
      .join('&');

    const finalQuery = [internalQuery, existingQueryStr].filter(Boolean).join('&');
    req.url = apiPrefixed + (finalQuery ? `?${finalQuery}` : '');
  }

  next();
});

// Safe Body Parser for both standard Node.js and Vercel Serverless Runtimes
// Prevents stream consumption hangs on Vercel where req.body is pre-parsed by the runtime
apiApp.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
});

// OAuth Callback handler for both /auth/callback and /api/auth/callback
apiApp.get(['/auth/callback', '/auth/callback/', '/api/auth/callback', '/api/auth/callback/'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getAuthCallbackHtml());
});

// Gemini AI Client helper
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Robust caller for Gemini API with multi-model failover, fast timeout, and retry on 503/429
async function callGeminiWithFailover(options: {
  prompt: string;
  responseMimeType?: string;
  temperature?: number;
  candidateModels?: string[];
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const ai = getAi();
  const models = options.candidateModels && options.candidateModels.length > 0
    ? options.candidateModels
    : ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash'];

  const timeoutMs = options.timeoutMs || 25000;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: options.prompt,
          config: {
            responseMimeType: (options.responseMimeType as any) || 'application/json',
            temperature: options.temperature ?? 0.2,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)), timeoutMs)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Timeout');

        if (isTransient && attempt < 2) {
          await sleep(250 * attempt);
        } else {
          break;
        }
      }
    }
  }

  return null;
}

// Dynamic domain-aware fallback academic handout generator
function generateFallbackAcademicHandout(params: {
  faculty: string;
  department: string;
  level: string;
  course: string;
  topic: string;
  searchQuery?: string;
  handoutOption?: string;
  additionalInstructions?: string;
  institutionContext?: string;
  institutionCategory?: string;
}) {
  const { faculty, department, level, course, topic, handoutOption, institutionCategory } = params;
  const cleanTopic = topic || params.searchQuery || 'Core Academic Principles & Applications';
  const cleanCourse = course || `${department || 'General'} Studies (${level})`;
  const codePrefix = cleanCourse.split(/[\s-:]/)[0]?.toUpperCase() || 'ACAD';
  const levelNum = level.replace(/[^0-9]/g, '') || '201';
  const courseCode = `${codePrefix} ${levelNum}`;
  const category = institutionCategory || 'University';

  const lowerDept = (department || '').toLowerCase();
  const lowerFac = (faculty || '').toLowerCase();
  const lowerTopic = cleanTopic.toLowerCase();

  const isTechOrCS = lowerDept.includes('computer') || lowerDept.includes('software') || lowerDept.includes('data') || lowerDept.includes('cyber') || lowerFac.includes('computing');
  const isEng = lowerDept.includes('engine') || lowerFac.includes('engine') || lowerTopic.includes('thermodynamic') || lowerTopic.includes('circuit');
  const isHealth = lowerDept.includes('nurs') || lowerDept.includes('medic') || lowerDept.includes('pharm') || lowerDept.includes('health') || lowerFac.includes('health');
  const isBizLaw = lowerDept.includes('law') || lowerDept.includes('account') || lowerDept.includes('econom') || lowerDept.includes('business') || lowerDept.includes('manage');

  let ch1Title = `Chapter 1: Theoretical Foundations, Axiomatic Principles & Governing Laws of ${cleanTopic}`;
  let ch1Content = `In the academic study of ${cleanTopic} within ${cleanCourse}, operational analysis begins with foundational principles, governing constraints, and formal theorems. Higher education curriculum standards at the ${level} stage require students to transition from descriptive awareness to quantitative synthesis, analytical modeling, and rigorous diagnostic evaluation. Understanding the core mechanism enables scholars to evaluate real-world edge cases, resolve system bottlenecks, and justify methodological choices in examinations.`;

  let formula1Name = 'Fundamental State Governing Equation';
  let formula1Expr = '\\Psi(x, t) = \\alpha \\cdot \\nabla^2 \\Phi(x, t) + \\beta \\left( \\frac{\\partial \\Phi}{\\partial t} \\right) + \\gamma_0';
  let formula1Params = '\\Psi = Output State Field, \\Phi = Input Potential, \\alpha, \\beta = Dynamic Coefficients, \\gamma_0 = Equilibrium Constant';
  let formula1App = `Determines baseline equilibrium and dynamic response rates in ${cleanTopic}.`;

  let calc1Title = `Calculation 1.1: Steady-State Parameter Determination`;
  let calc1Problem = `In an analytical test bench for ${cleanTopic}, input potential \\Phi_0 = 120.0\\,\\text{units}, coefficient \\alpha = 2.45\\,\\text{s}^{-1}, and equilibrium offset \\gamma_0 = 14.20\\,\\text{units}. Calculate the steady-state output response \\Psi_{\\text{steady}} when time derivative \\partial \\Phi / \\partial t = 0.`;
  let calc1Given = `\\Phi_0 = 120.0\\,\\text{units}, \\quad \\alpha = 2.45\\,\\text{s}^{-1}, \\quad \\gamma_0 = 14.20\\,\\text{units}, \\quad \\frac{\\partial \\Phi}{\\partial t} = 0`;
  let calc1Formula = `\\Psi_{\\text{steady}} = (\\alpha \\times \\Phi_0) + \\gamma_0`;
  let calc1Steps = [
    `Step 1: Verify steady-state condition where time-derivative \\frac{\\partial \\Phi}{\\partial t} = 0.`,
    `Step 2: Substitute given numerical parameters into the governing state equation: \\Psi = (2.45 \\times 120.0) + 14.20.`,
    `Step 3: Compute intermediate multiplication product: 2.45 \\times 120.0 = 294.00.`,
    `Step 4: Add the baseline offset parameter: 294.00 + 14.20 = 308.20\\,\\text{units}.`,
  ];
  let calc1Sol = `308.20 units (Steady-State Value)`;

  if (isTechOrCS) {
    ch1Title = `Chapter 1: Algorithmic Architecture, Complexity Models & Data Ingestion in ${cleanTopic}`;
    ch1Content = `The computational implementation of ${cleanTopic} inside ${cleanCourse} requires a strict balance between asymptotic time complexity, spatial memory bounds, and concurrency isolation. In university software engineering and computer science syllabi, students must evaluate cache locality, lock-free synchronization, and recursive state transitions to ensure scalability under peak throughput.`;
    formula1Name = 'Asymptotic Recurrence Time Complexity';
    formula1Expr = 'T(n) = a \\cdot T\\left(\\frac{n}{b}\\right) + \\mathcal{O}(n^d) \\implies T(n) = \\Theta(n^{\\log_b a}) \\quad (\\text{when } a > b^d)';
    formula1Params = 'n = Input Size, a = Sub-problem Count, b = Scale Factor, d = Merge Overhead';
    formula1App = 'Predicts runtime latency and computational scalability bounds.';
    calc1Title = `Calculation 1.1: Recurrence Execution Time Analysis`;
    calc1Problem = `An algorithmic module for ${cleanTopic} divides an input of n = 1024 into a = 2 subproblems of size n/2 with merge overhead \\mathcal{O}(n). Calculate the exact operation count when baseline base-case constant c_0 = 15 operations.`;
    calc1Given = `n = 1024 = 2^{10}, \\quad a = 2, \\quad b = 2, \\quad d = 1 \\implies a = b^d \\implies T(n) = \\mathcal{O}(n \\log_2 n)`;
    calc1Formula = `T(n) = c_0 \\cdot n \\log_2 n`;
    calc1Steps = [
      `Step 1: Compute binary logarithm: \\log_2(1024) = 10.`,
      `Step 2: Multiply input size by log term: 1024 \\times 10 = 10,240.`,
      `Step 3: Multiply by base operation constant: 15 \\times 10,240 = 153,600.`,
      `Step 4: Express final computational instruction cycles.`,
    ];
    calc1Sol = `153,600 Operations (O(n log n) Master Theorem Case 2)`;
  } else if (isHealth) {
    ch1Title = `Chapter 1: Clinical Pathophysiology, Pharmacological Mechanics & Diagnostic Protocols of ${cleanTopic}`;
    ch1Content = `Clinical mastery of ${cleanTopic} within ${cleanCourse} demands precise comprehension of physiological homeostasis, molecular reception kinetics, and evidence-based therapeutic interventions. Health science scholars must navigate differential diagnostics, dosage titration boundaries, and strict patient safety standards to deliver optimal clinical outcomes.`;
    formula1Name = 'Pharmacokinetic Loading Dose & Clearance Clearance';
    formula1Expr = 'D_{\\text{load}} = \\frac{C_{\\text{target}} \\times V_d}{F}, \\quad \\text{Clearance } (CL) = \\frac{\\text{Rate of Elimination}}{C_{\\text{plasma}}}';
    formula1Params = 'C_{target} = Target Concentration, V_d = Volume of Distribution, F = Bioavailability';
    formula1App = 'Calculates initial therapeutic dosage without exceeding toxic thresholds.';
    calc1Title = `Calculation 1.1: Clinical Dosage Titration & Clearance`;
    calc1Problem = `A patient requires therapeutic plasma concentration C_{target} = 15.0\\,\\mu\\text{g/mL} for ${cleanTopic} management. Volume of distribution V_d = 0.65\\,\\text{L/kg}, patient weight W = 70\\,\\text{kg}, and bioavailability F = 0.85 (85\\%). Calculate the required IV/Oral loading dose in milligrams.`;
    calc1Given = `C = 15.0\\,\\mu\\text{g/mL} = 15.0\\,\\text{mg/L}, \\quad V_d = 0.65 \\times 70 = 45.5\\,\\text{L}, \\quad F = 0.85`;
    calc1Formula = `D_{\\text{load}} = \\frac{C_{\\text{target}} \\times V_d}{F}`;
    calc1Steps = [
      `Step 1: Compute total volume of distribution: 0.65 \\times 70 = 45.5 L.`,
      `Step 2: Calculate target drug amount in systemic circulation: 15.0 mg/L \\times 45.5 L = 682.5 mg.`,
      `Step 3: Adjust for oral/IV bioavailability factor: 682.5 / 0.85 = 802.94 mg.`,
      `Step 4: Round to standard clinical dispensing unit (800 mg tablet/infusion).`,
    ];
    calc1Sol = `802.94 mg (Administer 800 mg Standard Single Dose)`;
  } else if (isBizLaw) {
    ch1Title = `Chapter 1: Statutory Frameworks, Institutional Precedents & Quantitative Analytics in ${cleanTopic}`;
    ch1Content = `In the advanced analysis of ${cleanTopic} for ${cleanCourse}, operations intersect statutory regulatory compliance, institutional governance, and quantitative financial modeling. Students must synthesize fiduciary standards, contractual obligations, and empirical risk valuations to structure defensible managerial decisions and legal arguments.`;
    formula1Name = 'Weighted Capital Cost & Net Present Valuation';
    formula1Expr = '\\text{NPV} = \\sum_{t=1}^{T} \\frac{CF_t}{(1 + r)^t} - C_0, \\quad \\text{WACC} = \\left(\\frac{E}{V}\\right) r_e + \\left(\\frac{D}{V}\\right) r_d (1 - T_c)';
    formula1Params = 'CF = Cash Flow, r = Discount Rate, C_0 = Initial Outlay, E/D = Equity/Debt Ratios';
    formula1App = 'Evaluates investment viability and risk-adjusted capital allocation.';
    calc1Title = `Calculation 1.1: Discounted Cash Flow & Valuation`;
    calc1Problem = `A corporate project related to ${cleanTopic} requires initial outlay C_0 = ₦5,000,000 and generates annual cash flows CF_1 = ₦2,200,000, CF_2 = ₦2,600,000, and CF_3 = ₦2,900,000 over 3 years with cost of capital r = 12% (0.12). Calculate the project Net Present Value (NPV).`;
    calc1Given = `C_0 = 5,000,000, \\quad CF_1 = 2,200,000, \\quad CF_2 = 2,600,000, \\quad CF_3 = 2,900,000, \\quad r = 0.12`;
    calc1Formula = `\\text{NPV} = \\frac{2200000}{1.12} + \\frac{2600000}{(1.12)^2} + \\frac{2900000}{(1.12)^3} - 5000000`;
    calc1Steps = [
      `Step 1: Discount Year 1 cash flow: 2,200,000 / 1.12 = 1,964,285.71.`,
      `Step 2: Discount Year 2 cash flow: 2,600,000 / 1.2544 = 2,072,704.08.`,
      `Step 3: Discount Year 3 cash flow: 2,900,000 / 1.404928 = 2,064,162.60.`,
      `Step 4: Sum discounted inflows: 1,964,285.71 + 2,072,704.08 + 2,064,162.60 = 6,101,152.39.`,
      `Step 5: Deduct initial capital outlay: 6,101,152.39 - 5,000,000 = +₦1,101,152.39.`,
    ];
    calc1Sol = `+₦1,101,152.39 (Positive NPV — Project Viable)`;
  }

  const baseHandout = {
    title: `${cleanTopic}: Comprehensive Academic Textbook & Course Treatise`,
    course: cleanCourse,
    courseCode,
    department: department || 'General Studies',
    faculty: faculty || 'Academics & Research',
    institutionCategory: category,
    level: level || '200 Level',
    topic: cleanTopic,
    targetAudienceLevel: `${category} Curriculum Standard (${level})`,
    totalPagesEstimate: 24,
    tableOfContents: [
      `Chapter 1: Foundational Axioms, Theoretical Principles & Governing Laws`,
      `Chapter 2: Structural Architecture, System Mechanics & Dynamics`,
      `Chapter 3: Step-by-Step Analytical Derivations & Quantitative Proofs`,
      `Chapter 4: Real-World Numerical Problem Solving & Multi-Stage Worked Scenarios`,
      `Chapter 5: Technical Schematics, Process Flow Architectures & State Models`,
      `Chapter 6: Practical Industrial Implementation, Experimental Standards & Case Studies`,
      `Chapter 7: Diagnostic Failure Modes, Error Propagation & Boundary Optimization`,
      `Chapter 8: Comprehensive Examination Mastery, Model Solutions & Marking Rubric`,
    ],
    learningObjectives: [
      `Master the core theoretical principles and governing axioms of ${cleanTopic}.`,
      `Derive and evaluate step-by-step mathematical, computational, or legal equations with exact boundary parameters.`,
      `Apply worked problem-solving algorithms to resolve multi-variable constraints without calculation errors.`,
      `Analyze schematic architectures, diagnostic failure modes, and industry best practices.`,
      `Synthesize authoritative answers for university degree examinations using official marking schemes.`,
    ],
    keyConcepts: [
      `Theoretical Axioms & First Principles of ${cleanTopic}`,
      `Dynamic State Transitions & Constraint Modeling`,
      `Boundary Equilibrium & Quantitative Proof Mechanics`,
      `Dimensional Normalization & Systematic Error Mitigation`,
      `Empirical Validation & Industrial Standards Compliance`,
    ],
    sections: [
      {
        chapterNumber: 1,
        pageNumber: 1,
        title: ch1Title,
        content: ch1Content,
        keyPoints: [
          `Primary governing relationships establish strict dependencies across input potentials and system state variables.`,
          `Conservation laws and boundary conditions dictate operating limits and prevent error propagation.`,
          `Dimensional homogeneity must be maintained across all intermediate calculations and unit conversions.`,
        ],
        formulas: [
          {
            name: formula1Name,
            expression: formula1Expr,
            parameters: formula1Params,
            application: formula1App,
          },
        ],
        calculations: [
          {
            title: calc1Title,
            problem: calc1Problem,
            given: calc1Given,
            formula: calc1Formula,
            steps: calc1Steps,
            solution: calc1Sol,
            units: 'Standard Academic Units',
          },
        ],
        examples: [
          {
            title: `Worked Example 1.1: Core Methodological Execution`,
            scenario: `An academic test scenario evaluates ${cleanTopic} parameters under fluctuating operating constraints. Students must normalize raw data and solve for the primary characteristic state.`,
            stepByStepSolution: [
              `Step 1: Extract all known input variables and normalize to standard SI units.`,
              `Step 2: Apply the primary governing relationship and isolate the target state variable.`,
              `Step 3: Validate output against theoretical stability boundaries.`,
            ],
            takeaway: `Always enforce dimensional consistency and verify boundary limits before interpreting output states.`,
          },
        ],
        diagram: {
          title: `System Architecture & Flow Dynamic Model for ${cleanTopic}`,
          type: 'photo_illustration' as const,
          description: `Tri-stage block schematic illustrating input ingestion, central state transformation, and closed-loop feedback stabilization.`,
          keyComponents: [
            `Signal / Data Ingestion Module`,
            `Transformation & Dynamic Processing Core`,
            `Negative Feedback Error Correction Loop`,
          ],
        },
        examPitfalls: [
          `Failing to state governing assumptions before writing algebraic expressions.`,
          `Confusing transient startup perturbations with steady-state equilibrium.`,
        ],
      },
      {
        chapterNumber: 2,
        pageNumber: 4,
        title: `Chapter 2: Structural Architecture, System Mechanics & Dynamics of ${cleanTopic}`,
        content: `The structural implementation of ${cleanTopic} relies on a hierarchical multi-tiered pipeline. Each tier performs discrete operations: acquisition, validation, transformation, and output synthesis. By isolating sub-processes into modular components, practitioners minimize error propagation and isolate bottleneck stages under high throughput conditions.`,
        keyPoints: [
          `Modular architecture prevents single-point failure cascades across the entire system.`,
          `Synchronous data pipelines maintain deterministic state transitions and predictable latency.`,
          `Buffer interfaces decouple high-throughput ingestion from rate-limited processing modules.`,
        ],
        formulas: [
          {
            name: `Pipeline Latency & Throughput Model`,
            expression: `T_{\\text{total}} = \\sum_{i=1}^{N} t_i + (N - 1) \\cdot \\tau_{\\text{overhead}}, \\quad \\text{Throughput} = \\frac{1}{\\max(t_i) + \\tau_{\\text{overhead}}}`,
            parameters: `T = End-to-End Latency, t_i = Stage Time, N = Total Stages, \\tau = Switching Overhead`,
            application: `Determines maximum throughput capacity for multi-stage processes in ${cleanTopic}.`,
          },
        ],
        calculations: [
          {
            title: `Calculation 2.1: Multi-Stage Pipelined Throughput & Latency Analysis`,
            problem: `A 4-stage processing pipeline for ${cleanTopic} operates with stage durations t_1 = 12\\,\\text{ms}, t_2 = 18\\,\\text{ms}, t_3 = 9\\,\\text{ms}, and t_4 = 15\\,\\text{ms}. Inter-stage overhead \\tau = 1.5\\,\\text{ms}. Calculate: (a) Single-item latency, (b) Pipelined throughput in items/second.`,
            given: `t_1=12\\,\\text{ms}, t_2=18\\,\\text{ms} (bottleneck), t_3=9\\,\\text{ms}, t_4=15\\,\\text{ms}, \\tau=1.5\\,\\text{ms}, N=4`,
            formula: `\\text{Latency} = \\sum t_i + (N-1)\\tau; \\quad \\text{Throughput} = \\frac{1}{\\max(t_i) + \\tau}`,
            steps: [
              `Step 1: Compute sum of stage execution times: 12 + 18 + 9 + 15 = 54 ms.`,
              `Step 2: Add overhead for 3 inter-stage transitions: 54 + (3 \\times 1.5) = 58.5 ms.`,
              `Step 3: Identify bottleneck stage: \\max(t_i) = t_2 = 18 ms.`,
              `Step 4: Compute pipelined clock cycle: 18 + 1.5 = 19.5 ms = 0.0195 s.`,
              `Step 5: Compute throughput: 1 / 0.0195 = 51.28 items/second.`,
            ],
            solution: `Latency = 58.5 ms | Throughput = 51.28 items/sec`,
            units: `Milliseconds & Items/Second`,
          },
        ],
        examples: [
          {
            title: `Worked Example 2.1: Bottleneck Resolution & Optimization`,
            scenario: `To increase system throughput from 51 items/sec to >80 items/sec, stage 2 (18 ms) is parallelized into two sub-stages of 9.5 ms each.`,
            stepByStepSolution: [
              `Step 1: The new slowest stage becomes stage 4 at 15 ms.`,
              `Step 2: New clock cycle T = 15 ms + 1.5 ms = 16.5 ms = 0.0165 s.`,
              `Step 3: New throughput = 1 / 0.0165 = 60.6 items/sec.`,
              `Step 4: Further optimizing stage 4 to 10 ms yields T = 11.5 ms -> 86.95 items/sec.`,
            ],
            takeaway: `Throughput in pipelined architectures is strictly constrained by the single slowest sub-stage.`,
          },
        ],
        diagram: {
          title: `Multi-Tier Synchronous Processing Schematic`,
          type: 'photo_illustration' as const,
          description: `Schematic showing synchronous 4-stage pipeline with inter-stage isolation buffers and master clock gating.`,
          keyComponents: [
            `Ingestion Stage & Signal Normalizer`,
            `Processing Core (Bottleneck Stage)`,
            `Format Transformation Subsystem`,
            `Final Output Emitter & FIFO Buffer`,
          ],
        },
        examPitfalls: [
          `Confusing single-item latency with steady-state system throughput.`,
          `Neglecting inter-stage buffer switching overhead when calculating clock timing.`,
        ],
      },
      {
        chapterNumber: 3,
        pageNumber: 7,
        title: `Chapter 3: Advanced Mathematical Derivations & Analytical Proofs of ${cleanTopic}`,
        content: `This chapter provides the formal analytical derivation governing dynamic response in ${cleanTopic}. University examiners frequently require students to reproduce this step-by-step proof in essay examinations to demonstrate mastery of first principles and boundary condition handling.`,
        keyPoints: [
          `First-order differential equation formulation from conservation of flux.`,
          `Application of integrating factors to resolve non-homogeneous boundary conditions.`,
          `Asymptotic convergence analysis proving system stability under infinite time horizon.`,
        ],
        formulas: [
          {
            name: `First-Order Differential Derivation Form`,
            expression: `\\frac{dy}{dt} + P(t)y = Q(t) \\implies y(t) = \\frac{1}{I(t)} \\int I(t) Q(t)\\,dt + \\frac{C}{I(t)} \\quad \\text{where } I(t) = e^{\\int P(t)\\,dt}`,
            parameters: `y(t) = System Response, P(t) = Dissipation Factor, Q(t) = Forcing Function, I(t) = Integrating Factor`,
            application: `Solves non-linear transient decay and forced response in ${cleanTopic}.`,
          },
        ],
        calculations: [
          {
            title: `Calculation 3.1: Complete Analytical Derivation with Initial Value Problem`,
            problem: `Derive the exact analytical solution for the dynamic system governed by \\frac{dy}{dt} + 2y = 4e^{-t}, subject to the initial condition y(0) = 5.`,
            given: `P(t) = 2, \\quad Q(t) = 4e^{-t}, \\quad y(0) = 5`,
            formula: `I(t) = e^{\\int 2\\,dt} = e^{2t}; \\quad y(t) = e^{-2t} \\int 4e^{-t} e^{2t}\\,dt + C e^{-2t}`,
            steps: [
              `Step 1: Compute Integrating Factor: I(t) = e^{\\int 2\\,dt} = e^{2t}.`,
              `Step 2: Multiply both sides by e^{2t}: e^{2t} \\frac{dy}{dt} + 2e^{2t}y = 4e^t.`,
              `Step 3: Recognize left side as product derivative: \\frac{d}{dt}[y \\cdot e^{2t}] = 4e^t.`,
              `Step 4: Integrate both sides with respect to t: y \\cdot e^{2t} = \\int 4e^t\\,dt = 4e^t + C.`,
              `Step 5: Divide by e^{2t} to solve for y(t): y(t) = 4e^{-t} + C e^{-2t}.`,
              `Step 6: Apply initial condition y(0) = 5: 5 = 4(1) + C(1) \\implies C = 1.`,
              `Step 7: Write final exact closed-form equation: y(t) = 4e^{-t} + e^{-2t}.`,
            ],
            solution: `y(t) = 4e^{-t} + e^{-2t}`,
            units: `Closed-form Analytical Solution`,
          },
        ],
        examples: [
          {
            title: `Worked Example 3.1: Transient Component Separation`,
            scenario: `In the solution y(t) = 4e^{-t} + e^{-2t}, evaluate the system response at t = 2.0 seconds.`,
            stepByStepSolution: [
              `Step 1: Evaluate e^{-2} \\approx 0.1353, and e^{-4} \\approx 0.0183.`,
              `Step 2: Multiply 4 \\times 0.1353 = 0.5412.`,
              `Step 3: Add the fast transient term: 0.5412 + 0.0183 = 0.5595 units.`,
            ],
            takeaway: `Transient exponential terms decay rapidly, leaving the dominant mode as time advances.`,
          },
        ],
        diagram: {
          title: `Analytical Transient Response Curve`,
          type: 'photo_illustration' as const,
          description: `Graph depicting exponential decay transitioning from fast initial transient mode into dominant steady curve.`,
          keyComponents: [
            `Initial State y(0) = 5.0`,
            `Fast Transient Zone (0 < t < 0.8s)`,
            `Asymptotic Zero Convergence Baseline`,
          ],
        },
        examPitfalls: [
          `Forgetting to evaluate the integration constant C using the initial condition y(0).`,
          `Incorrectly integrating e^t into e^(2t) during product integration.`,
        ],
      },
    ],
    masteryCalculations: [
      {
        title: `Comprehensive Master Problem: Multi-Stage Integrated System for ${cleanTopic}`,
        problem: `A high-grade ${cleanTopic} installation operates across a 24-hour cycle. Base demand is P_0 = 350\\,\\text{kW} with a peak factor of 1.45 during 4 peak hours. If primary conversion efficiency is \\eta_1 = 0.88 and transmission loss is 6.5%, calculate: (a) Peak raw input power required, (b) Daily total energy consumption in MWh.`,
        given: `P_0 = 350\\,\\text{kW}, \\quad \\text{Peak Factor} = 1.45, \\quad \\eta = 0.88, \\quad \\text{Loss} = 0.065 \\implies \\eta_{\\text{trans}} = 0.935`,
        formula: `P_{\\text{raw}} = \\frac{P_{\\text{delivered}}}{\\eta_{\\text{gen}} \\times \\eta_{\\text{trans}}}; \\quad E_{\\text{daily}} = (P_{\\text{base}} \\times 20\\,\\text{h}) + (P_{\\text{peak}} \\times 4\\,\\text{h})`,
        steps: [
          `Step 1: Calculate delivered peak power: 350 \\times 1.45 = 507.5 kW.`,
          `Step 2: Calculate combined efficiency: 0.88 \\times 0.935 = 0.8228 (82.28%).`,
          `Step 3: Calculate raw input power at peak: 507.5 / 0.8228 = 616.80 kW.`,
          `Step 4: Calculate raw input power at base: 350 / 0.8228 = 425.38 kW.`,
          `Step 5: Compute daily raw energy: (425.38 \\times 20) + (616.80 \\times 4) = 8507.6 + 2467.2 = 10,974.8 kWh.`,
          `Step 6: Convert to Megawatt-hours (MWh): 10,974.8 / 1000 = 10.975 MWh.`,
        ],
        solution: `Peak Raw Power = 616.80 kW | Daily Energy = 10.975 MWh`,
        units: `kW & MWh`,
      },
    ],
    quickFormulaSheet: [
      {
        name: `Primary Characteristic Relationship`,
        expression: `\\Psi(x, t) = \\alpha \\Phi(x, t) + \\gamma_0`,
        parameters: `\\alpha = Dynamic Slope, \\Phi = Input Potential, \\gamma_0 = Equilibrium Constant`,
        application: `Baseline state calculation and steady-state modeling.`,
      },
      {
        name: `Dynamic Transient Relaxation Time`,
        expression: `\\tau = \\frac{1}{\\alpha} \\implies t_{\\text{settling}} \\approx 4\\tau = \\frac{4}{\\alpha}`,
        parameters: `\\tau = Time Constant, \\alpha = Decay Parameter`,
        application: `Measures time required to reach 98% of steady state.`,
      },
      {
        name: `Operational Efficiency Metric`,
        expression: `\\eta = \\frac{P_{\\text{useful}}}{P_{\\text{total}}} \\times 100\\%`,
        parameters: `P = Power Flux`,
        application: `Benchmarking system performance against thermodynamic and computational maximums.`,
      },
    ],
    practicalApplications: [
      `Industrial automation and process optimization in accredited Nigerian and international facilities.`,
      `Quality assurance protocols, laboratory diagnostic baselines, and safety compliance audits.`,
      `Design and troubleshooting of multi-stage systems under variable operating conditions.`,
      `Academic research methodology, experimental validation, and quantitative paper publication.`,
    ],
    importantTerms: [
      {
        term: cleanTopic,
        definition: `The formalized academic domain and systematic framework governing theoretical, mathematical, and applied operations within ${cleanCourse}.`,
      },
      {
        term: `Steady-State Equilibrium`,
        definition: `The operating condition wherein all time-derivatives of system state variables approach zero, maintaining constant output under continuous input flux.`,
      },
      {
        term: `Boundary Conditions`,
        definition: `The spatial and temporal constraints imposed at the physical or mathematical limits of an operational system, dictating unique solutions to differential equations.`,
      },
      {
        term: `Dynamic Relaxation Time`,
        definition: `The characteristic temporal duration required for an exponential perturbation to decay to 1/e (approximately 36.8%) of its initial peak amplitude.`,
      },
    ],
    summary: `This comprehensive treatise has developed the core axioms, structural pipelines, mathematical proofs, and industrial implementations of ${cleanTopic}. Master students must synthesize these chapters to achieve exceptional performance in examinations, field work, and professional accreditation.`,
    possibleExamQuestions: [
      {
        question: `1. (15 Marks) Starting from fundamental conservation principles, derive the primary governing equation for ${cleanTopic} and prove that the steady-state value reduces to \\Psi_{\\text{steady}} = (\\alpha \\times \\Phi_0) + \\gamma_0. State all physical assumptions.`,
        type: 'essay' as const,
        marks: 15,
        answerGuide: `Step 1 (3 marks): Define conservation model. Step 2 (4 marks): Formulate first-order differential balance. Step 3 (5 marks): Apply integrating factor. Step 4 (3 marks): Enforce boundary limits and state equilibrium.`,
      },
      {
        question: `2. (10 Marks) A processing module for ${cleanTopic} exhibits bottleneck duration t = 18 ms with overhead \\tau = 1.5 ms. Calculate system throughput and explain two engineering interventions to double output capacity.`,
        type: 'short_answer' as const,
        marks: 10,
        answerGuide: `(a) Throughput calculation = 51.28 items/sec (5 marks). (b) Discussion of stage parallelization and buffer optimization (5 marks).`,
      },
    ],
    quickRevisionPoints: [
      `Always state governing conservation laws and boundary parameters before beginning algebraic derivations.`,
      `Pipelined system throughput is strictly bounded by the single slowest sub-stage.`,
      `Transient exponential perturbations decay according to e^{-t/\\tau}, settling completely within 4 to 5 time constants.`,
      `Dimensional homogeneity across SI units is mandatory for full marks in degree-level examinations.`,
    ],
    references: [
      {
        title: `Comprehensive Tertiary Handbook of ${cleanTopic}`,
        source: `Grobaax Academic Press & National Higher Education Council`,
        year: '2026',
      },
      {
        title: `Principles of ${cleanCourse}: A Rigorous Analytical Approach`,
        source: `University Academic Publishing Series`,
        year: '2025',
      },
    ],
  };

  return enrichHandoutWithFullChaptersAndImages(baseHandout, {
    topic: cleanTopic,
    department,
    faculty,
    level,
  });
}

// Dynamic topic-aware quiz questions generator
function generateTopicAwareQuestions(
  topic: string,
  count: number,
  difficulty: string = 'Medium',
  type: string = 'typed'
) {
  const lowerTopic = (topic || '').toLowerCase();
  let domainQuestions: Array<{ q: string; a: string; alts: string[] }> = [];

  if (lowerTopic.includes('math') || lowerTopic.includes('calculus') || lowerTopic.includes('algebra') || lowerTopic.includes('stat')) {
    domainQuestions = [
      {
        q: 'What is the derivative of sin(x) with respect to x in standard differential calculus?',
        a: 'cos(x)',
        alts: ['cos(x)', 'cosine(x)', 'cos x', '+cos(x)'],
      },
      {
        q: 'What is the value of the definite integral of 2x dx evaluated from x = 0 to x = 3?',
        a: '9',
        alts: ['9', '9.0', 'nine'],
      },
      {
        q: 'In linear algebra, what is the determinant of a 2x2 identity matrix?',
        a: '1',
        alts: ['1', '1.0', 'one', '+1'],
      },
      {
        q: 'What theorem states that if a function f is continuous on [a,b] and differentiable on (a,b), then there exists c in (a,b) where f\'(c) equals the average rate of change?',
        a: 'Mean Value Theorem',
        alts: ['Mean Value Theorem', 'MVT', 'Lagrange Mean Value Theorem'],
      },
      {
        q: 'In statistics, what term represents the square root of the variance of a data distribution?',
        a: 'Standard Deviation',
        alts: ['Standard Deviation', 'sigma', 'SD'],
      },
    ];
  } else if (lowerTopic.includes('computer') || lowerTopic.includes('programming') || lowerTopic.includes('code') || lowerTopic.includes('software') || lowerTopic.includes('algorithm')) {
    domainQuestions = [
      {
        q: 'What is the worst-case time complexity of standard Binary Search on a sorted array of n elements?',
        a: 'O(log n)',
        alts: ['O(log n)', 'O(logn)', 'logarithmic', 'Theta(log n)'],
      },
      {
        q: 'Which fundamental linear data structure strictly operates on a Last-In, First-Out (LIFO) principle?',
        a: 'Stack',
        alts: ['Stack', 'Stacks', 'LIFO Stack'],
      },
      {
        q: 'In relational database theory, what does the acronym ACID stand for in transaction processing?',
        a: 'Atomicity, Consistency, Isolation, Durability',
        alts: ['Atomicity Consistency Isolation Durability', 'Atomicity, Consistency, Isolation, Durability'],
      },
      {
        q: 'In internet networking, what standard transport-layer protocol provides reliable, ordered, and error-checked stream delivery?',
        a: 'TCP',
        alts: ['TCP', 'Transmission Control Protocol', 'TCP/IP'],
      },
      {
        q: 'What computational complexity class contains decision problems solvable by a deterministic Turing machine in polynomial time?',
        a: 'P',
        alts: ['P', 'Class P', 'Polynomial time'],
      },
    ];
  } else if (lowerTopic.includes('physic') || lowerTopic.includes('mechanic') || lowerTopic.includes('circuit') || lowerTopic.includes('electric') || lowerTopic.includes('thermo')) {
    domainQuestions = [
      {
        q: 'What is the SI unit of electrical resistance named after the German physicist who formulated the V = IR law?',
        a: 'Ohm',
        alts: ['Ohm', 'Ohms', 'Ω'],
      },
      {
        q: 'In classical mechanics, what physical quantity is defined as the rate of change of momentum with respect to time?',
        a: 'Force',
        alts: ['Force', 'Net Force', 'F'],
      },
      {
        q: 'What is the approximate speed of electromagnetic radiation in a vacuum to three significant figures in m/s?',
        a: '3.00 x 10^8 m/s',
        alts: ['3.00 x 10^8', '3 x 10^8 m/s', '300,000,000 m/s', '300000000', '3x10^8'],
      },
      {
        q: 'Which thermodynamic law states that the entropy of an isolated system never decreases over time?',
        a: 'Second Law of Thermodynamics',
        alts: ['Second Law of Thermodynamics', 'Second Law', '2nd Law of Thermodynamics'],
      },
      {
        q: 'Which fundamental conservation law states that energy can neither be created nor destroyed, only transformed from one form to another?',
        a: 'First Law of Thermodynamics',
        alts: ['First Law of Thermodynamics', 'Law of Conservation of Energy', 'Conservation of Energy', 'First Law'],
      },
    ];
  } else if (lowerTopic.includes('chem') || lowerTopic.includes('biology') || lowerTopic.includes('medicine') || lowerTopic.includes('anatomy') || lowerTopic.includes('cell')) {
    domainQuestions = [
      {
        q: 'Which cellular organelle is universally designated as the primary site of adenosine triphosphate (ATP) synthesis via oxidative phosphorylation?',
        a: 'Mitochondria',
        alts: ['Mitochondria', 'Mitochondrion', 'Chondriosome'],
      },
      {
        q: 'In organic chemistry, what is the IUPAC functional group classification of compounds containing a carbonyl group bonded between two carbon atoms?',
        a: 'Ketone',
        alts: ['Ketone', 'Ketones', 'Alkanone'],
      },
      {
        q: 'Which standard blood component is primarily responsible for the coagulation cascade and clot formation in human vasculature?',
        a: 'Platelets',
        alts: ['Platelets', 'Thrombocytes', 'Platelet', 'Thrombocyte'],
      },
      {
        q: 'In genetics, which enzyme is responsible for synthesizing complementary RNA strands along a template DNA strand during transcription?',
        a: 'RNA Polymerase',
        alts: ['RNA Polymerase', 'RNA pol', 'DNA-dependent RNA polymerase'],
      },
      {
        q: 'What is the general term for organic catalysts that accelerate biological chemical reactions without being consumed in the process?',
        a: 'Enzymes',
        alts: ['Enzymes', 'Enzyme', 'Biological catalysts'],
      },
    ];
  } else if (lowerTopic.includes('history') || lowerTopic.includes('africa') || lowerTopic.includes('governance') || lowerTopic.includes('political') || lowerTopic.includes('oau')) {
    domainQuestions = [
      {
        q: 'In what year was the Organization of African Unity (OAU) formally founded by sovereign African heads of state in Addis Ababa, Ethiopia?',
        a: '1963',
        alts: ['1963', '25 May 1963', 'May 1963'],
      },
      {
        q: 'Which treaty signed in 1991 laid the foundational framework for the establishment of the African Economic Community?',
        a: 'Abuja Treaty',
        alts: ['Abuja Treaty', 'Treaty of Abuja', '1991 Abuja Treaty'],
      },
      {
        q: 'Which pre-colonial West African empire flourished under Mansa Musa with its renowned scholarly and commercial hub centered in Timbuktu?',
        a: 'Mali Empire',
        alts: ['Mali Empire', 'Empire of Mali', 'Mali'],
      },
      {
        q: 'In what year did Nigeria officially adopt republican status and replace the British monarch as the ceremonial head of state?',
        a: '1963',
        alts: ['1963', '1 October 1963', 'October 1963'],
      },
    ];
  } else {
    domainQuestions = [
      {
        q: `In the academic study of ${topic}, what is the universally acknowledged foundational model or baseline axiom?`,
        a: 'Standard Axiomatic Framework',
        alts: ['Standard Framework', 'Axiomatic Framework', 'Core Benchmark', 'Standard Model'],
      },
      {
        q: `Which quantitative analytical method is commonly employed in ${topic} to measure statistical correlation and variance?`,
        a: 'Regression Analysis',
        alts: ['Regression Analysis', 'ANOVA', 'Linear Regression', 'Statistical Regression'],
      },
      {
        q: `What primary empirical mechanism is utilized to validate hypotheses under controlled operational conditions in ${topic}?`,
        a: 'Controlled Empirical Experimentation',
        alts: ['Empirical Experimentation', 'Controlled Experiment', 'Scientific Method', 'Hypothesis Testing'],
      },
      {
        q: `In higher academic curricula for ${topic}, what term denotes the boundary conditions within which a theoretical formula remains mathematically valid?`,
        a: 'Domain of Validity',
        alts: ['Domain of Validity', 'Boundary Conditions', 'Operational Domain', 'Validity Range'],
      },
    ];
  }

  const safeCount = Math.min(Math.max(1, count || 3), 10);
  const questions = [];

  for (let i = 0; i < safeCount; i++) {
    const item = domainQuestions[i % domainQuestions.length];
    questions.push({
      question: item.q,
      topic: topic || 'Academic Studies',
      correctAnswer: item.a,
      acceptedAnswers: item.alts,
      type: type === 'multiple_choice' ? 'multiple_choice' : 'typed',
      options: type === 'multiple_choice' ? [item.a, 'Alternative Concept Alpha', 'Secondary Model Beta', 'Null Empirical Standard'] : [],
      durationSeconds: 30,
      mark: 1,
      difficulty: difficulty || 'Medium',
    });
  }

  return questions;
}

// ------------------- API ROUTES -------------------

// Health check endpoints (supports /api/health, /health, and root /api)
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Grobaax Unified API',
    endpoints: [
      '/api/health',
      '/api/vtu',
      '/api/minimart',
      '/api/paystack',
      '/api/library',
      '/api/campus',
      '/api/library/generate',
      '/api/league/generate-questions',
    ],
  });
};

apiApp.get('/api/health', healthHandler);
apiApp.get('/health', healthHandler);
apiApp.get('/api', healthHandler);

// Mount Sub-Routers with both /api/* and direct /* prefixes to guarantee zero 404s in any environment
apiApp.use('/api/vtu', vtuRouter);
apiApp.use('/vtu', vtuRouter);

apiApp.use('/api/minimart', minimartRouter);
apiApp.use('/minimart', minimartRouter);

apiApp.use('/api/paystack', paystackRouter);
apiApp.use('/paystack', paystackRouter);

apiApp.use('/api/library', libraryRouter);
apiApp.use('/library', libraryRouter);

apiApp.use('/api/campus', campusRouter);
apiApp.use('/campus', campusRouter);

apiApp.use('/api/wallet', walletRouter);
apiApp.use('/wallet', walletRouter);

// AI Academic Library Handout Generation Route
const libraryGenerateHandler = async (req: Request, res: Response) => {
  const {
    faculty,
    department,
    level,
    course,
    topic,
    searchQuery,
    institutionCategory = 'University',
    handoutOption = 'standard_handout',
    additionalInstructions = '',
    institutionContext = '',
  } = req.body || {};

  const effectiveTopic = topic || searchQuery || 'Academic Principles';
  const effectiveCourse = course || `${department || 'General'} Studies`;
  const effectiveLevel = level || '200 Level';
  const effectiveDept = department || 'General Studies';
  const effectiveFaculty = faculty || 'Sciences & Technology';
  const effectiveCategory = institutionCategory || 'University';

  console.log(`[AI Library] Request real-time academic generation for: "${effectiveTopic}" | ${effectiveCourse} | ${effectiveLevel} | Category: ${effectiveCategory}`);

  const institutionCategoryProfile = {
    University: 'University Higher Academic Degree Level (B.Sc, B.Eng, MBBS, LL.B, M.Sc, PhD). Emphasize theoretical rigor, mathematical proofs, experimental validation, and research methodology.',
    Polytechnic: 'Polytechnic & Monotechnic Applied Technology Standard (ND/HND). Emphasize practical engineering calculations, laboratory testing procedures, workshop machinery operations, industrial drafting, and technical implementations.',
    'College of Education': 'College of Education Teacher Pedagogy Standard (NCE / B.Ed). Emphasize teaching methodologies, instructional media design, behavioral objectives (Bloom Taxonomy), classroom dynamics, test construction, and student evaluation.',
    'College of Health & Nursing': 'College of Health Technology, Nursing & Midwifery Clinical Standard. Emphasize standing clinical orders, patient care plans, pharmacology/dosage arithmetic, triage algorithms, and laboratory diagnostic protocols.',
    'Specialized Institute': 'Specialized Academy & Monotechnic Standard (Maritime, Aviation, Petroleum, Agriculture). Emphasize industry regulatory compliance (IMO/SOLAS, ICAO, DPR/NNPC), operational safety, machinery maintenance, and applied nautical/aeronautical/petroleum calculations.',
  }[effectiveCategory] || 'Tertiary Education Academic Standard';

  const optionStyleGuide = {
    short_notes: 'Generate concise, high-yield revision notes with precise definitions, exact formulas, bullet points, and core exam memory anchors.',
    standard_handout: 'Generate a balanced, comprehensive academic handout with 4 to 6 detailed conceptual modules, real-world case applications, worked examples, formulas, glossary, and exam guides.',
    detailed_handout: 'Generate an exhaustive, deep-dive academic treatise covering theoretical proofs, derivations, boundary conditions, extensive step-by-step worked examples, case studies, and advanced examination questions with detailed marking rubrics.',
    exam_revision: 'Generate an exam-centric mastery handout focused on probable test questions, detailed model answers and marking schemes, formula cheat-sheets, common student pitfalls, and quick-memory mnemonics.',
  }[handoutOption] || 'Generate a comprehensive, high-quality academic handout.';

  const prompt = `You are a Distinguished University Professor, Lead Textbook Author, and Dean of Academic Curricula.
Synthesize an AUTHENTIC, EXHAUSTIVE, MULTI-CHAPTER ACADEMIC TEXTBOOK & HANDOUT for students in the ${effectiveCategory} tertiary education system for the exact topic: "${effectiveTopic}".

CRITICAL REQUIREMENTS & PEDAGOGICAL RIGOR:
1. STRAIGHT TO THE POINT WITH FULL DETAILS & DEFINITIONS:
   - Provide the exact, authoritative academic definition of "${effectiveTopic}" immediately, outlining all governing principles, standard scientific/legal/economic nomenclature, and theoretical boundaries.
   - Explain everything involving this topic comprehensively, leaving no ambiguity. Break down every sub-concept, mechanism, and process with exhaustive clarity.
2. FULL COMPLETE MULTI-CHAPTER HANDOUT:
   - The "sections" array MUST contain multiple complete chapters (Chapter 1 through Chapter 8). DO NOT truncate or summarize chapters into short paragraphs.
   - Each chapter must provide rigorous, thorough academic text (at least 3-4 substantive paragraphs per chapter).
3. DOMAIN-ACCURATE FORMULAS & WORKED QUANTITATIVE CALCULATIONS:
   - Real mathematical equations in LaTeX (with all variable parameters defined and SI units specified).
   - Concrete step-by-step calculations with realistic numbers, full arithmetic substitutions, and boxed final answers.
4. TOPIC-MATCHING VISUAL DIAGRAMS & FIGURES:
   - Every chapter must specify a diagram object that DIRECTLY and SPECIFICALLY describes "${effectiveTopic}".
5. EXAMINATION MASTERY:
   - University-grade past exam questions with explicit mark allocations and complete step-by-step marking rubrics.
6. Output STRICT, VALID JSON ONLY.

ACADEMIC CONTEXT:
- Category: ${effectiveCategory} (${institutionCategoryProfile})
- Faculty: ${effectiveFaculty} | Department: ${effectiveDept} | Level: ${effectiveLevel}
- Course: ${effectiveCourse} | Topic: ${effectiveTopic}
- Style: ${handoutOption} (${optionStyleGuide})
${institutionContext ? `- Institutional Context: ${institutionContext}` : ''}
${additionalInstructions ? `- Directives: ${additionalInstructions}` : ''}

Ensure all JSON strings are properly escaped. Output raw valid JSON only.`;

  const rawResult = await callGeminiWithFailover({
    prompt,
    responseMimeType: 'application/json',
    temperature: 0.2,
  });

  if (rawResult) {
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(rawResult);
      } catch {
        const cleaned = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      const enrichedData = enrichHandoutWithFullChaptersAndImages(parsedData, {
        topic: effectiveTopic,
        department: effectiveDept,
        faculty: effectiveFaculty,
        level: effectiveLevel,
      });

      return res.json({
        success: true,
        source: 'gemini-ai',
        data: enrichedData,
      });
    } catch (parseErr) {
      console.warn('[AI Library] JSON parse fallback:', parseErr);
    }
  }

  console.log('[AI Library] Using fallback academic synthesis engine.');
  const fallback = generateFallbackAcademicHandout({
    faculty: effectiveFaculty,
    department: effectiveDept,
    level: effectiveLevel,
    course: effectiveCourse,
    topic: effectiveTopic,
    searchQuery,
    handoutOption,
    additionalInstructions,
    institutionContext,
  });

  return res.json({
    success: true,
    source: 'academic-fallback',
    data: fallback,
  });
};

apiApp.post('/api/library/generate', libraryGenerateHandler);
apiApp.post('/library/generate', libraryGenerateHandler);

// AI League Questions Generator Route
const leagueQuestionsHandler = async (req: Request, res: Response) => {
  const {
    topic = 'General Academic Studies',
    category = 'All Categories',
    count = 3,
    difficulty = 'Medium',
    type = 'typed',
    targetFixtureDayTitle = '',
  } = req.body || {};

  const safeCount = Math.min(Math.max(1, Number(count) || 3), 10);
  console.log(`[AI League] Generating ${safeCount} questions for topic: "${topic}" | category: ${category} | difficulty: ${difficulty}`);

  const prompt = `You are a Chief Academic Examiner for the Higher Institution Academic League competition.
Generate ${safeCount} highly accurate, unambiguous, objective, academic quiz competition question(s) suitable for university and tertiary students.

CONTEXT:
- Topic / Subject: ${topic}
- Competition Category: ${category}
- Difficulty Level: ${difficulty}
- Target Question Format: ${type === 'typed' ? 'Short typed answer' : 'Multiple choice with 4 distinct options'}
${targetFixtureDayTitle ? `- Fixture Day Context: ${targetFixtureDayTitle}` : ''}

REQUIREMENTS:
1. Each question must be clear, academically sound, factual, and strictly objective.
2. For typed answers: Provide a concise "correctAnswer" (1-4 words) AND 2-4 acceptable alternative variations in "acceptedAnswers".
3. Set durationSeconds to 30 and mark to 1.
4. Output a STRICT JSON array of objects conforming to schema.

[
  {
    "question": string,
    "topic": string,
    "correctAnswer": string,
    "acceptedAnswers": string[],
    "type": "typed" | "multiple_choice",
    "options": string[],
    "durationSeconds": number,
    "mark": number,
    "difficulty": "Easy" | "Medium" | "Hard"
  }
]`;

  const rawResult = await callGeminiWithFailover({
    prompt,
    responseMimeType: 'application/json',
    temperature: 0.3,
  });

  if (rawResult) {
    try {
      let parsed;
      try {
        parsed = JSON.parse(rawResult);
      } catch {
        const cleaned = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      return res.json({
        success: true,
        source: 'gemini-ai',
        questions: parsed,
      });
    } catch (parseErr) {
      console.warn('[AI League] JSON parse fallback for questions:', parseErr);
    }
  }

  const fallbackList = generateTopicAwareQuestions(topic, safeCount, difficulty, type);
  return res.json({
    success: true,
    source: 'academic-fallback',
    questions: fallbackList,
  });
};

apiApp.post('/api/league/generate-questions', leagueQuestionsHandler);
apiApp.post('/league/generate-questions', leagueQuestionsHandler);

// 404 Handler for API routes
apiApp.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API route not found',
    requestedUrl: req.url,
    originalUrl: req.originalUrl,
    method: req.method,
  });
});

// Global Error Handler for API
apiApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal server error',
  });
});
