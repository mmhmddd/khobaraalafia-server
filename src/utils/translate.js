import axios from "axios";

const translateText = async (text, targetLang) => {
  if (!text) return text;

  try {
    console.log(`Translating text: "${text}" to ${targetLang}`);
    const response = await axios.post(
      "https://libretranslate.de/translate", // ✅ سيرفر مجاني جاهز
      {
        q: text,
        source: "ar",
        target: targetLang,
        format: "text"
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const translatedText = response.data.translatedText;
    console.log(`Translated text: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error("Translation error:", error.response ? error.response.data : error.message);
    return text; // fallback
  }
};

const formatDate = (date, lang) => {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", options);
};

export { translateText, formatDate };
