// Kid-friendly audio effects and speech synthesis helper

// Web Audio API synthesizer for instant cheerful sound effects (no external audio files needed)
let audioCtx: AudioContext | null = null;

let isAudioMuted = false;

if (typeof window !== 'undefined') {
  try {
    isAudioMuted = localStorage.getItem('colorcraft_sound_muted') === 'true';
  } catch (e) {}
}

export function isSoundMuted(): boolean {
  return isAudioMuted;
}

export function setSoundMuted(muted: boolean): boolean {
  isAudioMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('colorcraft_sound_muted', String(muted));
      window.dispatchEvent(new CustomEvent('colorcraft_sound_toggle', { detail: { muted } }));
    } catch (e) {}
  }
  if (muted) {
    stopBackgroundMelody();
    stopSpeaking();
  }
  return isAudioMuted;
}

export function toggleSoundMuted(): boolean {
  return setSoundMuted(!isAudioMuted);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a cheerful chime when selecting a tool, color, or stamping
 */
export function playChimeSound(type: 'pop' | 'sparkle' | 'fanfare' | 'click' | 'magic' | 'pageflip' = 'pop') {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'pageflip') {
      // Gentle realistic paper page turn swoosh sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'sparkle') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.2, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.22);
      });
    } else if (type === 'fanfare') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.1;
        const dur = idx === notes.length - 1 ? 0.4 : 0.15;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      });
    } else if (type === 'magic') {
      const freqs = [392, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch (err) {
    console.debug('Audio effect error:', err);
  }
}

/**
 * Play an instant cheerful pop sound effect with optional pitch frequency
 */
export function playPopSound(pitch?: number) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = pitch && pitch > 50 ? pitch : 440;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch (e) {
    playChimeSound('pop');
  }
}

/**
 * Play an instant bubbly paint splash / color droplet sound effect
 */
export function playSplashSound(pitchMultiplier = 1.0) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bubbly water droplet sound: fast pitch swoop down then tiny resonant ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = 800 * pitchMultiplier;
    const endFreq = 260 * pitchMultiplier;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);

    // Add tiny high bubble harmonic pop
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1100 * pitchMultiplier, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(550 * pitchMultiplier, now + 0.07);
    gain2.gain.setValueAtTime(0.08, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.02);
    osc2.stop(now + 0.09);
  } catch (e) {
    playChimeSound('pop');
  }
}

// ----------------------------------------------------
// GENTLE BACKGROUND LULLABY & MUSIC SYNTHESIZER
// ----------------------------------------------------
let bgMusicInterval: ReturnType<typeof setInterval> | null = null;
let bgMusicGainNode: GainNode | null = null;
let isMusicActive = false;

// Gentle pentatonic music box notes (C major pentatonic: C4, D4, E4, G4, A4, C5, D5, E5)
const MUSIC_BOX_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

// A peaceful, repeating 16-step melody pattern
const LULLABY_SEQUENCE = [
  0, 2, 4, 2, 5, 4, 2, 0,
  1, 3, 5, 3, 4, 2, 1, 0,
];

let currentStep = 0;

function playLullabyNote(freq: number) {
  try {
    const ctx = getAudioContext();
    if (!ctx || !bgMusicGainNode || !isMusicActive) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    // Gentle chime sine wave with soft harmonic
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Warm envelope: soft attack, gentle decay
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.045, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(noteGain);
    noteGain.connect(bgMusicGainNode);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch (err) {
    // Ignore transient audio context issues
  }
}

/**
 * Start or resume gentle kid-friendly background melody
 */
export function startBackgroundMelody() {
  if (isAudioMuted || typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (isMusicActive) return;
  isMusicActive = true;

  if (!bgMusicGainNode) {
    bgMusicGainNode = ctx.createGain();
    bgMusicGainNode.gain.setValueAtTime(0.75, ctx.currentTime);
    bgMusicGainNode.connect(ctx.destination);
  }

  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
  }

  // Play a note every 450ms (peaceful, gentle tempo)
  bgMusicInterval = setInterval(() => {
    if (!isMusicActive) return;
    const noteIndex = LULLABY_SEQUENCE[currentStep % LULLABY_SEQUENCE.length];
    const freq = MUSIC_BOX_NOTES[noteIndex % MUSIC_BOX_NOTES.length];
    playLullabyNote(freq);
    currentStep++;
  }, 480);
}

/**
 * Stop background melody
 */
export function stopBackgroundMelody() {
  isMusicActive = false;
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
}

/**
 * Toggle background melody on/off
 */
export function toggleBackgroundMusic(): boolean {
  if (isMusicActive) {
    stopBackgroundMelody();
    return false;
  } else {
    startBackgroundMelody();
    return true;
  }
}

/**
 * Check if background music is actively playing
 */
export function isBackgroundMusicPlaying(): boolean {
  return isMusicActive;
}

/**
 * Text-to-Speech story narration using Web Speech API with multi-language voice support
 */
export function speakStory(
  text: string,
  options?: { lang?: string; onEnd?: () => void } | (() => void)
): () => void {
  if (isAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {};
  }

  const opts = typeof options === 'function' ? { onEnd: options } : options || {};
  const langCode = opts.lang || 'en-US';

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = 0.92; // Friendly pace for kids
  utterance.pitch = 1.15; // Cheerful tone

  // Attempt to select an appropriate voice matching language
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = langCode.slice(0, 2);

  const matchedVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) &&
      (v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Premium') ||
        v.name.includes('Samantha') ||
        v.name.includes('Amelie') ||
        v.name.includes('Monica') ||
        v.name.includes('Kyoko'))
  ) || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (opts.onEnd) {
    utterance.onend = opts.onEnd;
    utterance.onerror = opts.onEnd;
  }

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
