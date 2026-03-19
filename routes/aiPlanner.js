require('dotenv').config();
const router = require("express").Router();
const { GoogleGenAI } = require("@google/genai");

// Setup Gemini API Client
let ai;
try {
    ai = new GoogleGenAI({ apiKey: "AIzaSyAI9cNIriN1ce3oi3UATCv130zxFi4xhRo" });
} catch (e) {
    console.warn("GoogleGenAI init warning:", e.message);
}

router.post("/chat", async (req, res) => {
    try {
        const { prompt, history = [] } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        // Initialize if not already done
        if (!ai) ai = new GoogleGenAI({ apiKey: "AIzaSyAI9cNIriN1ce3oi3UATCv130zxFi4xhRo" });

        const systemInstruction = "You are Study Buddy AI, a helpful, encouraging, and highly intelligent AI Tutor. Always explain academic concepts clearly, like you are teaching a bright student. Use formatting (bullet points, bold text) to make your answers easy to read. Be concise but thorough.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        res.json({ text: response.text });

    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ error: "Failed to generate AI response." });
    }
});

router.post("/generate", (req, res) => {

    const { subjects, hours } = req.body;

    let totalDifficulty = subjects.reduce(
        (sum, sub) => sum + sub.difficulty,
        0
    );

    let schedule = subjects.map(sub => {
        let studyTime = (sub.difficulty / totalDifficulty) * hours;
        return {
            subject: sub.name,
            studyTime: studyTime.toFixed(2)
        };
    });

    res.json(schedule);
});

module.exports = router;