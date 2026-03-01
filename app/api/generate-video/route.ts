import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const { veo_prompt } = await req.json();
    if (!veo_prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY
    console.log(apiKey);
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });
    
    let operation = await ai.models.generateVideos({
      // model: 'veo-3.1-fast-generate-preview',
      model: 'veo-3.1-generate-preview',

      prompt: veo_prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: '16:9',
        resolution: '720p'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 15000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      console.error("Operation finished but no video URI returned. Operation state:", JSON.stringify(operation, null, 2));
      const errorMsg = operation.error?.message ? String(operation.error.message) : `No video URI returned. Operation state: ${JSON.stringify(operation)}`;
      throw new Error(errorMsg);
    }

    const videoResponse = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey!,
      },
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = uuidv4();
    const filePath = path.join(process.cwd(), 'tmp', `${id}.mp4`);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ videoUrl: `/api/video/${id}`, videoId: id });
  } catch (error: any) {
    console.error("Error generating video:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
