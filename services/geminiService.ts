
import { GoogleGenAI } from "@google/genai";
import { DataSummary, AIAnalysisReport, ArticleDetailInsight, DataRow } from "../types";

// Khởi tạo AI instance một cách an toàn
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDeepReport = async (summary: DataSummary, articles: any[]): Promise<AIAnalysisReport> => {
  const ai = getAiInstance();
  if (!ai) throw new Error("AI Service not initialized. Check API_KEY.");

  const sampleData = articles.slice(0, 60).map(a => ({
    id: String(a.article_id),
    title: a.Title,
    cate: a.CateName,
    pvs: a.PVs,
    play: a.Total_Play,
    user: a.User,
    rate: a.Consumption_Rate,
    angle: a.Content_Angle
  }));

  const prompt = `
    Bạn là Senior Data Analyst trong lĩnh vực Media / Content Platform.
    Hãy phân tích dữ liệu hiệu suất nội dung dựa trên bảng tóm tắt và mẫu dữ liệu sau.

    NGUYÊN TẮC:
    1. KHÔNG so sánh chéo các CateName.
    2. article_id là định danh duy nhất.
    3. Trả lời HOÀN TOÀN bằng tiếng Việt chuyên nghiệp.
    
    DỮ LIỆU TÓM TẮT: ${JSON.stringify(summary.aggregates)}
    MẪU DỮ LIỆU: ${JSON.stringify(sampleData)}

    YÊU CẦU INSIGHT (Tiếng Việt):
    Trả về JSON duy nhất:
    {
      "summary": "Tóm tắt chiến lược",
      "kpis": [{"name": "string", "value": "string", "context": "string"}],
      "insights": {
        "highVolumeLowPlay": "Phân tích nhóm nhiều bài nhưng ít play",
        "highConsumptionZeroPlay": "Phân tích bài chất lượng cao dù không có video/play",
        "playVsConsumptionTrend": "Mối quan hệ Play và Consumption"
      },
      "recommendations": [{"priority": "High|Medium|Low", "action": "string", "impact": "string"}],
      "mappings": {
        "article_id": { "topic": "string", "angle": "string" }
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Media analysis failed", error);
    throw error;
  }
};

export const generateArticleInsight = async (article: DataRow): Promise<ArticleDetailInsight> => {
  const ai = getAiInstance();
  if (!ai) return {
    performanceScore: "Cần API Key",
    audiencePersona: "Vui lòng cấu hình API Key",
    growthOpportunity: "Kiểm tra Environment Variables trên Vercel",
    strategicTakeaway: "API Key bị thiếu"
  };

  const prompt = `
    Analyze this specific article performance:
    Title: ${article.Title}
    Views: ${article.PVs}
    Plays: ${article.Total_Play}
    Consumption Rate: ${article.Consumption_Rate}
    Avg Time: ${article.TimeWatching_Per_User}s
    Topic: ${article.Topic_Level_1}

    Provide a professional media analysis in Vietnamese.
    Return JSON:
    {
      "performanceScore": "Đánh giá (ví dụ: Xuất sắc, Chiến lược, Cần cải thiện)",
      "audiencePersona": "Mô tả đối tượng khán giả cốt lõi",
      "growthOpportunity": "Cách để tối đa hóa nội dung này hơn nữa",
      "strategicTakeaway": "Tóm tắt một câu cho biên tập viên"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Article insight failed", error);
    return {
      performanceScore: "Dữ liệu không khả dụng",
      audiencePersona: "Đang phân tích",
      growthOpportunity: "Làm mới dữ liệu",
      strategicTakeaway: "Insight hiện không thể truy cập"
    };
  }
};

export const generateImageForTitle = async (title: string): Promise<string | null> => {
  const ai = getAiInstance();
  if (!ai) return null;

  const prompt = `Create a professional, high-end, cinematic media thumbnail for a video titled: "${title}". 
  The style should be modern digital art, sleek, dark background, premium lighting, no text in the image. 
  Netflix series style photography.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed", error);
    return null;
  }
};
