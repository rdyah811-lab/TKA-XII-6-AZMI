import { GoogleGenAI, Type } from "@google/genai";
import { Question, Subject } from "../types";

export async function generateHOTSQuestions(subject: Subject, topic?: string, count: number = 10): Promise<Question[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Generate ${count} HOTS (Higher Order Thinking Skills) questions for the subject "${subject}"${topic ? ` focusing on topic "${topic}"` : ""}. 
  The questions should be challenging, requiring analysis, evaluation, or creation.
  Language: ${subject === 'BAHASA INGGRIS' ? 'English' : 'Indonesian'}.
  
  Mix the question types:
  1. MCQ (Pilihan Ganda Biasa): 1 correct answer.
  2. COMPLEX_MCQ (Pilihan Ganda Kompleks): 1 or more correct answers.
  3. TRUE_FALSE (Benar/Salah).
  4. MATCHING (Menjodohkan): Match items from left to right.

  Formatting: Use clean Markdown. Avoid using LaTeX symbols like $ or \\. Use plain text for powers (e.g., x^2) and fractions (e.g., 1/2).
  
  Return a JSON array of objects with the following structure:
  {
    "id": "unique_id",
    "type": "MCQ" | "COMPLEX_MCQ" | "TRUE_FALSE" | "MATCHING",
    "text": "The question text",
    "options": ["Option A", "Option B", ...], // For MCQ, COMPLEX_MCQ, TRUE_FALSE (Benar, Salah)
    "correctAnswer": "string", // MCQ: "0", COMPLEX: "[0, 2]", TF: "0" or "1", MATCHING: "{\"0\":1, \"1\":0}"
    "matchingLeft": ["Item A", "Item B", ...], // Only for MATCHING
    "matchingRight": ["Match 1", "Match 2", ...], // Only for MATCHING
    "explanation": "Detailed explanation",
    "difficulty": "HOTS",
    "topic": "Sub-topic name"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              matchingLeft: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              matchingRight: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              topic: { type: Type.STRING }
            },
            required: ["id", "type", "text", "correctAnswer", "explanation", "difficulty", "topic"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("Empty response from Gemini");
      return [];
    }
    
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("Invalid or empty array from Gemini");
      return [];
    }
    
    // Parse correctAnswer back to its intended type
    return parsed.map((q: any) => {
      try {
        q.correctAnswer = JSON.parse(q.correctAnswer);
      } catch (e) {
        // If it's not valid JSON, it might be a simple number string
        if (!isNaN(Number(q.correctAnswer))) {
          q.correctAnswer = Number(q.correctAnswer);
        }
      }
      return q;
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
}

export async function generateTopicSummary(subject: string, topic: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "API Key missing.";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Berikan ringkasan materi yang terstruktur dengan baik untuk topik "${topic}" dalam mata pelajaran "${subject}". 
  Gunakan format Markdown yang bersih. 
  Struktur yang diharapkan:
  1. Gunakan ## untuk judul bagian (misal: ## Konsep Dasar, ## Rumus Penting).
  2. Gunakan poin-poin (bullet points) untuk penjelasan agar tidak menumpuk.
  3. Gunakan **teks tebal** untuk istilah kunci.
  4. Hindari penggunaan simbol LaTeX ($ atau \\). Gunakan teks biasa (x^2, 1/2).
  5. Pastikan ada jarak antar paragraf agar enak dibaca.
  Fokus pada konsep kunci dan rumus penting.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Gagal memuat ringkasan.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Terjadi kesalahan saat memuat ringkasan.";
  }
}
