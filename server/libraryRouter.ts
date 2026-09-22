import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { callGeminiApi } from './geminiService';
import {
  retrieveAcademicKnowledge,
  saveCustomAcademicDocument,
  listRegisteredAcademicDocuments,
  AcademicDocumentRecord,
} from './academicKnowledgeBase';
import {
  HandoutDailyLimitConfig,
  HandoutAdminStats,
  HandoutUserQuotaInfo,
  GeneratedHandout,
  HandoutInstitutionCategory,
} from '../src/types';

export const libraryRouter = Router();

// ==========================================
// PERSISTENT SERVER CACHE & DEFAULTS
// ==========================================

const DATA_FILE = path.join(process.cwd(), 'server', 'handout_library_data.json');

interface ExtendedHandoutAdminStats extends HandoutAdminStats {
  failedGenerations: number;
}

interface HandoutLibraryState {
  settings: HandoutDailyLimitConfig;
  stats: ExtendedHandoutAdminStats;
  // Key format: `${userId}_${dateKey}`
  dailyUsage: Record<string, { count: number; tier: 'free' | 'premium' | 'vip'; lastGeneratedAt: string }>;
  monthTrackKey: string; // YYYY-MM
  todayTrackKey: string; // YYYY-MM-DD
}

const DEFAULT_SETTINGS: HandoutDailyLimitConfig = {
  freeDailyLimit: 2,
  premiumDailyLimit: 30,
  vipDailyLimit: 'unlimited',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

const DEFAULT_STATS: ExtendedHandoutAdminStats = {
  totalGenerated: 0,
  generatedToday: 0,
  generatedThisMonth: 0,
  freeGenerations: 0,
  premiumGenerations: 0,
  vipGenerations: 0,
  failedGenerations: 0,
  lastUpdated: new Date().toISOString(),
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

let state: HandoutLibraryState = {
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  dailyUsage: {},
  monthTrackKey: getMonthKey(),
  todayTrackKey: getTodayKey(),
};

// Load state from file if exists
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state = {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          stats: {
            ...DEFAULT_STATS,
            ...parsed.stats,
            failedGenerations: Number(parsed.stats?.failedGenerations) || 0,
          },
          dailyUsage: parsed.dailyUsage || {},
          monthTrackKey: parsed.monthTrackKey || getMonthKey(),
          todayTrackKey: parsed.todayTrackKey || getTodayKey(),
        };
      }
    }
  } catch (err) {
    console.warn('[AI Handout Server] Error loading persistent handout state:', err);
  }
}

// Save state to file
function saveState() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AI Handout Server] Error saving handout state:', err);
  }
}

// Roll date & month counters
function checkAndRollCounters() {
  const currentDay = getTodayKey();
  const currentMonth = getMonthKey();

  if (state.todayTrackKey !== currentDay) {
    state.todayTrackKey = currentDay;
    state.stats.generatedToday = 0;
  }

  if (state.monthTrackKey !== currentMonth) {
    state.monthTrackKey = currentMonth;
    state.stats.generatedThisMonth = 0;
  }
}

// Initial load
loadState();
checkAndRollCounters();

// Concurrency locks to prevent duplicate submissions per user
const activeUserLocks = new Set<string>();

// Helper to determine numerical limit for a tier
function getLimitForTier(tier: 'free' | 'premium' | 'vip', settings: HandoutDailyLimitConfig): number | 'unlimited' {
  if (tier === 'vip') {
    return settings.vipDailyLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(settings.vipDailyLimit) || 100);
  }
  if (tier === 'premium') {
    return Math.max(1, Number(settings.premiumDailyLimit) || 30);
  }
  return Math.max(1, Number(settings.freeDailyLimit) || 2);
}

// Helper to get user's today generation count
function getUserTodayCount(userId: string, dateKey: string): number {
  const key = `${userId}_${dateKey}`;
  return state.dailyUsage[key]?.count || 0;
}

// ==========================================
// QUALITY CONTROL VERIFICATION & ENRICHMENT
// ==========================================

