import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const test = async () => {
  const v1 = '/tmp/v1.mp4';
  const v2 = '/tmp/v2.mp4';
  
  // Create dummy videos
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=black:s=1280x720')
      .inputFormat('lavfi')
      .duration(1)
      .save(v1)
      .on('end', resolve)
      .on('error', reject);
  });
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=red:s=1280x720')
      .inputFormat('lavfi')
      .duration(1)
      .save(v2)
      .on('end', resolve)
      .on('error', reject);
  });

  console.log('Dummy videos created');

  await new Promise((resolve, reject) => {
    const command = ffmpeg();
    command.input(v1);
    command.input(v2);
    command.on('end', () => {
        console.log('Merged successfully');
        resolve(null);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Merge failed:', err.message);
        console.error('stderr:', stderr);
        reject(err);
      })
      .mergeToFile('/tmp/out.mp4', '/tmp');
  });
};

test().catch(console.error);
