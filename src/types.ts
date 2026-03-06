export type Subject = 'MATEMATIKA' | 'BAHASA INDONESIA' | 'BAHASA INGGRIS';

export interface Topic {
  id: string;
  title: string;
  summary?: string;
}

export interface SubjectData {
  id: Subject;
  icon: string;
  color: string;
  topics: Topic[];
}

export type QuestionType = 'MCQ' | 'COMPLEX_MCQ' | 'TRUE_FALSE' | 'MATCHING';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: any; // number for MCQ/TF, number[] for COMPLEX, object for MATCHING
  explanation: string;
  difficulty: string;
  topic?: string;
  matchingLeft?: string[];
  matchingRight?: string[];
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: any[];
  isFinished: boolean;
  score: number;
  questions: Question[];
}

export interface QuizResult {
  id: string;
  subject: Subject;
  topic?: string;
  score: number;
  totalQuestions: number;
  date: string;
}
