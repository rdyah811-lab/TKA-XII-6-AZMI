import { SubjectData } from './types';

export const SUBJECTS: SubjectData[] = [
  {
    id: 'MATEMATIKA',
    icon: 'Calculator',
    color: 'bg-blue-500',
    topics: [
      { id: 'm1', title: 'EKSPONEN DAN LOGARITMA' },
      { id: 'm2', title: 'PERSAMAAN KUADRAT DAN FUNGSI KUADRAT' },
      { id: 'm3', title: 'SISTEM PERSAMAAN DAN PERTIDAKSAMAAN LINIER' },
      { id: 'm4', title: 'TRIGONOMETRI DAN LINGKARAN' },
      { id: 'm5', title: 'STATISTIKA DAN PELUANG' },
      { id: 'm6', title: 'BARISAN DAN DERET' },
      { id: 'm7', title: 'RELASI DAN FUNGSI TRANSFORMASI GEOMETRI' },
    ],
  },
  {
    id: 'BAHASA INDONESIA',
    icon: 'BookOpen',
    color: 'bg-emerald-500',
    topics: [
      { id: 'bi1', title: 'PARAGRAF DAN EJAAN' },
      { id: 'bi2', title: 'TANDA BACA DAN JENIS TEKS 1' },
      { id: 'bi3', title: 'MORFOLOGI DAN JENIS TEKS 2' },
      { id: 'bi4', title: 'SINTAKSIS DAN KARYA ILMIAH' },
      { id: 'bi5', title: 'SEMANTIK, PRAGMATIK, DAN SASTRA' },
    ],
  },
  {
    id: 'BAHASA INGGRIS',
    icon: 'Languages',
    color: 'bg-orange-500',
    topics: [
      { id: 'en1', title: 'COMPREHENDING RECOUNT AND NARRATIVE TEXT' },
      { id: 'en2', title: 'COMPREHENDING NEWS ITEM AND REPORT TEXT' },
      { id: 'en3', title: 'COMPREHENDING PROCEDURE AND DESCRIPTIVE TEXT' },
      { id: 'en4', title: 'COMPREHENDING EXPOSITION AND DISCUSSION TEXT' },
      { id: 'en5', title: 'ANNOUNCEMENT, LETTER AND CAPTION' },
    ],
  },
];
