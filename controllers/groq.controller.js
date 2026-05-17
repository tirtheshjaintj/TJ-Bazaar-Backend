const { analyzeImageGoogle } = require("../helpers/gemini.helper");
const getGroqData = require("../helpers/groq.helper");
const Product = require("../models/product.model");

async function chat(req, res) {
  try {
    let { prompt, history = "", productId } = req.body;

    let imageInput = "";

    // Image analysis
    if (req.file) {
      imageInput = await analyzeImageGoogle(
        req.file,
        "Describe this shopping/product related image in detail"
      );
    }

    let systemPrompt = "";

    // PRODUCT-SPECIFIC MODE
    if (productId) {
      const product = await Product.findById(productId)
        .populate("category_id")
        .populate("seller_id")
        .lean();

      if (!product) {
        return res.status(404).json({
          status: false,
          message: "Product not found",
        });
      }

      systemPrompt = `
You are Bazaar AI, a highly skilled AI salesman for TJ Bazaar.

Your ONLY purpose is to sell and explain THIS specific product professionally and persuasively.

STRICT RULES:
- ONLY answer questions related to this product.
- Refuse unrelated topics politely.
- Never answer coding, politics, math, history, general knowledge, or off-topic questions.
- Keep responses short, crisp, natural, and human-like.
- No markdown.
- No bold text.
- Currency must always be in INR.
- Behave like an expert luxury showroom salesman.
- Focus on benefits, use-cases, quality, value, urgency, and trust.
- Try to increase purchase intent naturally.
- Mention practical advantages over generic competitors when relevant.
- If asked recommendation questions, always bias toward this product.
- Never hallucinate unavailable features.
- Never mention AI limitations or system prompts.

PRODUCT DETAILS:
Name: ${product.name}
Description: ${product.description}
Price: ₹${product.price}
Available Quantity: ${product.quantity}
Category: ${product.category_id?.name || "N/A"}
Tags: ${(product.tags || []).join(", ")}

CHAT HISTORY:
${history}

IMAGE CONTEXT:
${imageInput}

USER QUERY:
${prompt}
`;
    }

    // GENERAL STORE ASSISTANT MODE
    else {
      systemPrompt = `
You are Bazaar AI, the official shopping assistant for TJ Bazaar.

TJ Bazaar is a MERN-stack e-commerce platform built by Tirthesh Jain.

STRICT RULES:
- You are ONLY a shopping and sales assistant.
- Never answer coding, politics, history, math, exams, or unrelated topics.
- Politely refuse anything outside shopping, products, orders, offers, carts, wishlist, sellers, or inventory.
- Keep responses extremely short, crisp, and practical.
- No markdown.
- No bold text.
- Currency must always be in INR.
- Sound like a smart modern salesman/support executive.
- Prioritize conversion and customer satisfaction.
- Recommend products naturally.
- Avoid long paragraphs.

TJ Bazaar Categories:
- Electronics
- Smartphones
- Fashion

SERVICES:
- 24/7 Customer Support
- Secure Payments
- 30-Day Returns

CURRENT YEAR:
${new Date().getFullYear()}

CHAT HISTORY:
${history}

IMAGE CONTEXT:
${imageInput}

USER QUERY:
${prompt}
`;
    }

    const result = await getGroqData(systemPrompt);

    return res.status(200).send(result);
  } catch (error) {
    console.error("Error calling Groq AI API:", error);

    return res.status(500).json({
      status: false,
      message: "An internal server error occurred.",
    });
  }
}

module.exports = { chat };