import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Copy,
  Check,
  BookOpen,
  GraduationCap,
  Building,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Bookmark,
  Share2,
  Printer,
  Trash2,
} from 'lucide-react';
import { GeneratedHandout } from '../../types';
import { exportHandoutToPdf, copyHandoutToClipboard } from '../../lib/handoutService';

interface HandoutViewerModalProps {
  handout: GeneratedHandout | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (handoutId: string) => void;
}

export const HandoutViewerModal: React.FC<HandoutViewerModalProps> = ({
  handout,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [completedObjectives, setCompletedObjectives] = useState<Record<number, boolean>>({});

  if (!isOpen || !handout) return null;

  const handleCopy = async () => {
    const ok = await copyHandoutToClipboard(handout);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadPdf = () => {
    exportHandoutToPdf(handout);
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleObjective = (index: number) => {
    setCompletedObjectives((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Top Bar / Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between gap-3 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {handout.course}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {handout.level}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {handout.title}
                </h2>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
                title="Copy handout to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                title="Download formatted academic PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this saved handout from your library?')) {
                      onDelete(handout.id);
                      onClose();
                    }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  title="Delete handout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
                title="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Handout Content Area */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {/* Academic Context Header Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-slate-900 dark:text-white">{handout.institution}</span>
                  <span>({handout.institutionType})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{new Date(handout.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                    {handout.tierAtGeneration} Tier
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Faculty / School:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{handout.faculty}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Department:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{handout.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Level & Topic:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{handout.level} • {handout.topic}</span>
                </div>
              </div>

              {handout.additionalInstruction && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400 font-medium">Custom Directives: </span>
                  {handout.additionalInstruction}
                </div>
              )}
            </div>

            {/* Title Section */}
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Academic Curriculum Handout
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
                {handout.title}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Core Topic: <span className="text-slate-800 dark:text-slate-200">{handout.topic}</span>
              </p>
            </div>

            {/* Learning Objectives with study checkmarks */}
            {handout.learningObjectives && handout.learningObjectives.length > 0 && (
              <div className="p-5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Learning Objectives (Study Checklist)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click each objective to track your mastery while revising this handout.
                </p>
                <div className="mt-3 space-y-2">
                  {handout.learningObjectives.map((obj, i) => {
                    const isDone = Boolean(completedObjectives[i]);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleObjective(i)}
                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition text-xs sm:text-sm ${
                          isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 line-through opacity-80'
                            : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-amber-100/50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{obj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Introduction */}
            {handout.introduction && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <FileText className="w-5 h-5 text-amber-500" />
                  1. Theoretical Background & Introduction
                </h2>
                <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {handout.introduction}
                </div>
              </section>
            )}

            {/* Main Concepts */}
            {handout.mainConcepts && handout.mainConcepts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Layers className="w-5 h-5 text-amber-500" />
                  2. Governing Concepts & Pillars
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {handout.mainConcepts.map((concept, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">
                        Concept {i + 1}
                      </span>
                      {concept}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Educational Modules / Sections */}
            {handout.sections && handout.sections.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  3. In-Depth Pedagogical Modules
                </h2>

                <div className="space-y-6">
                  {handout.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3"
                    >
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Module {idx + 1}: {sec.title}
                      </h3>

                      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                        {sec.content}
                      </div>

                      {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pl-2">
                          {sec.bulletPoints.map((bp, bidx) => (
                            <li key={bidx}>{bp}</li>
                          ))}
                        </ul>
                      )}

                      {sec.formulas && sec.formulas.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {sec.formulas.map((form, fidx) => (
                            <div
                              key={fidx}
                              className="p-3 rounded-lg bg-slate-900 dark:bg-slate-950 text-amber-400 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner border border-slate-800"
                            >
                              <span className="text-slate-500 mr-2">Formula:</span>
                              {form}
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.keyTakeaway && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
                          <span className="font-bold">Key Takeaway: </span>
                          {sec.keyTakeaway}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Important Definitions */}
            {handout.importantDefinitions && handout.importantDefinitions.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                  4. Important Academic Definitions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {handout.importantDefinitions.map((item, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                        {item.term}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Relevant Examples & Case Scenarios */}
            {handout.relevantExamples && handout.relevantExamples.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <GraduationCap className="w-5 h-5 text-amber-500" />
                  5. Worked Examples & Realistic Scenarios
                </h2>
                <div className="space-y-4">
                  {handout.relevantExamples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                          Example {i + 1}
                        </span>
                        {ex.title}
                      </h4>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white block mb-1">Problem / Scenario:</span>
                        {ex.scenarioOrProblem}
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                          Worked Solution / Analysis:
                        </span>
                        <div className="whitespace-pre-line">{ex.explanationOrSolution}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Practical Nigerian Applications */}
            {handout.practicalApplications && handout.practicalApplications.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Building className="w-5 h-5 text-amber-500" />
                  6. Practical Applications
                </h2>
                <div className="space-y-2">
                  {handout.practicalApplications.map((app, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{app}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Key Points & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {handout.keyPointsToRemember && handout.keyPointsToRemember.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Key Revision Takeaways
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {handout.keyPointsToRemember.map((point, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {handout.summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Curriculum Summary
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {handout.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Self-Assessment & Exam Review Questions */}
            {handout.reviewQuestions && handout.reviewQuestions.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    7. Self-Assessment & Exam Review Questions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Standard Nigerian tertiary examination questions. Test yourself, then reveal model answer hints.
                  </p>
                </div>

                <div className="space-y-3">
                  {handout.reviewQuestions.map((q, idx) => {
                    const isRevealed = Boolean(revealedAnswers[idx]);
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs shrink-0">
                              Q{idx + 1}
                            </span>
                            <span>{q.question}</span>
                          </div>
                          {q.type && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {q.type.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {q.modelAnswerOrHint && (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleAnswer(idx)}
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium mt-1"
                            >
                              {isRevealed ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  Hide Model Marking Hint
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  Show Model Marking Scheme & Key Points
                                </>
                              )}
                            </button>

                            {isRevealed && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line"
                              >
                                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                                  Examiner Model Answer / Marking Points:
                                </span>
                                {q.modelAnswerOrHint}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Bottom Footer Actions */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Generated with Grobaax AI Academic Engine</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
              >
                {copied ? 'Copied to Clipboard' : 'Copy All Text'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold transition"
              >
                Download PDF
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