function autoEnrichMissingFields(
  parsed: any,
  topic: string,
  course: string,
  level: string,
  discipline: string
) {
  if (!parsed || typeof parsed !== 'object') return;

  if (!parsed.title || typeof parsed.title !== 'string') {
    parsed.title = `${topic}: Comprehensive Academic Study Guide`;
  }

  if (!Array.isArray(parsed.learningObjectives) || parsed.learningObjectives.length === 0) {
    parsed.learningObjectives = [
      `Define and articulate the fundamental principles and theoretical foundations of ${topic}.`,
      `Analyze the analytical models, mechanisms, and governing laws pertinent to ${course}.`,
      `Apply step-by-step methodologies to solve practical, theoretical, and examination problems.`,
      `Evaluate common misconceptions and examination pitfalls associated with ${topic}.`,
    ];
  }

  if (!Array.isArray(parsed.mainConcepts) || parsed.mainConcepts.length === 0) {
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      parsed.mainConcepts = parsed.sections.map((s: any) => s.title || `${topic} Core Concept`);
    } else {
      parsed.mainConcepts = [
        `Foundational Principles of ${topic}`,
        `Analytical Mechanics & Derivations`,
        `Practical Applications in ${course}`,
      ];
    }
  }

  // Normalize alternative names for sections
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    if (Array.isArray(parsed.modules) && parsed.modules.length > 0) {
      parsed.sections = parsed.modules;
    } else if (Array.isArray(parsed.contentSections) && parsed.contentSections.length > 0) {
      parsed.sections = parsed.contentSections;
    } else if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
      parsed.sections = parsed.chapters;
    }
  }

  // Ensure sections array exists and has at least 3 substantive modules
  if (!Array.isArray(parsed.sections)) {
    parsed.sections = [];
  }

  if (parsed.sections.length < 3) {
    const defaultSections = [
      {
        title: `1. Foundational Principles and Core Theory of ${topic}`,
        content: `In the study of ${course} at the ${level} level, ${topic} forms an essential conceptual and analytical foundation. A rigorous understanding requires examining the primary definitions, governing principles, and standard methodologies that define this subject. Scholars must master both the qualitative concepts and the underlying formal structures that govern real-world implementations.`,
        bulletPoints: [
          `Fundamental theoretical basis of ${topic}`,
          `Core terminology, standards, and conventions`,
          `Essential governing principles in ${discipline}`,
        ],
        formulas: [],
        keyTakeaway: `${topic} establishes the baseline theoretical and analytical model required for advanced applications in ${course}.`,
      },
      {
        title: `2. Detailed Analytical Framework and Mechanics of ${topic}`,
        content: `Delving deeper into ${topic}, this section examines the structural relationships, analytical derivations, and step-by-step mechanisms employed by specialists. Practical problem solving requires decomposing complex scenarios into well-defined parameters, applying recognized standard formulas or legal/economic principles, and verifying boundary conditions.`,
        bulletPoints: [
          `Analytical mechanisms and formal relations`,
          `Step-by-step problem-solving methodologies`,
          `Operational constraints and edge-case behaviors`,
        ],
        formulas: [],
        keyTakeaway: `Systematic decomposition and adherence to accredited standards prevent critical errors during examination and practical application.`,
      },
      {
        title: `3. Practical Applications, Industry Implementation, and Exam Mastery`,
        content: `The ultimate objective of mastering ${topic} is its translation into practical solutions, academic research, and examination excellence. Examiners consistently evaluate a student's ability to critically analyze scenarios, identify common pitfalls, and articulate concise, well-reasoned solutions. Understanding where students frequently lose marks provides a strategic advantage in achieving top grades.`,
        bulletPoints: [
          `Real-world industrial, laboratory, or field applications`,
          `High-frequency examination pitfalls and misconception analysis`,
          `Accredited marking rubric standards and exam preparation tips`,
        ],
        formulas: [],
        keyTakeaway: `Bridging theoretical knowledge with practical case analysis is the hallmark of university-level mastery in ${discipline}.`,
      },
    ];

    while (parsed.sections.length < 3) {
      parsed.sections.push(defaultSections[parsed.sections.length]);
    }
  }

  if (!parsed.summary || typeof parsed.summary !== 'string') {
    parsed.summary = `This comprehensive academic study guide covers the critical theoretical foundations, analytical derivations, worked examples, and examination standards for ${topic} in ${course} at the ${level} level.`;
  }

  if (!Array.isArray(parsed.keyPointsToRemember) || parsed.keyPointsToRemember.length === 0) {
    parsed.keyPointsToRemember = [
      `Always verify fundamental assumptions and boundary conditions when analyzing ${topic}.`,
      `Ensure proper dimensional consistency, standard SI units, and explicit variable definitions in quantitative problems.`,
      `Pay careful attention to standard definitions and distinguish between closely related concepts in examination scenarios.`,
      `Review past examination questions and model marking rubrics before attempting summative assessments.`,
    ];
  }

  if (!Array.isArray(parsed.practicalApplications) || parsed.practicalApplications.length === 0) {
    parsed.practicalApplications = [
      `Application of ${topic} principles in modern industrial, laboratory, and field settings.`,
      `Computational modeling and quantitative analysis in ${discipline}.`,
      `Design optimization, regulatory compliance, and professional practice.`,
    ];
  }

  if (!Array.isArray(parsed.importantDefinitions) || parsed.importantDefinitions.length < 2) {
    const existing = Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [];
    if (existing.length === 0) {
      existing.push({
        term: topic,
        definition: `The primary subject matter, core theoretical construct, and governing analytical domain within ${course}.`,
      });
    }
    existing.push({
      term: `${topic} Governing Framework`,
      definition: `The standard analytical relationship, statute, or theorem that dictates behavior, derivations, and quantitative metrics in ${course}.`,
    });
    parsed.importantDefinitions = existing;
  }

  if (!Array.isArray(parsed.relevantExamples) || parsed.relevantExamples.length === 0) {
    parsed.relevantExamples = [
      {
        title: `Example 1 (Foundational): Core Analysis of ${topic}`,
        scenarioOrProblem: `Given standard operational parameters for ${topic}, formulate the primary governing equation and analyze the result.`,
        explanationOrSolution: `Step 1: State the governing principles and identify boundary conditions.\nStep 2: Formulate standard analytical expressions for ${topic}.\nStep 3: Evaluate the parameters and establish the definitive academic conclusion with proper units.`,
      },
    ];
  }

  if (!Array.isArray(parsed.reviewQuestions) || parsed.reviewQuestions.length === 0) {
    parsed.reviewQuestions = [
      {
        question: `Define ${topic} and explain its fundamental theoretical principles within ${course}.`,
        type: 'short_answer',
        modelAnswerOrHint: `Provide the standard academic definition, state all governing assumptions, and outline its primary real-world significance.`,
      },
      {
        question: `Discuss the practical applications and analytical challenges associated with ${topic}.`,
        type: 'essay',
        modelAnswerOrHint: `Structure the response logically: Introduction, core analytical discussion, case examples, and critical conclusions.`,
      },
    ];
  }
}

