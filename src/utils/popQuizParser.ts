import { PopQuizQuestion } from '../types';

export interface ParsedQuestionItem {
  id: string;
  order: number;
  questionText: string;
  correctAnswer: string;
  gpReward: number;
  rawLine: string;
  lineNumber: number;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  items: ParsedQuestionItem[];
  totalLines: number;
  validCount: number;
  invalidCount: number;
  hasErrors: boolean;
}

/**
 * Strips leading question numbers or prefixes:
 * - "1. ", "1) ", "1: ", "1 - "
 * - "[1] ", "(1) "
 * - "Q1. ", "Question 1: ", "Q 1 - "
 */
export function stripQuestionNumbering(text: string): string {
  if (!text) return '';
  return text
    .replace(/^[\s]*(?:(?:q(?:uestion)?\s*)?\d+[\.\)\:\-]\s*|\[\d+\]\s*|\(\d+\)\s*)/i, '')
    .trim();
}

/**
 * Splits a line into question text and answer based on authoritative separator.
 * Priority:
 * 1. Em dash ("—" \u2014), En dash ("–" \u2013), Horizontal bar ("―" \u2015)
 * 2. Double hyphen ("--")
 * 3. Hyphen with surrounding spaces (" - ")
 *
 * Avoids matching hyphenated words like "x-ray", "twenty-one", "COVID-19".
 */
export function splitQuestionAndAnswer(line: string): { questionPart: string; answerPart: string; separatorFound: boolean } {
  const trimmed = line.trim();
  if (!trimmed) {
    return { questionPart: '', answerPart: '', separatorFound: false };
  }

  // 1. Look for explicit long dash (Em dash \u2014, En dash \u2013, Horizontal bar \u2015)
  // When present, we take the LAST em-dash or the one separating question from answer
  const emDashRegex = /[\u2014\u2013\u2015]/;
  if (emDashRegex.test(trimmed)) {
    // If multiple em dashes, split at the last one or rightmost meaningful split
    const match = trimmed.search(emDashRegex);
    const questionPart = trimmed.substring(0, match).trim();
    const answerPart = trimmed.substring(match + 1).trim();
    return { questionPart, answerPart, separatorFound: true };
  }

  // 2. Look for double hyphen "--"
  const doubleHyphenIdx = trimmed.indexOf('--');
  if (doubleHyphenIdx !== -1) {
    const questionPart = trimmed.substring(0, doubleHyphenIdx).trim();
    const answerPart = trimmed.substring(doubleHyphenIdx + 2).trim();
    return { questionPart, answerPart, separatorFound: true };
  }

  // 3. Look for spaced hyphen " - " (must have whitespace on both sides so we don't break "power-house" or "x-ray")
  const spacedHyphenRegex = /\s+-\s+/;
  const match = trimmed.search(spacedHyphenRegex);
  if (match !== -1) {
    const questionPart = trimmed.substring(0, match).trim();
    // find end of match
    const rest = trimmed.substring(match).replace(/^\s+-\s+/, '');
    return { questionPart, answerPart: rest.trim(), separatorFound: true };
  }

  return { questionPart: trimmed, answerPart: '', separatorFound: false };
}

/**
 * Bulk parses input text containing question & answer pairs
 */
export function parseBulkQuestionsText(
  rawText: string,
  defaultGpReward: number = 25,
  sessionId: string = ''
): ParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      items: [],
      totalLines: 0,
      validCount: 0,
      invalidCount: 0,
      hasErrors: false,
    };
  }

  const lines = rawText.split(/\r?\n/);
  const items: ParsedQuestionItem[] = [];
  let validOrder = 1;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Silently skip completely blank lines
    if (!trimmedLine) {
      return;
    }

    const { questionPart, answerPart, separatorFound } = splitQuestionAndAnswer(trimmedLine);
    const cleanedQuestion = stripQuestionNumbering(questionPart);
    const cleanedAnswer = answerPart.trim();

    let isValid = true;
    let validationError: string | undefined;

    if (!separatorFound) {
      isValid = false;
      validationError = "Missing answer separator ('—'). Format: Question — Answer";
    } else if (!cleanedQuestion) {
      isValid = false;
      validationError = 'Question text cannot be empty';
    } else if (!cleanedAnswer) {
      isValid = false;
      validationError = 'Correct answer cannot be empty';
    }

    const item: ParsedQuestionItem = {
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      order: validOrder++,
      questionText: cleanedQuestion,
      correctAnswer: cleanedAnswer,
      gpReward: Math.max(1, Number(defaultGpReward) || 25),
      rawLine: line,
      lineNumber,
      isValid,
      validationError,
    };

    items.push(item);
  });

  const validCount = items.filter((i) => i.isValid).length;
  const invalidCount = items.length - validCount;

  return {
    items,
    totalLines: items.length,
    validCount,
    invalidCount,
    hasErrors: invalidCount > 0,
  };
}

/**
 * Converts validated ParsedQuestionItem array to PopQuizQuestion array
 */
export function convertParsedToQuestions(
  parsedItems: ParsedQuestionItem[],
  sessionId: string
): PopQuizQuestion[] {
  return parsedItems.map((item, idx) => ({
    id: item.id,
    sessionId,
    order: idx + 1,
    questionText: item.questionText,
    correctAnswer: item.correctAnswer,
    gpReward: Number(item.gpReward) || 25,
    status: 'pending',
    validationStatus: item.isValid ? 'valid' : 'invalid',
    validationError: item.validationError,
  }));
}
