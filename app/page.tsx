'use client';

import { useState } from 'react';
import { Upload, FileText, Video, RefreshCw, Loader2, Play, CheckCircle2, Circle, Film } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResumeRoast() {
  const [step, setStep] = useState<'upload' | 'loading_script' | 'script_ready' | 'loading_videos' | 'videos_ready' | 'stitching_video' | 'final_ready'>('upload');
  const [scriptData, setScriptData] = useState<any>(null);
  const [videos, setVideos] = useState<{ id: string, url: string, selected: boolean }[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setError(null);
    setStep('loading_script');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        let errorMessage = 'Failed to generate script';
        try {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            errorMessage = data.error || errorMessage;
          } catch (e) {
            errorMessage = `Server error (${res.status}): ${text.substring(0, 100)}...`;
          }
        } catch (e) {
          errorMessage = `Server error (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
      
      setScriptData(data);
      setStep('script_ready');
    } catch (err: any) {
      setError(err.message);
      setStep('upload');
    }
  };

  const handleGenerateVideos = async () => {
    if (!scriptData?.scenes || scriptData.scenes.length === 0) return;
    
    setError(null);
    setStep('loading_videos');

    try {
      const videoPromises = scriptData.scenes.map(async (scene: any) => {
        const res = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ veo_prompt: scene.veo_prompt }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate video for ${scene.archetype}`);
        }

        const data = await res.json();
        return { id: data.videoId, url: data.videoUrl, selected: true };
      });

      const generatedVideos = await Promise.all(videoPromises);
      setVideos(generatedVideos);
      setStep('videos_ready');
    } catch (err: any) {
      setError(err.message);
      setStep('script_ready');
    }
  };

  const toggleVideoSelection = (index: number) => {
    setVideos(prev => {
      const newVideos = [...prev];
      newVideos[index] = { ...newVideos[index], selected: !newVideos[index].selected };
      return newVideos;
    });
  };

  const handleStitchVideos = async () => {
    const selectedIds = videos.filter(v => v.selected).map(v => v.id);
    if (selectedIds.length === 0) {
      setError("Please select at least one video to export.");
      return;
    }

    setError(null);
    setStep('stitching_video');

    try {
      const res = await fetch('/api/stitch-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: selectedIds }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to stitch videos');
      }

      const data = await res.json();
      setFinalVideoUrl(data.videoUrl);
      setStep('final_ready');
    } catch (err: any) {
      setError(err.message);
      setStep('videos_ready');
    }
  };

  const reset = () => {
    setStep('upload');
    setScriptData(null);
    setVideos([]);
    setFinalVideoUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-zinc-900 font-sans selection:bg-zinc-200">
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 font-serif">The One That Got Away</h1>
          <p className="text-lg text-zinc-600 max-w-xl mx-auto">
            Upload your resume. We&apos;ll generate a &quot;The Office&quot; style mockumentary video of a famous industry icon desperately begging you to work for them.
          </p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
          {step === 'upload' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Upload your Resume</h2>
              <p className="text-zinc-500 mb-8">PDF format only, up to 5MB</p>
              
              <label className="relative inline-flex items-center justify-center px-8 py-4 text-sm font-medium text-white bg-zinc-900 rounded-full cursor-pointer hover:bg-zinc-800 transition-colors">
                <span>Select PDF File</span>
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="application/pdf"
                  onChange={handleFileUpload}
                />
              </label>
            </motion.div>
          )}

          {step === 'loading_script' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-16 text-center"
            >
              <Loader2 className="w-10 h-10 text-zinc-900 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-medium mb-2">Reading your resume...</h2>
              <p className="text-zinc-500">Our writers are crafting the perfect desperate plea.</p>
            </motion.div>
          )}

          {step === 'script_ready' && scriptData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 md:p-12"
            >
              <div className="mb-8 pb-8 border-b border-zinc-100">
                <div className="flex items-center gap-3 mb-2 text-sm font-medium text-zinc-500 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>The Target</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">{scriptData.name}</h2>
                <p className="text-lg text-zinc-600 mb-6">{scriptData.industry}</p>
                
                <div className="flex flex-wrap gap-2">
                  {scriptData.superpowers?.map((power: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm font-medium">
                      {power}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wider">
                  <Video className="w-4 h-4" />
                  <span>The Desperate Pleas (2 Scenes)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {scriptData.scenes?.map((scene: any, index: number) => (
                    <div key={index} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 relative">
                      <div className="absolute top-0 left-6 -translate-y-1/2 bg-zinc-900 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                        {scene.archetype}
                      </div>
                      
                      <p className="text-sm text-zinc-500 italic mb-4 mt-2">
                        [ {scene.stage_direction} ]
                      </p>
                      
                      <p className="text-lg font-serif leading-relaxed text-zinc-800">
                        &quot;{scene.script}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={reset}
                  className="px-6 py-3 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
                >
                  Upload Different Resume
                </button>
                <button 
                  onClick={handleGenerateVideos}
                  className="px-8 py-3 text-sm font-medium text-white bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Generate Both Videos</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'loading_videos' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-16 text-center"
            >
              <Loader2 className="w-10 h-10 text-zinc-900 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-medium mb-2">Directing the scenes...</h2>
              <p className="text-zinc-500 max-w-sm mx-auto">
                Generating 2 videos with Veo 3.1 Fast. This usually takes a few minutes. Don&apos;t close this tab.
              </p>
            </motion.div>
          )}

          {step === 'videos_ready' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Select Videos to Export</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {videos.map((video, index) => (
                  <div 
                    key={index} 
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${video.selected ? 'border-zinc-900 shadow-md' : 'border-zinc-200 opacity-70'}`}
                    onClick={() => toggleVideoSelection(index)}
                  >
                    <div className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm rounded-full p-1">
                      {video.selected ? (
                        <CheckCircle2 className="w-6 h-6 text-zinc-900" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="aspect-video bg-black">
                      <video 
                        src={video.url} 
                        controls 
                        className="w-full h-full object-cover"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="p-4 bg-white">
                      <p className="font-medium">{scriptData?.scenes?.[index]?.archetype || `Scene ${index + 1}`}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={reset}
                  className="px-6 py-3 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
                >
                  Start Over
                </button>
                <button 
                  onClick={handleStitchVideos}
                  disabled={!videos.some(v => v.selected)}
                  className="px-8 py-3 text-sm font-medium text-white bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Film className="w-4 h-4" />
                  <span>Export Selected Videos</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'stitching_video' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-16 text-center"
            >
              <Loader2 className="w-10 h-10 text-zinc-900 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-medium mb-2">Stitching videos together...</h2>
              <p className="text-zinc-500 max-w-sm mx-auto">
                Combining your selected scenes into one final masterpiece.
              </p>
            </motion.div>
          )}

          {step === 'final_ready' && finalVideoUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Your Final Cut</h2>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-8 shadow-lg">
                <video 
                  src={finalVideoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="text-center flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href={finalVideoUrl}
                  download="resume-roast.mp4"
                  className="px-8 py-3 text-sm font-medium text-white bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  Download Video
                </a>
                <button 
                  onClick={reset}
                  className="px-8 py-3 text-sm font-medium text-zinc-900 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Generate Another Interview</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
