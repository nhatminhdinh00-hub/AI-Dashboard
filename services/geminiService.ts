
import { GoogleGenAI } from "@google/genai";
import { DataSummary, AIAnalysisReport, ArticleDetailInsight, DataRow } from "../types";

// Khởi tạo AI instance một cách an toàn tuyệt đối
const getAiInstance = () => {
  try {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
    if (!apiKey || apiKey === '') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    return null;
  }
};

export const generateDeepReport = async (summary: DataSummary, articles: any[]): Promise<AIAnalysisReport> => {
  const ai = getAiInstance();
  if (!ai) throw new Error("AI Service not initialized. Check API_KEY.");

  const sampleData = articles.slice(0, 60).map(a => ({
    id: String(a.article_id),
    title: a.Title,
    pvs: a.PVs || 0,
    play: a.Total_Play || 0,
    rate: a.Consumption_Rate || 0
  }));

  const prompt = `Bạn là Senior Data Analyst. Phân tích dữ liệu: ${JSON.stringify(summary.aggregates)}. Mẫu: ${JSON.stringify(sampleData)}. Trả về JSON tiếng Việt gồm summary, kpis, insights, recommendations.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed", error);
    throw error;
  }
};

export const generateArticleInsight = async (article: DataRow): Promise<ArticleDetailInsight> => {
  const ai = getAiInstance();
  if (!ai) return {
    performanceScore: "Thiếu API Key",
    audiencePersona: "Vui lòng cấu hình API Key trên Vercel",
    growthOpportunity: "Không có dữ liệu",
    strategicTakeaway: "Kiểm tra lại cấu hình"
  };

  const prompt = `Analyze article: ${article.Title}, PVs: ${article.PVs}. Return JSON: performanceScore, audiencePersona, growthOpportunity, strategicTakeaway in Vietnamese.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {
      performanceScore: "Lỗi phân tích",
      audiencePersona: "Đang cập nhật",
      growthOpportunity: "Thử lại sau",
      strategicTakeaway: "AI đang bận"
    };
  }
};

export const generateImageForTitle = async (title: string): Promise<string | null> => {
  const ai = getAiInstance();
  if (!ai) return null;

  const prompt = `Cinematic, dark, high-end photography for: "${title}". No text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};
