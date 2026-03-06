import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  BookOpen, 
  Languages, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Timer,
  BrainCircuit,
  GraduationCap,
  Loader2,
  BookMarked,
  PlayCircle,
  TrendingUp,
  History,
  Trophy,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { SUBJECTS } from './constants';
import { Subject, SubjectData, Question, QuizState, Topic, QuizResult } from './types';
import { generateHOTSQuestions, generateTopicSummary } from './services/geminiService';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicSummary, setTopicSummary] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'topics' | 'summary' | 'quiz' | 'tryout'>('home');
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('quiz_history');
    if (savedHistory) {
      try {
        setQuizHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveQuizResult = (result: QuizResult) => {
    const newHistory = [result, ...quizHistory].slice(0, 50); // Keep last 50
    setQuizHistory(newHistory);
    localStorage.setItem('quiz_history', JSON.stringify(newHistory));
  };

  const finishQuiz = () => {
    if (!quizState || quizState.isFinished) return;
    
    const result: QuizResult = {
      id: Date.now().toString(),
      subject: selectedSubject!.id,
      topic: selectedTopic?.title,
      score: quizState.score,
      totalQuestions: quizState.questions.length,
      date: new Date().toISOString()
    };
    saveQuizResult(result);
    setQuizState(prev => prev ? { ...prev, isFinished: true } : null);
  };

  const startQuiz = async (subject: SubjectData, topic?: Topic, isTryout: boolean = false) => {
    setLoading(true);
    setView('quiz');
    setQuizState(null);
    setSelectedSubject(subject);
    setSelectedTopic(topic || null);
    
    let questionCount = 10;
    let duration = 24 * 60; // default 24 mins

    if (isTryout) {
      if (subject.id === 'MATEMATIKA') {
        questionCount = 25;
        duration = 60 * 60;
      } else if (subject.id === 'BAHASA INDONESIA') {
        questionCount = 25;
        duration = 60 * 60;
      } else if (subject.id === 'BAHASA INGGRIS') {
        questionCount = 25;
        duration = 30 * 60;
      }
    }

    try {
      const questions = await generateHOTSQuestions(subject.id, topic?.title, questionCount);
      if (questions && questions.length > 0) {
        setQuizState({
          currentQuestionIndex: 0,
          answers: [],
          isFinished: false,
          score: 0,
          questions: questions
        });
        setTimeLeft(duration);
      } else {
        setQuizState({
          currentQuestionIndex: 0,
          answers: [],
          isFinished: false,
          score: 0,
          questions: []
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSummary = async (topic: Topic) => {
    setSelectedTopic(topic);
    setLoadingSummary(true);
    setView('summary');
    try {
      const summary = await generateTopicSummary(selectedSubject!.id, topic.title);
      setTopicSummary(summary);
    } catch (error) {
      setTopicSummary("Gagal memuat ringkasan materi.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAnswer = (answer: any) => {
    if (!quizState) return;

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    let isCorrect = false;

    if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') {
      isCorrect = answer === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'COMPLEX_MCQ') {
      const userAns = Array.isArray(answer) ? [...answer].sort() : [];
      const correctAns = Array.isArray(currentQuestion.correctAnswer) ? [...currentQuestion.correctAnswer].sort() : [];
      isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
    } else if (currentQuestion.type === 'MATCHING') {
      isCorrect = JSON.stringify(answer) === JSON.stringify(currentQuestion.correctAnswer);
    }
    
    const newAnswers = [...quizState.answers, answer];
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;

    const newState = {
      ...quizState,
      answers: newAnswers,
      score: newScore,
      currentQuestionIndex: isLast ? quizState.currentQuestionIndex : quizState.currentQuestionIndex + 1,
      isFinished: isLast
    };

    setQuizState(newState);
    setCurrentAnswer(null); // Reset for next question

    if (isLast) {
      const result: QuizResult = {
        id: Date.now().toString(),
        subject: selectedSubject!.id,
        topic: selectedTopic?.title,
        score: newScore,
        totalQuestions: quizState.questions.length,
        date: new Date().toISOString()
      };
      saveQuizResult(result);
    }
  };

  useEffect(() => {
    if (quizState && !quizState.isFinished) {
      const q = quizState.questions[quizState.currentQuestionIndex];
      if (q.type === 'COMPLEX_MCQ') setCurrentAnswer([]);
      else if (q.type === 'MATCHING') setCurrentAnswer({});
      else setCurrentAnswer(null);
    }
  }, [quizState?.currentQuestionIndex, quizState?.isFinished]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'quiz' && quizState && !quizState.isFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && view === 'quiz' && quizState && !quizState.isFinished) {
      finishQuiz();
    }
    return () => clearInterval(timer);
  }, [view, quizState?.isFinished, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleComplexOption = (idx: number) => {
    const prev = Array.isArray(currentAnswer) ? currentAnswer : [];
    if (prev.includes(idx)) {
      setCurrentAnswer(prev.filter(i => i !== idx));
    } else {
      setCurrentAnswer([...prev, idx]);
    }
  };

  const setMatchingPair = (leftIdx: number, rightIdx: number) => {
    const prev = typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};
    setCurrentAnswer({ ...prev, [leftIdx]: rightIdx });
  };

  const reset = () => {
    setView('home');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setTopicSummary(null);
    setQuizState(null);
  };

  // Prepare chart data
  const getSubjectStats = () => {
    const stats = SUBJECTS.map(s => {
      const subjectResults = quizHistory.filter(r => r.subject === s.id);
      const avgScore = subjectResults.length > 0 
        ? Math.round((subjectResults.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / subjectResults.length) * 100)
        : 0;
      return {
        name: s.id,
        score: avgScore,
        count: subjectResults.length,
        color: s.color === 'bg-indigo-600' ? '#4f46e5' : s.color === 'bg-emerald-600' ? '#10b981' : '#f59e0b'
      };
    });
    return stats;
  };

  const getRecentProgress = () => {
    return quizHistory.slice(0, 10).reverse().map(r => ({
      date: new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      score: Math.round((r.score / r.totalQuestions) * 100),
      type: r.topic ? 'Materi' : 'Campuran',
      subject: r.subject
    }));
  };

  const getTopicStats = () => {
    const topicMap: Record<string, { total: number, count: number, subject: string }> = {};
    
    quizHistory.filter(r => r.topic).forEach(r => {
      const key = `${r.subject}: ${r.topic}`;
      if (!topicMap[key]) {
        topicMap[key] = { total: 0, count: 0, subject: r.subject };
      }
      topicMap[key].total += (r.score / r.totalQuestions);
      topicMap[key].count += 1;
    });

    return Object.entries(topicMap).map(([name, data]) => ({
      name: name.split(': ')[1],
      subject: data.subject,
      score: Math.round((data.total / data.count) * 100),
      count: data.count
    })).sort((a, b) => b.score - a.score);
  };

  const getMixedStats = () => {
    const mixedResults = quizHistory.filter(r => !r.topic);
    if (mixedResults.length === 0) return null;

    const avgScore = Math.round((mixedResults.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / mixedResults.length) * 100);
    return {
      avgScore,
      totalSesi: mixedResults.length,
      lastScore: Math.round((mixedResults[0].score / mixedResults[0].totalQuestions) * 100)
    };
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'mixed'>('overview');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={reset}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <BrainCircuit size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">TKA? <span className="text-indigo-600">GASKAN!!</span></span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={reset} className="hover:text-indigo-600 transition-colors">Beranda</button>
            <button onClick={() => setView('tryout')} className="hover:text-indigo-600 transition-colors">Tryout</button>
            <a href="#" className="hover:text-indigo-600 transition-colors">Materi</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Tentang</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-sm font-bold text-emerald-600">Siap Belajar</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <GraduationCap size={20} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900"
                >
                  Gas Belajar, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Hajar Soal TKA</span>
                </motion.h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Platform persiapan belajar yang modern dan interaktif untuk siswa-siswi yang akan menghadapi TKA(Tes Kemampuan Akademik)
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button 
                    onClick={() => setView('tryout')}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Trophy size={20} /> Mulai Tryout Sekarang
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SUBJECTS.map((subject) => (
                  <motion.div
                    key={subject.id}
                    whileHover={{ y: -8 }}
                    className="group relative bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer overflow-hidden"
                    onClick={() => {
                      setSelectedSubject(subject);
                      setView('topics');
                    }}
                  >
                    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110", subject.color)} />
                    
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg", subject.color)}>
                      {subject.id === 'MATEMATIKA' && <Calculator size={28} />}
                      {subject.id === 'BAHASA INDONESIA' && <BookOpen size={28} />}
                      {subject.id === 'BAHASA INGGRIS' && <Languages size={28} />}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{subject.id}</h3>
                    <p className="text-slate-500 text-sm mb-6">Pelajari kisi-kisi lengkap dan uji kemampuanmu dengan total 50 soal HOTS (10 soal per sesi).</p>
                    
                    <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:gap-2 transition-all">
                      Lihat Kisi-Kisi <ChevronRight size={18} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'topics' && selectedSubject && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                <ArrowLeft size={20} /> Kembali ke Beranda
              </button>

              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Kisi-Kisi {selectedSubject.id}</h2>
                    <p className="text-slate-500">Klik materi untuk melihat ringkasan atau mulai latihan.</p>
                  </div>
                  <button 
                    onClick={() => startQuiz(selectedSubject)}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Mulai Latihan Campuran <PlayCircle size={20} />
                  </button>
                </div>

                <div className="grid gap-4">
                  {selectedSubject.topics.map((topic, index) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleViewSummary(topic)}
                      className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{topic.title}</span>
                      </div>
                      <BookMarked size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'tryout' && (
            <motion.div
              key="tryout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-10"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900">Program <span className="text-indigo-600">Tryout Mandiri</span></h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Simulasi ujian TKA dengan standar waktu dan jumlah soal yang disesuaikan untuk menguji ketahanan dan kecepatanmu.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {SUBJECTS.map((subject) => {
                  const config = subject.id === 'MATEMATIKA' ? { questions: 25, time: 60 } :
                                subject.id === 'BAHASA INDONESIA' ? { questions: 25, time: 60 } :
                                { questions: 25, time: 30 };
                  
                  return (
                    <motion.div
                      key={subject.id}
                      whileHover={{ y: -10 }}
                      className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 flex flex-col items-center text-center space-y-6 relative overflow-hidden group"
                    >
                      <div className={cn("absolute top-0 left-0 w-full h-2", subject.color)} />
                      
                      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl mb-2", subject.color)}>
                        {subject.id === 'MATEMATIKA' && <Calculator size={40} />}
                        {subject.id === 'BAHASA INDONESIA' && <BookOpen size={40} />}
                        {subject.id === 'BAHASA INGGRIS' && <Languages size={40} />}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-800">{subject.id}</h3>
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                            <Target size={16} className="text-indigo-500" /> {config.questions} Soal
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                            <Timer size={16} className="text-indigo-500" /> {config.time} Menit
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-500 text-sm leading-relaxed">
                        Uji kemampuanmu dalam materi {subject.id} dengan simulasi waktu yang ketat.
                      </p>

                      <button
                        onClick={() => startQuiz(subject, undefined, true)}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2",
                          subject.color
                        )}
                      >
                        Mulai Tryout <PlayCircle size={20} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              <div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <BrainCircuit size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-800">Tips Tryout</h4>
                  <p className="text-slate-600 text-sm">Pastikan Anda berada di lingkungan yang tenang dan memiliki waktu yang cukup sebelum memulai. Tryout tidak dapat dijeda.</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'summary' && selectedTopic && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <button 
                onClick={() => setView('topics')}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                <ArrowLeft size={20} /> Kembali ke Kisi-Kisi
              </button>

              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <BookMarked size={28} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 leading-tight">{selectedTopic.title}</h2>
                      <p className="text-sm text-indigo-600 font-bold uppercase tracking-widest mt-1">{selectedSubject?.id}</p>
                    </div>
                  </div>
                </div>

                <div className="min-h-[300px]">
                  {loadingSummary ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-800">Menyusun Ringkasan Materi</p>
                        <p className="text-slate-500 mt-1">AI sedang merangkum poin-poin penting untukmu...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="markdown-body max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{topicSummary || ""}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-10 mt-10 border-t border-slate-100">
                  <button 
                    onClick={() => startQuiz(selectedSubject!, selectedTopic)}
                    className="flex-1 bg-indigo-600 text-white px-8 py-5 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    Latihan Soal Topik Ini <PlayCircle size={22} />
                  </button>
                  <button 
                    onClick={() => setView('topics')}
                    className="flex-1 bg-slate-100 text-slate-600 px-8 py-5 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Tutup Ringkasan
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-6">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800">Menyiapkan Soal HOTS...</h3>
                    <p className="text-slate-500">AI sedang merancang tantangan terbaik untukmu.</p>
                  </div>
                </div>
              ) : quizState && quizState.questions.length > 0 && !quizState.isFinished ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setView('topics')}
                      className="text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-2 bg-white rounded-full border text-sm font-bold transition-colors",
                        timeLeft < 60 ? "border-red-200 text-red-600 animate-pulse" : "border-slate-200 text-slate-600"
                      )}>
                        <Timer size={16} className={cn(timeLeft < 60 ? "text-red-500" : "text-indigo-500")} /> {formatTime(timeLeft)}
                      </div>
                      <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full">
                        Soal {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100}%` }}
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={quizState.currentQuestionIndex}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -50, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200"
                    >
                      <div className="prose prose-slate max-w-none mb-12 markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {quizState.questions[quizState.currentQuestionIndex].text}
                        </ReactMarkdown>
                      </div>

                      <div className="space-y-6">
                        {quizState.questions[quizState.currentQuestionIndex].type === 'MCQ' && (
                          <div className="grid gap-4">
                            {quizState.questions[quizState.currentQuestionIndex].options.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
                              >
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shrink-0">
                                  {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="text-lg font-semibold text-slate-700 group-hover:text-slate-900">{option}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {quizState.questions[quizState.currentQuestionIndex].type === 'TRUE_FALSE' && (
                          <div className="grid grid-cols-2 gap-4">
                            {['Benar', 'Salah'].map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={cn(
                                  "group flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all",
                                  idx === 0 ? "border-emerald-100 bg-emerald-50 hover:border-emerald-500" : "border-red-100 bg-red-50 hover:border-red-500"
                                )}
                              >
                                <div className={cn(
                                  "w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-lg",
                                  idx === 0 ? "bg-emerald-500" : "bg-red-500"
                                )}>
                                  {idx === 0 ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                </div>
                                <span className="text-xl font-bold text-slate-800">{option}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {quizState.questions[quizState.currentQuestionIndex].type === 'COMPLEX_MCQ' && (
                          <div className="space-y-6">
                            <div className="grid gap-4">
                              {quizState.questions[quizState.currentQuestionIndex].options.map((option, idx) => {
                                const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(idx);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => toggleComplexOption(idx)}
                                    className={cn(
                                      "group flex items-center gap-4 p-6 rounded-2xl border-2 transition-all text-left",
                                      isSelected ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-slate-50 hover:border-indigo-300"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"
                                    )}>
                                      {isSelected && <CheckCircle2 size={16} />}
                                    </div>
                                    <span className="text-lg font-semibold text-slate-700">{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button 
                              onClick={() => handleAnswer(currentAnswer)}
                              disabled={!Array.isArray(currentAnswer) || currentAnswer.length === 0}
                              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                              Simpan Jawaban
                            </button>
                          </div>
                        )}

                        {quizState.questions[quizState.currentQuestionIndex].type === 'MATCHING' && (
                          <div className="space-y-8">
                            <div className="grid gap-6">
                              {quizState.questions[quizState.currentQuestionIndex].matchingLeft?.map((left, lIdx) => (
                                <div key={lIdx} className="flex flex-col md:flex-row md:items-center gap-4">
                                  <div className="flex-1 p-4 bg-slate-100 rounded-xl font-bold text-slate-700 border border-slate-200">
                                    {left}
                                  </div>
                                  <div className="flex items-center justify-center text-slate-300">
                                    <ChevronRight className="rotate-90 md:rotate-0" />
                                  </div>
                                  <div className="flex-1">
                                    <select 
                                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                                      value={currentAnswer?.[lIdx] ?? ""}
                                      onChange={(e) => setMatchingPair(lIdx, parseInt(e.target.value))}
                                    >
                                      <option value="" disabled>Pilih Pasangan...</option>
                                      {quizState.questions[quizState.currentQuestionIndex].matchingRight?.map((right, rIdx) => (
                                        <option key={rIdx} value={rIdx}>{right}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => handleAnswer(currentAnswer)}
                              disabled={!currentAnswer || Object.keys(currentAnswer).length !== (quizState.questions[quizState.currentQuestionIndex].matchingLeft?.length || 0)}
                              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                              Simpan Jawaban
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : quizState && quizState.questions.length === 0 && !loading ? (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center space-y-6">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <XCircle size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">Gagal Memuat Soal</h3>
                    <p className="text-slate-500 mt-2">Terjadi kendala saat menghubungi AI. Silakan coba lagi.</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => startQuiz(selectedSubject!)}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                    >
                      Coba Lagi
                    </button>
                    <button 
                      onClick={() => setView('topics')}
                      className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              ) : quizState && quizState.isFinished ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-200 text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    
                    <div>
                      <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Latihan Selesai!</h2>
                      <p className="text-slate-500 text-lg">Kamu telah menyelesaikan tantangan TKA hari ini.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="text-3xl font-black text-indigo-600">{quizState.score}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Benar</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="text-3xl font-black text-slate-800">{Math.round((quizState.score / quizState.questions.length) * 100)}%</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Skor</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                      <button 
                        onClick={() => startQuiz(selectedSubject!)}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                      >
                        Coba Lagi
                      </button>
                      <button 
                        onClick={reset}
                        className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                      >
                        Kembali ke Menu
                      </button>
                    </div>
                  </div>

                  {/* Analisis Kelemahan */}
                  <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <BrainCircuit className="text-indigo-600" /> Analisis Kelemahan
                    </h3>
                    
                    {quizState.questions.some((q, i) => quizState.answers[i] !== q.correctAnswer) ? (
                      <div className="space-y-4">
                        <p className="text-slate-600">Berdasarkan hasil pengerjaanmu, berikut adalah topik yang perlu kamu pelajari lebih dalam:</p>
                        <div className="flex flex-wrap gap-3">
                          {Array.from(new Set(
                            quizState.questions
                              .filter((q, i) => quizState.answers[i] !== q.correctAnswer)
                              .map(q => q.topic)
                          )).map((topic, idx) => (
                            <div key={idx} className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl font-bold text-sm">
                              {topic || 'Umum'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-medium">
                        Luar biasa! Kamu menguasai semua topik dalam sesi ini dengan sempurna.
                      </div>
                    )}
                  </div>

                  {/* Review Soal */}
                  <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                      <BookMarked className="text-indigo-600" /> Review Soal
                    </h3>
                    
                    <div className="space-y-12">
                      {quizState.questions.map((question, idx) => {
                        const userAnswer = quizState.answers[idx];
                        let isCorrect = false;

                        if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
                          isCorrect = userAnswer === question.correctAnswer;
                        } else if (question.type === 'COMPLEX_MCQ') {
                          const userAns = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
                          const correctAns = Array.isArray(question.correctAnswer) ? [...question.correctAnswer].sort() : [];
                          isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
                        } else if (question.type === 'MATCHING') {
                          isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
                        }
                        
                        return (
                          <div key={idx} className="space-y-6 pb-12 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                                isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                              )}>
                                {idx + 1}
                              </div>
                              <div className="flex flex-col gap-2">
                                <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                                  {question.type.replace('_', ' ')}
                                </div>
                                <div className="markdown-body text-lg font-bold text-slate-800">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.text}</ReactMarkdown>
                                </div>
                              </div>
                            </div>

                            <div className="ml-14 space-y-4">
                              {(question.type === 'MCQ' || question.type === 'COMPLEX_MCQ' || question.type === 'TRUE_FALSE') && (
                                <div className="grid gap-3">
                                  {(question.type === 'TRUE_FALSE' ? ['Benar', 'Salah'] : question.options).map((option, oIdx) => {
                                    const isUserPicked = question.type === 'COMPLEX_MCQ' 
                                      ? Array.isArray(userAnswer) && userAnswer.includes(oIdx)
                                      : userAnswer === oIdx;
                                    const isCorrectOption = question.type === 'COMPLEX_MCQ'
                                      ? Array.isArray(question.correctAnswer) && question.correctAnswer.includes(oIdx)
                                      : question.correctAnswer === oIdx;

                                    return (
                                      <div 
                                        key={oIdx}
                                        className={cn(
                                          "p-4 rounded-xl border flex items-center justify-between",
                                          isCorrectOption ? "bg-emerald-50 border-emerald-200 text-emerald-700" : 
                                          isUserPicked && !isCorrectOption ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-100 text-slate-500"
                                        )}
                                      >
                                        <span className="font-semibold">{option}</span>
                                        {isCorrectOption && <CheckCircle2 size={18} />}
                                        {isUserPicked && !isCorrectOption && <XCircle size={18} />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === 'MATCHING' && (
                                <div className="grid gap-3">
                                  {question.matchingLeft?.map((left, lIdx) => {
                                    const userMatchIdx = userAnswer?.[lIdx];
                                    const correctMatchIdx = question.correctAnswer?.[lIdx];
                                    const isMatchCorrect = userMatchIdx === correctMatchIdx;

                                    return (
                                      <div key={lIdx} className="p-4 rounded-xl border bg-slate-50 border-slate-100 flex flex-col gap-2">
                                        <div className="font-bold text-slate-700">{left}</div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <div className={cn(
                                            "flex-1 p-2 rounded-lg border",
                                            isMatchCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                                          )}>
                                            Jawabanmu: {question.matchingRight?.[userMatchIdx] || 'Tidak ada'}
                                          </div>
                                          {!isMatchCorrect && (
                                            <div className="flex-1 p-2 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700">
                                              Benar: {question.matchingRight?.[correctMatchIdx]}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="ml-14 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Penjelasan</div>
                              <div className="text-slate-700 leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.explanation}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Dashboard - Global Bottom */}
        {quizHistory.length > 0 && view !== 'quiz' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-20 pt-20 border-t border-slate-100 space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Statistik <span className="text-indigo-600">Belajarmu</span></h2>
              <p className="text-slate-500">Pantau perkembangan skor dan penguasaan materimu secara real-time.</p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit mx-auto">
              <button 
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                  activeTab === 'overview' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Ringkasan Umum
              </button>
              <button 
                onClick={() => setActiveTab('topics')}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                  activeTab === 'topics' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Detail Materi
              </button>
              <button 
                onClick={() => setActiveTab('mixed')}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                  activeTab === 'mixed' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Latihan Campuran
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="text-indigo-600" size={24} /> Tren Skor Terakhir
                    </h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">10 Sesi Terakhir</div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getRecentProgress()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }} 
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value, name, props) => [`${value}% (${props.payload.type})`, 'Skor']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#4f46e5" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                    <Trophy className="text-amber-500" size={24} /> Rata-rata Mapel
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getSubjectStats()} layout="vertical">
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                          width={100}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`${value}%`, 'Rata-rata']}
                        />
                        <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={32}>
                          {getSubjectStats().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'topics' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <BookMarked className="text-indigo-600" size={24} /> Progres Per Materi
                </h3>
                {getTopicStats().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getTopicStats().map((stat, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{stat.subject}</span>
                            <span className="font-bold text-slate-800">{stat.name}</span>
                          </div>
                          <div className="text-2xl font-black text-slate-900">{stat.score}%</div>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full" 
                            style={{ width: `${stat.score}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 font-medium">{stat.count} kali dikerjakan</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">Belum ada data pengerjaan per materi.</div>
                )}
              </div>
            )}

            {activeTab === 'mixed' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <Target className="text-emerald-600" size={24} /> Performa Latihan Campuran
                </h3>
                {getMixedStats() ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 text-center space-y-2">
                      <div className="text-4xl font-black text-indigo-600">{getMixedStats()?.avgScore}%</div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Rata-rata Skor</div>
                    </div>
                    <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 text-center space-y-2">
                      <div className="text-4xl font-black text-emerald-600">{getMixedStats()?.totalSesi}</div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Sesi</div>
                    </div>
                    <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100 text-center space-y-2">
                      <div className="text-4xl font-black text-amber-600">{getMixedStats()?.lastScore}%</div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Skor Terakhir</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">Belum ada data pengerjaan campuran.</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-2 opacity-50">
            <BrainCircuit size={20} />
            <span className="font-bold text-lg">TKA? GASKAN!!</span>
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Didesain untuk membantu siswa menguasai konsep dasar hingga tingkat lanjut melalui pendekatan interaktif dan berbasis data.
          </p>
          <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            &copy; 2024 EduPrep Platform. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