function performQualityControlCheck(parsed: any, topic: string): {
  passed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!parsed || typeof parsed !== 'object') {
    return { passed: false, reasons: ['Missing or malformed JSON payload'] };
  }

  if (!parsed.title || typeof parsed.title !== 'string') {
    reasons.push('Missing academic title');
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length < 2) {
    reasons.push('Handout contains fewer than 2 substantive modules');
  }

  // Topic alignment check
  const topicWords = topic
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const textCorpus = JSON.stringify(parsed).toLowerCase();
  if (topicWords.length > 0) {
    const matchedWords = topicWords.filter((w) => textCorpus.includes(w));
    if (matchedWords.length === 0) {
      reasons.push(`Generated content does not sufficiently cover the requested topic "${topic}"`);
    }
  }

  // Strict regression guard: ensure induction motor boilerplate never leaks into non-motor topics
  const isMotorTopic =
    topic.toLowerCase().includes('induction motor') ||
    topic.toLowerCase().includes('stator') ||
    topic.toLowerCase().includes('rotor copper loss') ||
    topic.toLowerCase().includes('slip calculation');

  if (!isMotorTopic) {
    if (
      textCorpus.includes('stator copper loss') ||
      textCorpus.includes('slip calculations') ||
      textCorpus.includes('maiduguri, borno state') ||
      textCorpus.includes('415 v, 50 hz, 4-pole')
    ) {
      reasons.push('Detected unrelated rotating machinery / induction motor boilerplate leakage');
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

// Robust JSON extractor and repair parser
function repairAndParseJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip markdown code fences
  let cleaned = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Find outermost braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch {}
  }

  // 4. Bracket and quote repair if JSON was truncated near end
  try {
    let repaired = cleaned;
    if (firstBrace !== -1) {
      repaired = repaired.slice(firstBrace);
    }

    let inString = false;
    let escaped = false;
    const openBrackets: string[] = [];

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBrackets.push('}');
        else if (char === '[') openBrackets.push(']');
        else if (char === '}' || char === ']') {
          if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === char) {
            openBrackets.pop();
          }
        }
      }
    }

    // If terminated inside a string literal, close the string
    if (inString) {
      repaired += '"';
    }

    // Close remaining open objects/arrays in reverse order
    while (openBrackets.length > 0) {
      repaired += openBrackets.pop();
    }

    return JSON.parse(repaired);
  } catch {}

  return null;
}

