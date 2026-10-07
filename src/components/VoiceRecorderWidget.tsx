import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, Sparkles, Check } from 'lucide-react';
import {
  startVoiceRecording,
  stopVoiceRecording,
  playVoiceAudio,
  stopVoicePlayback,
  isCurrentlyRecording,
} from '../utils/audioRecorder';
import { playChimeSound } from '../utils/kidAudio';

interface VoiceRecorderWidgetProps {
  pageNumber?: number;
  initialAudioUrl?: string;
  initialDuration?: number;
  onSaveAudio: (audioUrl: string, duration: number) => void;
  onRemoveAudio?: () => void;
  compact?: boolean;
}

export function VoiceRecorderWidget({
  pageNumber,
  initialAudioUrl,
  initialDuration,
  onSaveAudio,
  onRemoveAudio,
  compact = false,
}: VoiceRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const audioObjRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioUrl(initialAudioUrl || null);
    setDuration(initialDuration || 0);
  }, [initialAudioUrl, initialDuration]);

  useEffect(() => {
    return () => {
      stopVoicePlayback();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartRecording = async () => {
    setErrorMsg(null);
    try {
      await startVoiceRecording();
      setIsRecording(true);
      setRecordingTime(0);
      playChimeSound('pop');

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone start error:', err);
      setErrorMsg('Microphone access needed to record read-along narration.');
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const result = await stopVoiceRecording();
      setIsRecording(false);
      setAudioUrl(result.dataUrl);
      setDuration(result.durationSeconds);
      onSaveAudio(result.dataUrl, result.durationSeconds);
      playChimeSound('magic');
    } catch (err: any) {
      console.warn('Microphone stop error:', err);
      setIsRecording(false);
      setErrorMsg('Failed to save audio recording.');
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopVoicePlayback();
      setIsPlaying(false);
    } else if (audioUrl) {
      setIsPlaying(true);
      playChimeSound('pop');
      audioObjRef.current = playVoiceAudio(audioUrl, () => {
        setIsPlaying(false);
      });
    }
  };

  const handleDeleteAudio = () => {
    stopVoicePlayback();
    setIsPlaying(false);
    setAudioUrl(null);
    setDuration(0);
    onRemoveAudio?.();
    playChimeSound('pop');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl text-xs">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="flex items-center gap-1 text-red-600 font-bold animate-pulse cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-red-600" />
            <span>Stop ({formatSeconds(recordingTime)})</span>
          </button>
        ) : audioUrl ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex items-center gap-1 text-amber-700 font-bold hover:text-amber-900 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-amber-600" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-amber-600" />
              )}
              <span>{isPlaying ? 'Playing...' : `Voice Clip (${formatSeconds(duration)})`}</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteAudio}
              className="text-gray-400 hover:text-red-500 cursor-pointer ml-1"
              title="Delete narration"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex items-center gap-1 text-amber-700 font-bold hover:text-amber-900 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-600" />
            <span>Record Voice</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-black shadow-xs">
            🎙️
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800">
              {pageNumber ? `Page ${pageNumber} Voice Narration` : 'Read-Along Voice Narration'}
            </h4>
            <p className="text-[10px] text-gray-500">Record child or parent reading this page's story</p>
          </div>
        </div>

        {audioUrl && !isRecording && (
          <button
            type="button"
            onClick={handleDeleteAudio}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete recorded voice clip"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>}

      <div className="flex items-center gap-2 pt-1">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-sm cursor-pointer animate-pulse"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop Recording ({formatSeconds(recordingTime)})</span>
          </button>
        ) : audioUrl ? (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause Narration' : `Play Voice (${formatSeconds(duration)})`}</span>
            </button>

            <button
              type="button"
              onClick={handleStartRecording}
              className="px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 font-bold text-xs cursor-pointer"
              title="Record again"
            >
              Re-record
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice Clip</span>
          </button>
        )}
      </div>
    </div>
  );
}
