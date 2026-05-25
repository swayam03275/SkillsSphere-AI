import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateChatReply = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unconfigured. Please set GEMINI_API_KEY in .env" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are the "SkillsSphere Career Assistant", an expert AI specializing in tech careers, resumes, recruitment, and technical interviews. 
Keep your answers concise, helpful, and professional. If the user asks something completely unrelated to careers or the platform, politely decline to answer.
User message: ${message}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
};
