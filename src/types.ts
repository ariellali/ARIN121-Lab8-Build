export interface QuizOption {
  letter: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface QuizQuestion {
  number: number;
  question: string;
  options: QuizOption[];
}

export interface QuizResponse {
  hasSufficientMaterial: boolean;
  quizIntro?: string;
  questions: QuizQuestion[];
  submissionPrompt?: string;
  formattedQuizText?: string;
}

export interface QuestionEvaluation {
  number: number;
  studentSelectedLetter: string;
  isCorrect: boolean;
  correctOptionLetter: string;
  correctOptionText?: string;
  explanation: string;
}

export interface QuizAssessment {
  score: number;
  total: number;
  scoreHeadline: string;
  overallFeedback?: string;
  evaluations: QuestionEvaluation[];
  verbatimFeedback: string;
}
