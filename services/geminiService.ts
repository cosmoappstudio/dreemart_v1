import { GoogleGenAI } from "@google/genai";
import { Artist, Language } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDreamImage = async (dreamText: string, artist: Artist): Promise<string> => {
  try {
    const prompt = `Create a masterpiece painting of the following scene in the style of ${artist.name}. 
    Style description: ${artist.styleDescription}.
    The scene is based on this dream: "${dreamText}".
    Make it atmospheric, artistic, and evocative.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    let imageUrl = '';
    
    // Iterate to find the image part
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
       for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("Image could not be generated.");
    }

    return imageUrl;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

export const interpretDreamMeaning = async (dreamText: string, language: Language = 'tr'): Promise<string> => {
  try {
    const languageNames: Record<Language, string> = {
      tr: 'Turkish',
      en: 'English',
      es: 'Spanish',
      de: 'German'
    };

    const targetLang = languageNames[language];

    const prompt = `Act as a dream interpretation expert and a mystical sage. 
    Interpret the following dream for the user.
    Tone: Gentle, mysterious, and insightful.
    Dream: "${dreamText}". 
    IMPORTANT: Provide the response in ${targetLang} language.
    Keep the response under 3 short paragraphs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "...";
  } catch (error) {
    console.error("Interpretation error:", error);
    return "The stars are silent right now.";
  }
};