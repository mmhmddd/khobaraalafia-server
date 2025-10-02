const axios = require("axios");

const API_URL = "https://libretranslate.de/translate";

async function translateText(text, sourceLang = "ar", targetLang = "en") {
  try {
    const response = await axios.post(API_URL, {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text"
    }, {
      headers: { "Content-Type": "application/json" }
    });

    return response.data.translatedText;
  } catch (error) {
    console.error("خطأ في الترجمة:", error.message);
    return text; // fallback: لو الترجمة فشلت نرجّع النص الأصلي
  }
}

module.exports = { translateText };
