// File: tj-bazaar-chatbot.js
const Groq = require('groq-sdk');
const { Router } = require('express');
const { check, validationResult } = require('express-validator');

const router = Router();
const groqApiKey = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: groqApiKey });

if (!groqApiKey) {
    console.error('Error: Missing GROQ_API_KEY in .env file');
    return;
}

async function getGroqData(prompt) {
    try {
        const result = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192",
        });
        return result.choices[0]?.message?.content || "";
    } catch (error) {
        console.error('Error calling Groq AI API:', error);
        throw error;
    }
}

router.post('/', [
    check('prompt').not().isEmpty().withMessage("Nothing in Prompt"),
    check('history').not().isEmpty().withMessage("Nothing in History")
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0] });
    }

    let { prompt, history } = req.body;

    prompt = `
    Make sure to Keep answers as short as possible and crisp as poosible and brief and should have no bold text as it give ** and make sure currency is in INR  and it is not a shopify platform
    Please act as a friendly shopping assistant named Bazaar AI for TJ Bazaar , an e-commerce platform for both users and sellers where they can list and buy products and manage inventory,wishlist and cart made by highly expertise of full-stack developer Tirthesh Jain using MERN(MongoDB,Express,ReactJS,NodeJS). Assist customers with queries about products, orders, and offers in a professional and engaging manner. Always prioritize clarity and relevance.
    
    Details about TJ Bazaar:
    - Product Categories:
      - Electronics: Laptops, Cameras, Accessories
      - Clothes: Men's Wear, Women's Wear, Kids Wear
      - Smartphones: Latest models, Accessories
    
    - Services Offered:
      - 24/7 Customer Support
      - Free Returns within 30 Days
      - Secure Payment Options
    
    - Current Year: ${new Date().getFullYear()}
    
    Use the following format for responses:
    1. For product inquiries: Suggest relevant options and highlight any current discounts or top-rated products.
    2. For order-related queries: Assist with order status, returns, and cancellations.
    3. For general questions: Answer in a friendly and concise manner.
    4. Make sure to Keep answers as short as possible and crisp as poosible and brief and should have no bold text as it give ** and make sure currency is in INR
    The Chat History Till Now:
    ${history}

    User's Current Query:
    ${prompt}`;

    try {
        const result = await getGroqData(prompt);
        return res.status(200).send(result);
    } catch (error) {
        console.error('Error calling Groq AI API:', error);
        return res.status(500).json({ status: false, message: 'An internal server error occurred.' });
    }
});

module.exports = router;
