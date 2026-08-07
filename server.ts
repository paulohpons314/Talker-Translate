import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 file and image processing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to initialize Gemini SDK on the server side securely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set yet.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// In-memory translation cache to avoid duplicate API calls and rate limit exhaustion
const translationCache = new Map<string, any>();
const MAX_CACHE_SIZE = 300;

function getCacheKey(text: string, sourceLang: string, targetLang: string, style: string): string {
  return `${sourceLang}:${targetLang}:${style}:${text.trim()}`;
}

function setInCache(key: string, value: any) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

// Helper with automatic retry on 429 / RESOURCE_EXHAUSTED quota limits
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];

async function generateContentWithRetry(ai: GoogleGenAI, params: any) {
  const initialModel = params.model || "gemini-3.6-flash";
  const modelsToTry = [initialModel];

  for (const model of FALLBACK_MODELS) {
    if (!modelsToTry.includes(model)) {
      modelsToTry.push(model);
    }
  }

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    // Try up to 2 times per model with backoff
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({
          ...params,
          model: modelName,
        });
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error?.status === "RESOURCE_EXHAUSTED" ||
          error?.code === 429 ||
          error?.message?.includes("RESOURCE_EXHAUSTED") ||
          error?.message?.includes("quota") ||
          error?.message?.includes("429");

        if (isRateLimit) {
          console.warn(`[Gemini API 429 Quota Exceeded] Modelo '${modelName}' tentativa ${attempt + 1}. Aguardando 1.5s...`);
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError || new Error("Cota temporária da API excedida. Tente novamente em instantes.");
}

// 1. API Route: Real-time Translation & Formatting
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang = "auto", targetLang = "pt", style = "fluid", preserveFormatting = true } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.json({ translatedText: "", detectedLanguage: "en", keyTerms: [] });
    }

    const cacheKey = getCacheKey(text, sourceLang, targetLang, style);
    if (translationCache.has(cacheKey)) {
      return res.json(translationCache.get(cacheKey));
    }

    const ai = getGeminiClient();

    const targetLangName = targetLang === "pt" ? "Português Brasileiro (PT-BR)" : "Inglês (EN-US)";
    const sourceLangInstruction = sourceLang === "auto"
      ? "Detecte o idioma do texto de origem automaticamente (Inglês ou Português)."
      : `O texto de origem está em ${sourceLang === "en" ? "Inglês" : "Português"}.`;

    const styleInstructions: Record<string, string> = {
      fluid: "Tradução natural, fluida, contemporânea e gramaticalmente perfeita mantendo o significado exato.",
      formal: "Tradução em tom executivo, erudito, profissional e acadêmico.",
      literal: "Tradução direta e precisa palavra-por-palavra mantendo a estrutura sintática próxima da original para estudos.",
      creative: "Adaptação criativa e localizada (transcriação), ajustando expressões idiomáticas e estilo para soar ultra-natural.",
    };

    const stylePrompt = styleInstructions[style] || styleInstructions.fluid;

    const systemInstruction = `Você é o motor de tradução e formatação de texto de alta precisão Lumina Translate.
${sourceLangInstruction}
Traduza o texto fornecido para ${targetLangName}.
Estilo de tradução: ${stylePrompt}
${preserveFormatting ? "Preserve rigorosamente a estrutura do texto, incluindo quebras de linha, parágrafos, marcações em Markdown, tópicos (bullet points) e pontuação." : ""}

Forneça a resposta em formato JSON estrito contendo:
- "translatedText": O texto traduzido e formatado.
- "detectedLanguage": O idioma detectado ("en" ou "pt").
- "keyTerms": Uma lista opcional de até 4 termos técnicos ou expressões idiomáticas importantes presentes no texto com a tradução e breve explicação.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            keyTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["term", "translation"],
              },
            },
          },
          required: ["translatedText", "detectedLanguage"],
        },
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    const payload = {
      translatedText: data.translatedText || "",
      detectedLanguage: data.detectedLanguage || (targetLang === "pt" ? "en" : "pt"),
      keyTerms: data.keyTerms || [],
    };

    setInCache(cacheKey, payload);

    res.json(payload);
  } catch (error: any) {
    console.error("Error in /api/translate:", error.message || error);
    const isQuotaError = error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("quota") || error?.message?.includes("429");
    res.status(isQuotaError ? 429 : 500).json({
      error: isQuotaError ? "Limite de cota temporário do Gemini atingido. Por favor aguarde alguns segundos..." : (error.message || "Falha na tradução"),
      isQuotaError: true
    });
  }
});

// 2. API Route: Process File Upload (PDF, Image OCR, DOCX, TXT, MD)
app.post("/api/process-file", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName, targetLang = "pt" } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: "Arquivo não fornecido" });
    }

    let extractedText = "";

    // If it's a DOCX file
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName?.endsWith(".docx")
    ) {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      fileName?.endsWith(".txt") ||
      fileName?.endsWith(".md")
    ) {
      extractedText = Buffer.from(fileBase64, "base64").toString("utf-8");
    }

    const ai = getGeminiClient();
    const targetLangName = targetLang === "pt" ? "Português Brasileiro (PT-BR)" : "Inglês (EN-US)";

    // If we already extracted plain text from DOCX/TXT/MD, translate it directly
    if (extractedText) {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.6-flash",
        contents: extractedText,
        config: {
          systemInstruction: `Você é um tradutor especialista. Traduza o seguinte texto extraído do arquivo "${fileName || "documento"}" para ${targetLangName}. Mantenha a estrutura, parágrafos e formatação.`,
        },
      });

      return res.json({
        originalText: extractedText,
        translatedText: response.text || "",
        fileName,
      });
    }

    // If it's PDF or Image (OCR processing via Gemini vision/multimodal)
    const mediaPart = {
      inlineData: {
        mimeType: mimeType || (fileName?.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        data: fileBase64,
      },
    };

    const promptText = `Analise este arquivo/imagem (${fileName || "documento"}). 