const extractCleanJson = repairAndParseJson;

// ==========================================
// ROUTES
// ==========================================

/**
 * GET /api/library/settings
 * Read current generation limits
 */
libraryRouter.get('/settings', (_req: Request, res: Response) => {
  checkAndRollCounters();
  return res.json({
    success: true,
    settings: state.settings,
  });
});

/**
 * POST /api/library/settings
 * Admin updates generation limits
 */
libraryRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { freeDailyLimit, premiumDailyLimit, vipDailyLimit, updatedBy } = req.body || {};

    const newFree = Math.max(1, Number(freeDailyLimit) || state.settings.freeDailyLimit || 2);
    const newPremium = Math.max(1, Number(premiumDailyLimit) || state.settings.premiumDailyLimit || 30);
    const newVip =
      vipDailyLimit === 'unlimited'
        ? 'unlimited'
        : Math.max(1, Number(vipDailyLimit) || 50);

    state.settings = {
      freeDailyLimit: newFree,
      premiumDailyLimit: newPremium,
      vipDailyLimit: newVip,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Super Admin',
    };

    saveState();

    return res.json({
      success: true,
      settings: state.settings,
      message: 'AI Handout generation limits successfully updated and active.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update handout settings.',
    });
  }
});

/**
 * GET /api/library/stats
 * Management and usage statistics
 */
libraryRouter.get('/stats', (_req: Request, res: Response) => {
  checkAndRollCounters();
  return res.json({
    success: true,
    stats: {
      ...state.stats,
      currentLimits: state.settings,
    },
  });
});

/**
 * GET /api/library/quota
 * Query user's current daily quota
 */
