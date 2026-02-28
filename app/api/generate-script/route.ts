import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || "AIzaSyDrw9OcClvpOh0zZL-jkbSoICfU8QUYH9Q";
    const apiKey = "AIzaSyDrw9OcClvpOh0zZL-jkbSoICfU8QUYH9Q";
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are a comedy writer for a "The Office" (US) style mockumentary. Take the uploaded resume PDF and generate a comedic talking-head monologue.

Steps:
1. Extract the candidate's name, titles, skills, and experience from the resume to form a profile.
2. Identify the specific industry the candidate is applying to or working in.
3. Choose 2 DIFFERENT FICTIONAL, highly recognizable celebrity archetypes or famous business magnate personas from that specific industry (e.g., "An eccentric tech billionaire who wants to go to Mars", "A terrifyingly demanding fashion magazine editor with a bob haircut", "An angry British celebrity chef", "A zen-obsessed startup founder"). DO NOT use real names of actual people (like Elon Musk or Gordon Ramsay), as this will trigger safety filters.
4. For each persona, write a VERY SHORT 15-20 word humorous monologue delivered by this fictional celebrity in a "The Office" style documentary interview. It must get straight to the point and take less than 8 seconds to say.
5. The narrative MUST follow this exact arc: The celebrity briefly mentions ignoring the candidate, states their company is now failing without the candidate's specific skills, and begs them to come work for them. Keep it punchy and fast.

Respond ONLY with JSON, no markdown fences:
{
  "name": "",
  "industry": "",
  "superpowers": ["", "", ""],
  "scenes": [
    {
      "archetype": "<The chosen fictional celebrity persona's name/title>",
      "archetype_description": "<Brief description of the persona and their current desperate situation>",
      "script": "<The humorous monologue begging the candidate>",
      "stage_direction": "<e.g., Looks desperately into the camera, holding back tears, sitting in a chaotic office>",
      "veo_prompt": "<A cinematic mockumentary style medium shot of [Fictional Persona Description]. DO NOT USE REAL NAMES. They are sitting in their [Industry-specific setting]. They look extremely desperate and stressed, making dramatic hand gestures towards the camera. Documentary style lighting, slight handheld camera shake. Include the exact generated script in quotes for them to speak, e.g., \"[insert script here]\", he pleaded. No text overlays. One dense paragraph.>"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
          {
            text: "Generate the roast script based on the instructions.",
          }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            industry: { type: Type.STRING },
            superpowers: { type: Type.ARRAY, items: { type: Type.STRING } },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  archetype: { type: Type.STRING },
                  archetype_description: { type: Type.STRING },
                  script: { type: Type.STRING },
                  stage_direction: { type: Type.STRING },
                  veo_prompt: { type: Type.STRING },
                },
                required: ["archetype", "archetype_description", "script", "stage_direction", "veo_prompt"]
              }
            }
          },
          required: ["name", "industry", "superpowers", "scenes"],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (error: any) {
    console.error("Error generating script:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
