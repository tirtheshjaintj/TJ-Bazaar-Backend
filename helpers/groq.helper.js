const Groq = require('groq-sdk');
const groqApiKey = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: groqApiKey });

if (!groqApiKey) {
    console.error('Error: Missing GROQ_API_KEY in .env file');
}

async function getGroqData(prompt) {
    try {
        const result = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
        });
        return result.choices[0]?.message?.content || "";
    } catch (error) {
        console.error('Error calling Groq AI API:', error);
        throw error;
    }
}

module.exports = getGroqData;