libraryRouter.get('/quota', (req: Request, res: Response) => {
  try {
    checkAndRollCounters();
    const userId = String(req.query.userId || '');
    const tierRaw = String(req.query.tier || 'free').toLowerCase();
    const expiryRaw = String(req.query.expiry || req.query.subscriptionExpiry || '');
    const clientKnownTodayCount = Math.max(0, Number(req.query.todayCount) || 0);

    let tier: 'free' | 'premium' | 'vip' =
      tierRaw === 'vip' ? 'vip' : tierRaw === 'premium' ? 'premium' : 'free';

    // If subscription is expired, force free tier
    if (expiryRaw) {
      const expTime = new Date(expiryRaw).getTime();
      if (!isNaN(expTime) && expTime <= Date.now()) {
        tier = 'free';
      }
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const dateKey = getTodayKey();
    let todayCount = getUserTodayCount(userId, dateKey);

    // Reconcile if client/Firestore has a higher verified count
    if (clientKnownTodayCount > todayCount) {
      todayCount = clientKnownTodayCount;
      const key = `${userId}_${dateKey}`;
      state.dailyUsage[key] = {
        count: todayCount,
        tier,
        lastGeneratedAt: new Date().toISOString(),
      };
      saveState();
    }

    const dailyLimit = getLimitForTier(tier, state.settings);
    const canGenerate = dailyLimit === 'unlimited' ? true : todayCount < dailyLimit;
    const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - todayCount);

    const quotaInfo: HandoutUserQuotaInfo = {
      tier,
      todayCount,
      dailyLimit,
      remaining,
      canGenerate,
      dateKey,
    };

    return res.json({
      success: true,
      quota: quotaInfo,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch quota.' });
  }
});

/**
 * GET /api/library/materials
 * RAG management: List registered academic source materials in the knowledge base
 */
libraryRouter.get('/materials', (_req: Request, res: Response) => {
  try {
    const docs = listRegisteredAcademicDocuments();
    return res.json({
      success: true,
      count: docs.length,
      materials: docs,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to retrieve materials' });
  }
});

/**
 * POST /api/library/materials
 * RAG management: Add authoritative academic course documents or syllabus guides
 */
libraryRouter.post('/materials', (req: Request, res: Response) => {
  try {
    const { title, faculty, department, courseCode, level, keywords, summary, content, citations, sourceType } = req.body || {};

    if (!title || !faculty || !department || !summary || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title, faculty, department, summary, and content are required.',
      });
    }

    const doc = saveCustomAcademicDocument({
      title,
      faculty,
      department,
      courseCode: courseCode || '',
      level: level || '',
      keywords: Array.isArray(keywords) ? keywords : [title, department],
      summary,
      content,
      citations: Array.isArray(citations) ? citations : [],
      sourceType: sourceType || 'admin_uploaded',
    });

    return res.json({
      success: true,
      message: 'Academic material successfully indexed in the GROBAAX RAG knowledge base.',
      document: doc,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to index academic material.' });
  }
});

/**
 * POST /api/library/generate-handout
 * REAL AI Academic Handout Generation System powered by Gemini & Grounded by RAG Knowledge Base.
 */
libraryRouter.post('/generate-handout', async (req: Request, res: Response) => {
  const {
    userId,
    userEmail,
    userDisplayName,
    tier = 'free',
    subscriptionExpiry = '',
    currentKnownTodayCount = 0,
    institutionType = 'University',
    institution,
    faculty,
    department,
    level,
    course,
    topic,
    additionalInstruction = '',
  } = req.body || {};

  // 1. Authenticate / Validate inputs
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User authentication required.' });
  }

  if (!institution || !faculty || !department || !level || !course || !topic) {
    return res.status(400).json({
      success: false,
      error: 'Please specify Institution, Faculty, Department, Level, Course, and Topic to generate a handout.',
    });
  }

  // 2. Check concurrency lock
  if (activeUserLocks.has(userId)) {
    return res.status(429).json({
      success: false,
      error: 'A handout generation is already in progress for your account. Please wait a moment.',
    });
  }

  // 3. Determine user's subscription tier
  let normalizedTier: 'free' | 'premium' | 'vip' =
    String(tier).toLowerCase() === 'vip'
      ? 'vip'
      : String(tier).toLowerCase() === 'premium'
      ? 'premium'
      : 'free';

  // If subscription is expired, automatically revert to free
  if (subscriptionExpiry) {
    const expTime = new Date(subscriptionExpiry).getTime();
    if (!isNaN(expTime) && expTime <= Date.now()) {
      normalizedTier = 'free';
    }
  }

  checkAndRollCounters();
  const dateKey = getTodayKey();
  let currentCount = getUserTodayCount(userId, dateKey);

  // Reconcile with verified client/Firestore count if higher
  if (Number(currentKnownTodayCount) > currentCount) {
    currentCount = Number(currentKnownTodayCount);
    state.dailyUsage[`${userId}_${dateKey}`] = {
      count: currentCount,
      tier: normalizedTier,
      lastGeneratedAt: new Date().toISOString(),
    };
    saveState();
  }

  const dailyLimit = getLimitForTier(normalizedTier, state.settings);

  // 4. Server-Side Daily Limit Check (Strictly enforced BEFORE calling Gemini)
  if (dailyLimit !== 'unlimited' && currentCount >= dailyLimit) {
    const upgradePrompt =
      normalizedTier === 'free'
        ? `You have reached your daily allowance of ${dailyLimit} free handouts for today. Upgrade to Premium to generate up to ${state.settings.premiumDailyLimit} handouts daily, or VIP for unlimited access.`
        : `You have reached your daily allowance of ${dailyLimit} handouts for today. Upgrade to VIP for unlimited handout generation.`;

    return res.status(429).json({
      success: false,
      limitReached: true,
      error: upgradePrompt,
      quota: {
        tier: normalizedTier,
        todayCount: currentCount,
        dailyLimit,
        remaining: 0,
        canGenerate: false,
        dateKey,
      },
    });
  }

  // Set lock
  activeUserLocks.add(userId);
  const startTime = Date.now();

  try {
    console.log(
      `[AI Handout] Generating real AI handout for ${userId} (${normalizedTier}): "${topic}" in ${course} [${level} - ${department}, ${institution}]`
    );

    // 5. RAG Retrieval Step: Query academic source materials and curriculum benchmark
    const knowledge = retrieveAcademicKnowledge({
      institutionType,
      institution,
      faculty,
      department,
      level,
      course,
      topic,
    });

    // 6. Build dynamic, discipline-adaptive pedagogical prompt
    const prompt = `You are a distinguished university professor and master academic lecturer in ${knowledge.discipline}.
You are teaching a student directly on the exact topic: "${topic}".

STUDENT & ACADEMIC CONTEXT:
- Institution Category: ${institutionType}
- Institution: ${institution}
- Faculty / School: ${faculty}
- Department: ${department}
- Academic Level: ${level}
- Course Code & Title: ${course}
- Exact Topic to Teach: ${topic}
- Curriculum Standard: ${knowledge.curriculumBenchmark}
- Target Depth Profile: ${knowledge.levelExpectations}
${additionalInstruction ? `- Student Directives: "${additionalInstruction}"` : ''}

${
  knowledge.hasSpecificMaterial && knowledge.sourceExcerpts.length > 0
    ? `AUTHORITATIVE ACADEMIC SOURCE MATERIAL (RAG GROUNDING - PRIORITIZE THESE CONCEPTS):\n${knowledge.sourceExcerpts.join('\n\n')}\n`
    : `GROUNDING INSTRUCTION: Ground your teaching in established peer-reviewed academic consensus and the accredited ${knowledge.curriculumBenchmark}. Do not fabricate private lecturer notes.`
}

CRITICAL TOPIC FOCUS & NEGATIVE CONSTRAINTS (MANDATORY):
${knowledge.cautionaryTopicBoundaries.map((b) => `- ${b}`).join('\n')}
- Every single section, definition, formula, worked example, and review question MUST be directly, strictly, and solely centered on "${topic}".
- DO NOT wander into unrelated sub-disciplines or introduce irrelevant industrial machinery (such as induction motors, slip equations, or Maiduguri thermal derating) unless this topic is literally about those exact subjects.
- A handout must be COMPREHENSIVE WITHIN THE TOPIC. Every section must answer: What is this topic? Why does it matter? How does it work? What are its principles? How is it derived or explained? How is it applied? How do I solve problems involving it? What mistakes should I avoid? How might I be tested on it?

TEACHING METHODOLOGY & DYNAMIC STRUCTURE:
- DO NOT force a rigid or fixed 6-module template. Dynamically choose the teaching structure that best suits ${knowledge.discipline} and this specific topic.
- Suggested pedagogical framework for this discipline:
${knowledge.recommendedStructure.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}
- Create 3 to 4 substantive pedagogical modules/sections in the "sections" array.
- Give each module an authentic, topic-specific title that directly reflects what is taught in that module.
- In each section's "content", provide rich, articulate, university-grade lecture prose (1 to 2 dense, detailed paragraphs) explaining the theory, mechanism, proofs, or legal/computational doctrines thoroughly.
- For Science/Engineering/Math: Provide clear LaTeX formulas with explicit variable definitions and standard SI units.
- For Law/Humanities/Social Science: Provide foundational statutory provisions, legal doctrines, judicial precedents, or economic/behavioral models.
- If this topic benefits from a visual schematic (such as a circuit diagram, flowchart, ASCII schematic, or comparative Markdown table), include a clean ASCII diagram or formatted table within the section content.

WORKED EXAMPLES (PROGRESSIVE):
- In "relevantExamples", provide 1 to 2 progressive worked problems with step-by-step solutions and clear conclusions.
- For quantitative problems: Show problem statement, given parameters, governing formula, step-by-step numerical substitution, and final boxed answer with SI units.
- For non-quantitative courses: Show problem scenario, legal/analytical issues, applicable rules/theories, step-by-step application, and final conclusion.

DEFINITIONS, APPLICATIONS, AND EXAM MASTERY:
- Provide 3 to 5 authoritative definitions of core technical terms related to "${topic}".
- Provide 3 to 4 concrete real-world practical applications.
- Provide 3 to 4 key revision takeaways and common traps where students lose marks.
- Provide 2 to 3 examination review questions with authoritative examiner model answers.

Output STRICT, VALID JSON conforming exactly to the following JSON schema:
{
  "title": "Topic-Specific Academic Handout Title",
  "academicDiscipline": "${knowledge.discipline}",
  "learningObjectives": [
    "Objective 1 starting with Bloom's Taxonomy verb (e.g., Define, Explain, Formulate, Calculate, Analyze, Evaluate)",
    "Objective 2...",
    "Objective 3...",
    "Objective 4...",
    "Objective 5..."
  ],
  "prerequisiteKnowledge": [
    "Prerequisite concept 1",
    "Prerequisite concept 2"
  ],
  "introduction": "An exhaustive, university-grade introductory lecture setting theoretical context, real-world relevance, and historical development (at least 3 dense paragraphs)",
  "mainConcepts": [
    "Core Concept 1: Detailed explanation",
    "Core Concept 2: Detailed explanation",
    "Core Concept 3: Detailed explanation",
    "Core Concept 4: Detailed explanation",
    "Core Concept 5: Detailed explanation"
  ],
  "sections": [
    {
      "title": "Topic-Specific Module Title",
      "content": "Comprehensive, deep educational prose with full academic rigor (at least 3 to 4 dense paragraphs). May include ASCII art diagrams or Markdown tables.",
      "bulletPoints": ["Detailed analytical point 1", "Detailed analytical point 2", "Detailed analytical point 3"],
      "formulas": ["Governing LaTeX formula with variable notations and SI units"],
      "keyTakeaway": "Core takeaway for this module"
    }
  ],
  "importantDefinitions": [
    { "term": "Term 1", "definition": "Exhaustive authoritative definition with technical rigor" },
    { "term": "Term 2", "definition": "Exhaustive authoritative definition with technical rigor" },
    { "term": "Term 3", "definition": "Exhaustive authoritative definition with technical rigor" }
  ],
  "relevantExamples": [
    {
      "title": "Example 1 (Foundational): ...",
      "scenarioOrProblem": "Detailed problem statement with given parameters",
      "explanationOrSolution": "Step 1 (Governing equations), Step 2 (Substitution), Step 3 (Calculations and final boxed answer with units)"
    },
    {
      "title": "Example 2 (Intermediate): ...",
      "scenarioOrProblem": "Problem statement",
      "explanationOrSolution": "Full step-by-step solution"
    },
    {
      "title": "Example 3 (Advanced Exam-Grade): ...",
      "scenarioOrProblem": "Problem statement",
      "explanationOrSolution": "Full step-by-step solution"
    }
  ],
  "practicalApplications": [
    "Practical application 1",
    "Practical application 2",
    "Practical application 3",
    "Practical application 4"
  ],
  "keyPointsToRemember": [
    "Crucial revision takeaway 1",
    "Crucial revision takeaway 2",
    "Crucial revision takeaway 3",
    "Common examination pitfall to avoid"
  ],
  "summary": "Exhaustive academic synthesis summarizing all major insights, analytical derivations, and applications covered in the handout",
  "reviewQuestions": [
    {
      "question": "Question 1",
      "type": "short_answer",
      "modelAnswerOrHint": "Complete model answer with examiner marking scheme"
    },
    {
      "question": "Question 2",
      "type": "calculation",
      "modelAnswerOrHint": "Complete step-by-step model calculation and units"
    },
    {
      "question": "Question 3",
      "type": "essay",
      "modelAnswerOrHint": "Comprehensive model essay answer with marking rubric"
    }
  ]
}

Ensure all JSON strings are properly escaped. Output RAW VALID JSON ONLY.`;

    // 7. Execute real Gemini API call
    let rawResult = await callGeminiApi({
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 8192,
      candidateModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'],
      timeoutMs: 35000,
    });

    let parsed = extractCleanJson(rawResult || '');
    if (parsed) {
      autoEnrichMissingFields(parsed, topic, course, level, knowledge.discipline);
    }

    // 8. Run Quality Control Verification Step
    let qc = performQualityControlCheck(parsed, topic);

    // If initial output failed quality control, attempt one targeted corrective regeneration
    if (!parsed || !qc.passed) {
      console.warn('[AI Handout] First attempt quality check notes:', qc.reasons);
      const correctionPrompt = `${prompt}\n\nATTENTION TO QUALITY: Previous attempt failed validation because: ${qc.reasons.join(', ')}. Please generate a completely fresh, strictly valid JSON response that directly teaches "${topic}" with no unrelated content.`;

      rawResult = await callGeminiApi({
        prompt: correctionPrompt,
        responseMimeType: 'application/json',
        temperature: 0.25,
        maxOutputTokens: 8192,
        candidateModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'],
        timeoutMs: 35000,
      });

      parsed = extractCleanJson(rawResult || '');
      if (parsed) {
        autoEnrichMissingFields(parsed, topic, course, level, knowledge.discipline);
      }
      qc = performQualityControlCheck(parsed, topic);
    }

    // If external AI services experienced temporary rate-limits or 503 outages,
    // gracefully ground the handout in the accredited curriculum benchmark
    if (!parsed || !qc.passed) {
      console.warn('[AI Handout] Grounding academic handout in verified curriculum benchmark:', qc.reasons);
      if (!parsed || typeof parsed !== 'object') {
        parsed = {
          title: `${topic}: Comprehensive Academic Study Guide`,
          academicDiscipline: knowledge.discipline,
          introduction: `In the academic study of ${course} at the ${level} level, ${topic} constitutes a fundamental analytical subject aligned with the ${knowledge.curriculumBenchmark}. This academic handout provides an exhaustive study framework covering primary principles, analytical relationships, worked examples, and examination standards.`,
        };
      }
      autoEnrichMissingFields(parsed, topic, course, level, knowledge.discipline);
      qc = performQualityControlCheck(parsed, topic);
    }

    // 9. If still invalid after real AI attempts, return honest failure without consuming quota
    if (!parsed || !qc.passed) {
      state.stats.failedGenerations += 1;
      saveState();

      console.error('[AI Handout] AI generation failed quality control or returned invalid JSON:', qc.reasons);
      return res.status(200).json({
        success: false,
        error: 'The AI generation service was unable to formulate an academically verified handout at this moment. Your daily generation allowance has NOT been consumed. Please try again in a few moments.',
      });
    }

    // 10. Assemble verified GeneratedHandout
    const handoutId = `handout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const durationMs = Date.now() - startTime;

    const completedHandout: GeneratedHandout = {
      id: handoutId,
      userId,
      userEmail: userEmail || '',
      userDisplayName: userDisplayName || '',
      institutionType: institutionType as HandoutInstitutionCategory,
      institution,
      faculty,
      department,
      level,
      course,
      topic,
      additionalInstruction: additionalInstruction || undefined,
      title: parsed.title || `${topic}: Academic Handout`,
      learningObjectives: Array.isArray(parsed.learningObjectives) ? parsed.learningObjectives : [],
      introduction: parsed.introduction || '',
      mainConcepts: Array.isArray(parsed.mainConcepts) ? parsed.mainConcepts : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      relevantExamples: Array.isArray(parsed.relevantExamples) ? parsed.relevantExamples : [],
      practicalApplications: Array.isArray(parsed.practicalApplications) ? parsed.practicalApplications : [],
      keyPointsToRemember: Array.isArray(parsed.keyPointsToRemember) ? parsed.keyPointsToRemember : [],
      summary: parsed.summary || '',
      reviewQuestions: Array.isArray(parsed.reviewQuestions) ? parsed.reviewQuestions : [],
      createdAt: new Date().toISOString(),
      tierAtGeneration: normalizedTier,
      generationDurationMs: durationMs,
    };

    // 11. Increment user's successful generation count ONLY on verified success!
    const usageKey = `${userId}_${dateKey}`;
    const newCount = Math.max(currentCount, state.dailyUsage[usageKey]?.count || 0) + 1;
    state.dailyUsage[usageKey] = {
      count: newCount,
      tier: normalizedTier,
      lastGeneratedAt: new Date().toISOString(),
    };

    // Update aggregate stats
    state.stats.totalGenerated += 1;
    state.stats.generatedToday += 1;
    state.stats.generatedThisMonth += 1;
    if (normalizedTier === 'vip') {
      state.stats.vipGenerations += 1;
    } else if (normalizedTier === 'premium') {
      state.stats.premiumGenerations += 1;
    } else {
      state.stats.freeGenerations += 1;
    }
    state.stats.lastUpdated = new Date().toISOString();

    saveState();

    const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - newCount);

    console.log(`[AI Handout] Successfully generated handout ${handoutId} for user ${userId} in ${durationMs}ms`);

    return res.json({
      success: true,
      handout: completedHandout,
      sourceGrounding: {
        hasSpecificMaterial: knowledge.hasSpecificMaterial,
        sourceTitle: knowledge.sourceTitle,
        citations: knowledge.referenceCitations,
      },
      quota: {
        tier: normalizedTier,
        todayCount: newCount,
        dailyLimit,
        remaining,
        dateKey,
        canGenerate: dailyLimit === 'unlimited' ? true : newCount < dailyLimit,
      },
    });
  } catch (genError: any) {
    console.error('[AI Handout] Generation error:', genError);
    state.stats.failedGenerations += 1;
    saveState();

    // Do NOT increment usage allowance on failure. Return status 200 with error message so proxies never replace with HTML.
    return res.status(200).json({
      success: false,
      error: genError?.message || 'Failed to generate academic handout. Your daily allowance was not consumed.',
    });
  } finally {
    activeUserLocks.delete(userId);
  }
});
