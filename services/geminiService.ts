import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// SECURITY: Prioritize Vite environment variables for frontend security context.
// NOTE: In production, API calls should ideally be proxied through a backend to hide the API KEY.
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '') || '';

// Configuration
const GEMINI_MODEL = 'gemini-1.5-flash'; // Updated to a valid stable model version

// Service Instance Singleton (Lazy Initialization)
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

/**
 * Initializes the Google Generative AI SDK safely.
 */
const initializeAI = (): GenerativeModel | null => {
  if (!API_KEY) {
    console.warn("Google Gemini API Key is missing. Please set VITE_GOOGLE_API_KEY in your .env file.");
    return null;
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }

  if (!model && genAI) {
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  }

  return model;
};

/**
 * تنشئ محتوى منشور قصير وجذاب لوسائل التواصل الاجتماعي باستخدام Google Gemini AI.
 *
 * @param topic الموضوع الذي يجب أن يدور حوله المنشور.
 * @returns وعد (Promise) بسلسلة نصية تحتوي على محتوى المنشور أو رسالة خطأ احتياطية.
 */
export const generatePostContent = async (topic: string): Promise<string> => {
  const aiModel = initializeAI();

  if (!aiModel) {
    return `منشور تلقائي بواسطة الذكاء الاصطناعي عن: ${topic}. (يرجى تفعيل مفتاح API)`;
  }

  try {
    const prompt = `اكتب منشوراً قصيراً وجذاباً لمواقع التواصل الاجتماعي باللهجة العربية أو العربية الفصحى البسيطة حول: "${topic}". استخدم الإيموجي المناسب. اجعله أقل من 280 حرفاً.`;
    
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // التحقق من وجود 'text' في الاستجابة لضمان السلامة
    return text || "";
  } catch (error) {
    console.error("Gemini content generation error:", error);
    return "عذراً، لا أستطيع التفكير في شيء الآن! 🤖";
  }
};