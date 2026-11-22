/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Send,
  GraduationCap,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { QuizQuestion, QuizAssessment } from './types.ts';
import { SAMPLE_NOTES } from './sampleNotes.ts';

export default function App() {
  // Study notes state
  const [notes, setNotes] = useState<string>('');
  
  // Generation & Quiz states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [submissionPrompt, setSubmissionPrompt] = useState<string>(
    'Please submit your answers as the question number followed by the option letter, for example: 1B, 2D, 3A.'
  );

  // Student selected answers (map of question number -> selected option letter: 'A' | 'B' | 'C' | 'D')
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  // Assessment & Results states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<QuizAssessment | null>(null);
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);
  const [showVerbatimFeedback, setShowVerbatimFeedback] = useState<boolean>(true);
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);

  // Refs for smooth scrolling to results
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Compute submission string (e.g. "1B, 2D, 3A")
  const computedSubmissionString = (questions || [])
    .map((q) => {
      const selected = selectedAnswers[q.number];
      return selected ? `${q.number}${selected}` : `${q.number}?`;
    })
    .join(', ');

  const allQuestionsAnswered =
    questions !== null &&
    questions.length === 3 &&
    questions.every((q) => Boolean(selectedAnswers[q.number]));

  // Handle generating quiz
  const handleGenerateQuiz = async (notesToUse?: string) => {
    const textToSubmit = (notesToUse ?? notes).trim();
    if (!textToSubmit) {
      setGenerateError('Please paste your study notes before generating a quiz.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setAssessment(null);
    setSelectedAnswers({});

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: textToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No quiz questions could be generated from the provided material.');
      }

      setQuestions(data.questions);
      if (data.submissionPrompt) {
        setSubmissionPrompt(data.submissionPrompt);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while generating the quiz.';
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle selecting an option
  const handleOptionSelect = (questionNumber: number, letter: string) => {
    // If already submitted and showing results, don't allow modifying until retake
    if (assessment) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionNumber]: letter,
    }));
  };

  // Handle submitting student answers
  const handleSubmitAnswers = async () => {
    if (!questions || questions.length === 0) return;

    if (!allQuestionsAnswered) {
      setAssessmentError('Please select an answer for all 3 questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    setAssessmentError(null);

    // Format answers exactly as specified: question number followed by option letter, comma-separated
    // e.g., "1B, 2D, 3A"
    const answersFormat = questions
      .map((q) => `${q.number}${selectedAnswers[q.number]}`)
      .join(', ');

    try {
      const res = await fetch('/api/assess-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim(),
          quizQuestions: questions,
          answersFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assess answers');
      }

      setAssessment(data);

      // Scroll smoothly to results area below the quiz
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while assessing your answers.';
      setAssessmentError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retake quiz with same questions
  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setAssessment(null);
    setAssessmentError(null);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Create another quiz (resets quiz and returns to notes setup)
  const handleCreateAnotherQuiz = () => {
    setQuestions(null);
    setSelectedAnswers({});
    setAssessment(null);
    setAssessmentError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load sample notes
  const handleLoadSample = (sample: typeof SAMPLE_NOTES[0]) => {
    setNotes(sample.content);
    setGenerateError(null);
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const charCount = notes.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
      {/* Top Navigation / App Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Interactive Quiz Generator
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                AI practice assistant for university study material
              </p>
            </div>
          </div>

          {questions && (
            <button
              onClick={handleCreateAnotherQuiz}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              title="Start over with new study material"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Notes / Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* SETUP VIEW: Visible always, collapses/minimizes when quiz is active */}
        <section
          className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 transition-all duration-300 ${
            questions ? 'mb-8 bg-slate-50/50' : 'mb-8'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                  1
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {questions ? 'Study Material' : 'Paste Your Study Notes'}
                </h2>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {questions
                  ? 'The quiz below is generated strictly from this study material.'
                  : 'Enter textbook chapters, lecture notes, or key concepts to generate 3 tailored practice questions.'}
              </p>
            </div>

            {questions && (
              <button
                onClick={() => setShowNotesDrawer(!showNotesDrawer)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 self-start sm:self-auto cursor-pointer"
              >
                {showNotesDrawer ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide Notes</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>View / Edit Notes</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Large Text Box & Sample Presets */}
          {(!questions || showNotesDrawer) && (
            <div className="mt-5 space-y-4">
              {/* Preset Sample Notes quick picks */}
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Or load a sample topic to test:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_NOTES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sample.title}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        {sample.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Large Text Box */}
              <div className="relative">
                <label htmlFor="study-notes" className="sr-only">
                  Study Material
                </label>
                <textarea
                  id="study-notes"
                  rows={8}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (generateError) setGenerateError(null);
                  }}
                  disabled={isGenerating}
                  placeholder="Paste your study material here (e.g., lecture transcripts, textbook passages, definitions, or bullet summaries)..."
                  className="w-full p-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />

                {/* Word & Char counter, Clear button */}
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong className="text-slate-700">{wordCount}</strong> words
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700">{charCount}</strong> characters
                    </span>
                  </div>

                  {notes.length > 0 && !isGenerating && (
                    <button
                      type="button"
                      onClick={() => setNotes('')}
                      className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear notes
                    </button>
                  )}
                </div>
              </div>

              {/* Error message */}
              {generateError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Unable to generate quiz:</strong>
                    <p className="mt-0.5">{generateError}</p>
                  </div>
                </div>
              )}

              {/* Generate Quiz Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleGenerateQuiz()}
                  disabled={isGenerating || notes.trim().length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Writing 3 Multiple-Choice Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{questions ? 'Re-Generate Quiz' : 'Generate Quiz'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* QUIZ VIEW: When questions are generated */}
        {questions && (
          <section className="space-y-6">
            {/* Quiz Header Banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-950 text-base sm:text-lg">
                    Step 2: Complete the Practice Quiz
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-800 mt-0.5">
                    Select one option (A, B, C, or D) for each question. Answers will be evaluated strictly
                    against your study material.
                  </p>
                </div>
              </div>

              {/* Progress pill */}
              <div className="shrink-0 bg-white/90 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-900 shadow-2xs">
                {Object.keys(selectedAnswers).length} of 3 answered
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((q) => {
                const isAnswered = Boolean(selectedAnswers[q.number]);
                const currentAnswer = selectedAnswers[q.number];

                // If assessment is available, find this question's evaluation
                const evaluation = assessment?.evaluations.find((e) => e.number === q.number);

                return (
                  <article
                    key={q.number}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                      evaluation
                        ? evaluation.isCorrect
                          ? 'border-emerald-300 ring-1 ring-emerald-300'
                          : 'border-rose-300 ring-1 ring-rose-300'
                        : isAnswered
                        ? 'border-indigo-300 shadow-sm'
                        : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-100 flex items-start gap-4">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          evaluation
                            ? evaluation.isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : isAnswered
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {q.number}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Question {q.number} of 3
                          </span>

                          {/* Evaluation Status Badge (only after submitting) */}
                          {evaluation && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                evaluation.isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {evaluation.isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Correct</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Incorrect</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base sm:text-lg font-semibold text-slate-900 mt-1 leading-snug">
                          {q.question}
                        </h4>
                      </div>
                    </div>

                    {/* Radio Options: labelled A, B, C, and D */}
                    <div className="p-5 sm:p-6 space-y-3">
                      {q.options.map((option) => {
                        const isSelected = currentAnswer === option.letter;

                        // After assessment, determine option styling
                        let optionStyle =
                          'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white text-slate-800';

                        if (isSelected && !evaluation) {
                          optionStyle =
                            'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-600 font-medium';
                        } else if (evaluation) {
                          const isTheCorrectOption = evaluation.correctOptionLetter === option.letter;
                          if (isSelected && evaluation.isCorrect) {
                            optionStyle =
                              'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600 font-medium';
                          } else if (isSelected && !evaluation.isCorrect) {
                            optionStyle =
                              'border-rose-500 bg-rose-50 text-rose-950 ring-1 ring-rose-500 font-medium';
                          } else if (isTheCorrectOption && !evaluation.isCorrect) {
                            // Highlight the correct answer for student learning
                            optionStyle =
                              'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-500 font-medium';
                          } else {
                            optionStyle = 'border-slate-200 bg-slate-50/40 text-slate-500 opacity-70';
                          }
                        }

                        return (
                          <label
                            key={option.letter}
                            htmlFor={`q${q.number}-opt-${option.letter}`}
                            className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${optionStyle} ${
                              assessment ? 'cursor-default' : ''
                            }`}
                          >
                            {/* Standard HTML Radio Button as required */}
                            <input
                              type="radio"
                              id={`q${q.number}-opt-${option.letter}`}
                              name={`question-${q.number}`}
                              value={option.letter}
                              checked={isSelected}
                              disabled={Boolean(assessment)}
                              onChange={() => handleOptionSelect(q.number, option.letter)}
                              className="w-4 h-4 mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-default"
                            />

                            {/* Option Letter Tag */}
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected
                                  ? evaluation
                                    ? evaluation.isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                    : 'bg-indigo-600 text-white'
                                  : evaluation && evaluation.correctOptionLetter === option.letter
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {option.letter}
                            </span>

                            {/* Option Text */}
                            <div className="flex-1 text-sm sm:text-base leading-relaxed">
                              <span>{option.text}</span>

                              {/* Badges in Results View */}
                              {evaluation && (
                                <div className="mt-1 flex items-center gap-2">
                                  {isSelected && evaluation.isCorrect && (
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" /> Your Selected Answer (Correct)
                                    </span>
                                  )}
                                  {isSelected && !evaluation.isCorrect && (
                                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" /> Your Selected Answer (Incorrect)
                                    </span>
                                  )}
                                  {!isSelected && evaluation.correctOptionLetter === option.letter && (
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Explanations shown per-question after submission */}
                    {evaluation && (
                      <div
                        className={`p-4 sm:p-5 border-t text-sm ${
                          evaluation.isCorrect
                            ? 'bg-emerald-50/70 border-emerald-100 text-emerald-950'
                            : 'bg-rose-50/80 border-rose-100 text-rose-950'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {evaluation.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold text-xs tracking-wide uppercase">
                              {evaluation.isCorrect
                                ? 'Correct Answer'
                                : `Incorrect • Correct Option: ${evaluation.correctOptionLetter}`}
                            </p>
                            <p className="leading-relaxed text-sm">
                              {evaluation.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Submission Section (below questions) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              {/* Submission Prompt & Format Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Submission Format to AI:</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {submissionPrompt}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono text-sm font-bold text-indigo-700 tracking-wide shadow-2xs">
                    {computedSubmissionString}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(computedSubmissionString);
                      setCopiedFormat(true);
                      setTimeout(() => setCopiedFormat(false), 2000);
                    }}
                    title="Copy formatted answers"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedFormat ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Assessment Error */}
              {assessmentError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Submission Error:</strong>
                    <p className="mt-0.5">{assessmentError}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons: Submit Answers */}
              {!assessment ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-500">
                    {!allQuestionsAnswered && (
                      <span className="text-amber-700 font-medium">
                        * Please answer all 3 questions above to enable submission.
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitAnswers}
                    disabled={isSubmitting || !allQuestionsAnswered}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Answers to AI Assessment...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Answers</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-800">
                      Quiz Completed & Evaluated
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetakeQuiz}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Same Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateAnotherQuiz}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Another Quiz</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RESULTS AREA: Rendered below the quiz after submission */}
            {assessment && (
              <div ref={resultsRef} className="pt-4 space-y-6">
                {/* Score Summary Banner */}
                <div
                  className={`rounded-2xl p-6 sm:p-8 border shadow-xs transition-all ${
                    assessment.score === 3
                      ? 'bg-emerald-50 border-emerald-200'
                      : assessment.score >= 2
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/80 border border-slate-200 text-slate-800">
                        {assessment.score === 3
                          ? '🎉 Perfect Score'
                          : assessment.score === 2
                          ? '👍 Strong Performance'
                          : '📚 Review & Practice'}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {assessment.scoreHeadline || `Score: ${assessment.score} out of 3`}
                      </h3>
                      <p className="text-sm text-slate-700 max-w-xl leading-relaxed">
                        {assessment.overallFeedback ||
                          `You answered ${assessment.score} out of 3 questions correctly according to your study material.`}
                      </p>
                    </div>

                    {/* Score Ring / Pill */}
                    <div className="shrink-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-2">
                        <span className="text-3xl font-black text-indigo-600 leading-none">
                          {assessment.score}
                          <span className="text-lg font-bold text-slate-400">/3</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 mt-1">
                          {Math.round((assessment.score / 3) * 100)}% Accuracy
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-Question Detailed Assessment Cards */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-lg font-bold text-slate-900">
                      Answer Breakdown & Explanations
                    </h4>
                    <span className="text-xs text-slate-500">
                      Based on submitted study material
                    </span>
                  </div>

                  <div className="space-y-4">
                    {assessment.evaluations.map((item) => {
                      const questionObj = questions.find((q) => q.number === item.number);
                      const studentChosenOption = questionObj?.options.find(
                        (o) => o.letter === item.studentSelectedLetter
                      );
                      const correctOptionObj = questionObj?.options.find(
                        (o) => o.letter === item.correctOptionLetter
                      );

                      return (
                        <div
                          key={item.number}
                          className={`p-5 rounded-xl border transition-all ${
                            item.isCorrect
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-rose-50/40 border-rose-200'
                          }`}
                        >
                          {/* Status and Question Number */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {item.isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              )}
                              <span className="font-bold text-sm text-slate-900">
                                Question {item.number}:{' '}
                                <span className={item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                  {item.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </span>
                            </div>

                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                item.isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Your answer: Option {item.studentSelectedLetter}
                            </span>
                          </div>

                          {/* Question Text */}
                          {questionObj && (
                            <p className="text-sm font-medium text-slate-800 mt-2 pl-7">
                              {questionObj.question}
                            </p>
                          )}

                          {/* Comparison Details */}
                          <div className="mt-3 pl-7 space-y-2 text-xs sm:text-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-slate-600">
                              <div>
                                <span className="font-semibold text-slate-700">You selected: </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {item.studentSelectedLetter}
                                </span>{' '}
                                {studentChosenOption && `(${studentChosenOption.text})`}
                              </div>

                              {!item.isCorrect && (
                                <div className="text-emerald-700">
                                  <span className="font-semibold">Correct Option: </span>
                                  <span className="font-mono font-bold">
                                    {item.correctOptionLetter}
                                  </span>{' '}
                                  {correctOptionObj && `(${correctOptionObj.text})`}
                                </div>
                              )}
                            </div>

                            {/* Brief Explanation */}
                            <div
                              className={`p-3 rounded-lg mt-2 text-xs leading-relaxed ${
                                item.isCorrect
                                  ? 'bg-emerald-100/60 text-emerald-900'
                                  : 'bg-white border border-rose-200 text-slate-800'
                              }`}
                            >
                              <strong className="font-semibold block mb-0.5">
                                {item.isCorrect ? 'Explanation:' : 'Why this is correct:'}
                              </strong>
                              <span>{item.explanation}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Verbatim AI Assistant Feedback Accordion */}
                {assessment.verbatimFeedback && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowVerbatimFeedback(!showVerbatimFeedback)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">
                          Verbatim AI Practice Assistant Assessment
                        </span>
                      </div>
                      {showVerbatimFeedback ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {showVerbatimFeedback && (
                      <div className="p-6 bg-slate-50/70 border-t border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {assessment.verbatimFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* Post-Feedback Next Action */}
                <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <h5 className="text-sm font-bold text-indigo-950">
                      Ready for more practice?
                    </h5>
                    <p className="text-xs text-indigo-700">
                      As per assistant guidelines, a new quiz is only created when you ask for one.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetakeQuiz}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      Retake Quiz
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAnotherQuiz}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>Create Another Quiz</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p>Interactive Quiz Generator • University Practice Assistant</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Questions and answer evaluations are derived strictly from user-provided study notes.
        </p>
      </footer>
    </div>
  );
}
