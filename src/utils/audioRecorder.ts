/**
 * Lightweight browser audio recorder for parent and child read-along narrations
 */

export interface RecordedAudioResult {
  dataUrl: string;
  durationSeconds: number;
  blob: Blob;
}

let activeMediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let currentPlayingAudio: HTMLAudioElement | null = null;

export async function startVoiceRecording(): Promise<void> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  // Stop any ongoing playback
  stopVoicePlayback();

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioChunks = [];
  recordingStartTime = Date.now();

  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : '';

  const options = mimeType ? { mimeType } : undefined;
  activeMediaRecorder = new MediaRecorder(stream, options);

  activeMediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  activeMediaRecorder.start(100);
}

export async function stopVoiceRecording(): Promise<RecordedAudioResult> {
  return new Promise((resolve, reject) => {
    if (!activeMediaRecorder) {
      return reject(new Error('No active recording in progress.'));
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartTime) / 1000));

    activeMediaRecorder.onstop = () => {
      try {
        const mimeType = activeMediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Stop all audio tracks to release microphone hardware cleanly
        activeMediaRecorder?.stream.getTracks().forEach((track) => track.stop());
        activeMediaRecorder = null;

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            durationSeconds,
            blob: audioBlob,
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(audioBlob);
      } catch (err) {
        reject(err);
      }
    };

    activeMediaRecorder.stop();
  });
}

export function isCurrentlyRecording(): boolean {
  return activeMediaRecorder !== null && activeMediaRecorder.state === 'recording';
}

export function playVoiceAudio(audioUrl: string, onEnded?: () => void): HTMLAudioElement {
  stopVoicePlayback();
  const audio = new Audio(audioUrl);
  currentPlayingAudio = audio;

  if (onEnded) {
    audio.onended = () => {
      if (currentPlayingAudio === audio) {
        currentPlayingAudio = null;
      }
      onEnded();
    };
  }

  audio.play().catch((err) => {
    console.warn('Playback prevented by browser policy:', err);
  });

  return audio;
}

export function stopVoicePlayback(): void {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    currentPlayingAudio = null;
  }
}
