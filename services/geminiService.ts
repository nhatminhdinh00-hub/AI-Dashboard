
import { GoogleGenAI } from "@google/genai";
import { DataSummary, AIAnalysisReport, ArticleDetailInsight, DataRow } from "../types";

export const generateDeepReport = async (summary: DataSummary, articles: any[]): Promise<AIAnalysisReport> => {
  // Create a new instance right before making an API call to ensure it uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const sampleData = articles.slice(0, 60).map(a => ({
    id: String(a.article_id),
    title: a.Title,
    pvs: a.PVs || 0,
    play: a.Total_Play || 0,
    rate: a.Consumption_Rate || 0
  }));

  const prompt = `Bạn là Senior Data Analyst của VnExpress. Phân tích dữ liệu: ${JSON.stringify(summary.aggregates)}. Mẫu nội dung: ${JSON.stringify(sampleData)}. Trả về JSON tiếng Việt gồm các trường: summary (tổng quan chiến lược), kpis (mảng đối tượng name, value, context), insights (đối tượng highVolumeLowPlay, highConsumptionZeroPlay, playVsConsumptionTrend), recommendations (mảng đối tượng priority: High/Medium/Low, action, impact).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2000 }
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    // If the request fails with this specific error, prompt the user to select a key again
    if (error.message?.includes("Requested entity was not found.")) {
      if (typeof window !== 'undefined' && (window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
        await (window as any).aistudio.openSelectKey();
      }
    }
    console.error("AI Analysis failed", error);
    throw error;
  }
};

export const generateArticleInsight = async (article: DataRow): Promise<ArticleDetailInsight> => {
  // Create a new instance right before making an API call to ensure it uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Phân tích chuyên sâu bài viết: "${article.Title}", PVs: ${article.PVs}, Play: ${article.Total_Play}, Rate: ${article.Consumption_Rate}. 
  Trả về JSON tiếng Việt: 
  - performanceScore: Một câu ngắn đánh giá hạng (ví dụ: "A+ Viral cực mạnh")
  - audiencePersona: Chân dung người xem quan tâm bài này (2 câu)
  - growthOpportunity: 1 cơ hội để tối ưu thêm cho nội dung này
  - strategicTakeaway: 1 bài học rút ra cho ban biên tập.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    // Handle key expiration or missing billing project
    if (error.message?.includes("Requested entity was not found.")) {
      if (typeof window !== 'undefined' && (window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
        await (window as any).aistudio.openSelectKey();
      }
    }
    return {
      performanceScore: "Cần kết nối AI",
      audiencePersona: "Vui lòng nhấn nút 'Kích hoạt AI' ở thanh Header",
      growthOpportunity: "Không có dữ liệu phân tích",
      strategicTakeaway: "Kiểm tra kết nối API"
    };
  }
};
