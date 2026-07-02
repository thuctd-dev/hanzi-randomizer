'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechOptions {
  lang?: string;   // preferred language tag, e.g. 'zh-CN'
  rate?: number;   // 0.1 – 10, default 0.85 for learners
  pitch?: number;  // 0 – 2
}

export function useSpeech({ lang = 'zh-CN', rate = 0.65, pitch = 1 }: UseSpeechOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick the best available zh-CN voice — prefer female / Google / Microsoft
  const pickVoice = useCallback(() => {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    const zhVoices = voices.filter(v => v.lang.startsWith('zh'));

    // Priority list of preferred voice name fragments (female-sounding, high quality)
    const preferred = [
      'Google 普通话（中国大陆）',
      'Google Chinese (Simplified)',
      'Microsoft Huihui',
      'Microsoft Xiaoxiao',
      'Microsoft Yaoyao',
      'Tingting',        // macOS
      'Sinji',           // macOS Cantonese fallback
    ];

    let picked: SpeechSynthesisVoice | undefined;
    for (const name of preferred) {
      picked = zhVoices.find(v => v.name.includes(name));
      if (picked) break;
    }

    // Fallback: any zh voice, then any voice
    voiceRef.current = picked ?? zhVoices[0] ?? voices[0];
  }, [lang]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setIsSupported(true);
    pickVoice();
    // Voices load asynchronously in some browsers
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [pickVoice]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utt      = new SpeechSynthesisUtterance(text);
    utt.lang       = lang;
    utt.rate       = rate;
    utt.pitch      = pitch;
    if (voiceRef.current) utt.voice = voiceRef.current;

    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utt);
  }, [isSupported, lang, rate, pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isSupported };
}