1. Extraia TODO o texto contido nele exatamente como está no idioma original.
2. Traduza o texto extraído para ${targetLangName}, preservando o layout e formatação em Markdown.

Retorne um objeto JSON estrito com as chaves:
- "originalText": O texto completo extraído da imagem/PDF no idioma original.
- "translatedText": O texto completo traduzido para ${targetLangName} com formatação limpa em Markdown.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: {
        parts: [mediaPart, { text: promptText }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
          },
          required: ["originalText", "translatedText"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    res.json({
      originalText: parsed.originalText || "",
      translatedText: parsed.translatedText || "",
      fileName,
    });
  } catch (error: any) {
    console.error("Error in /api/process-file:", error);
    res.status(500).json({ error: error.message || "Erro ao processar arquivo/imagem" });
  }
});

// 3. API Route: Process Web Link URL
app.post("/api/process-link", async (req, res) => {
  try {
    const { url, targetLang = "pt" } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL inválida" });
    }

    // Fetch the webpage content with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!fetchRes.ok) {
      throw new Error(`Não foi possível acessar a URL (${fetchRes.status})`);
    }

    const htmlText = await fetchRes.text();

    // Clean html markup to extract body text
    const cleanText = htmlText
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000); // Max 15k characters for speed

    if (!cleanText) {
      throw new Error("Nenhum texto utilizável encontrado no link informado.");
    }

    const ai = getGeminiClient();
    const targetLangName = targetLang === "pt" ? "Português Brasileiro (PT-BR)" : "Inglês (EN-US)";

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: cleanText,
      config: {
        systemInstruction: `Você é um tradutor especialista de conteúdo web.
Abaixo está o conteúdo extraído da página web "${url}".
1. Extraia o conteúdo principal em formato de artigo limpo em Markdown no idioma original (até 1500 palavras).
2. Traduza o conteúdo extraído para ${targetLangName}.

Retorne em formato JSON:
- "originalText": O texto limpo extraído do artigo no idioma original.
- "translatedText": O texto traduzido e formatado para ${targetLangName}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
          },
          required: ["originalText", "translatedText"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    res.json({
      originalText: parsed.originalText || cleanText.slice(0, 2000),
      translatedText: parsed.translatedText || "",
      url,
    });
  } catch (error: any) {
    console.error("Error in /api/process-link:", error);
    res.status(500).json({ error: error.message || "Erro ao processar o link da Web" });
  }
});

// 4. API Route: Gemini Assistant Prompt Field
app.post("/api/gemini-prompt", async (req, res) => {
  try {
    const { prompt, sourceText = "", translatedText = "", history = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt não pode estar vazio" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Você é o Lumina AI, assistente linguístico e tradutor inteligente multilíngue.
O usuário está trabalhando com dois textos na tela:

[TEXTO DE ORIGEM]:
"""
${sourceText.slice(0, 4000)}
"""

[TEXTO TRADUZIDO]:
"""
${translatedText.slice(0, 4000)}
"""

Responda à solicitação do usuário de forma clara, prestativa, elegante e direta em Português (ou no idioma em que o usuário perguntar).
Se o usuário pedir para reescrever, alterar o tom, resumir, criar um e-mail ou explicar expressões, utilize as informações dos textos fornecidos.`;

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      response: response.text || "Não foi possível gerar a resposta no momento.",
    });
  } catch (error: any) {
    console.error("Error in /api/gemini-prompt:", error);
    res.status(500).json({ error: error.message || "Erro ao consultar Gemini" });
  }
});

// 5. API Route: Gemini Text-To-Speech (Optional high quality audio)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, lang = "pt" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Texto inválido para TTS" });
    }

    const ai = getGeminiClient();
    const voiceName = lang === "pt" ? "Kore" : "Puck";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text.slice(0, 1000) }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({ audioBase64: base64Audio, mimeType: "audio/pcm" });
    } else {
      res.status(500).json({ error: "Não foi possível gerar o áudio TTS" });
    }
  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "Erro no serviço de voz TTS" });
  }
});

// Serve frontend / Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
