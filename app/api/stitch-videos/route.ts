import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const { videoIds } = await req.json();
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'No video IDs provided' }, { status: 400 });
    }

    if (videoIds.length === 1) {
      const id = videoIds[0];
      return NextResponse.json({ videoUrl: `/api/video/${id}`, videoId: id });
    }

    const outputId = uuidv4();
    const outputPath = path.join('/tmp', `${outputId}.mp4`);
    const listPath = path.join('/tmp', `${outputId}.txt`);

    const listContent = videoIds.map((id: string) => `file '${path.join('/tmp', `${id}.mp4`)}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    ffmpeg.setFfmpegPath(ffmpegStatic as string);
    ffmpeg.setFfprobePath(ffprobeStatic.path);

    return await new Promise<NextResponse>((resolve) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .on('end', () => {
          try { fs.unlinkSync(listPath); } catch (e) {}
          resolve(NextResponse.json({ videoUrl: `/api/video/${outputId}`, videoId: outputId }));
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error stitching videos:', err);
          console.error('ffmpeg stderr:', stderr);
          resolve(NextResponse.json({ error: 'Failed to stitch videos: ' + err.message + ' | ' + stderr }, { status: 500 }));
        })
        .save(outputPath);
    });
  } catch (error: any) {
    console.error('Error in stitch-videos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
