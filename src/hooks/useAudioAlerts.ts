import { useCallback, useRef } from "react";

type SeverityLevel = "critical" | "high" | "medium" | "low";

interface AudioAlertOptions {
  enabled: boolean;
  volume: number;
}

export const useAudioAlerts = (options: AudioAlertOptions = { enabled: true, volume: 0.5 }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const minInterval = 2000; // Minimum 2 seconds between alerts

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    attack: number = 0.01,
    decay: number = 0.1
  ) => {
    if (!options.enabled) return;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(options.volume, ctx.currentTime + attack);
    gainNode.gain.linearRampToValueAtTime(options.volume * 0.7, ctx.currentTime + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [options.enabled, options.volume, getAudioContext]);

  const playCriticalAlert = useCallback(() => {
    if (!options.enabled) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Urgent alarm: rapid alternating tones
    for (let i = 0; i < 4; i++) {
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator1.type = "square";
      oscillator2.type = "square";
      oscillator1.frequency.setValueAtTime(880, now + i * 0.15);
      oscillator2.frequency.setValueAtTime(660, now + i * 0.15);

      gainNode.gain.setValueAtTime(0, now + i * 0.15);
      gainNode.gain.linearRampToValueAtTime(options.volume * 0.4, now + i * 0.15 + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.12);

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator1.start(now + i * 0.15);
      oscillator1.stop(now + i * 0.15 + 0.12);
      oscillator2.start(now + i * 0.15);
      oscillator2.stop(now + i * 0.15 + 0.12);
    }
  }, [options.enabled, options.volume, getAudioContext]);

  const playHighAlert = useCallback(() => {
    if (!options.enabled) return;

    // Warning beeps: 3 descending tones
    playTone(660, 0.15, "triangle");
    setTimeout(() => playTone(550, 0.15, "triangle"), 180);
    setTimeout(() => playTone(440, 0.2, "triangle"), 360);
  }, [options.enabled, playTone]);

  const playMediumAlert = useCallback(() => {
    if (!options.enabled) return;

    // Notification: two-tone chime
    playTone(523, 0.12, "sine");
    setTimeout(() => playTone(659, 0.18, "sine"), 130);
  }, [options.enabled, playTone]);

  const playLowAlert = useCallback(() => {
    if (!options.enabled) return;

    // Subtle ping
    playTone(440, 0.1, "sine", 0.01, 0.05);
  }, [options.enabled, playTone]);

  const playDetectionAlert = useCallback((severity: SeverityLevel) => {
    if (!options.enabled) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastPlayedRef.current < minInterval) return;
    lastPlayedRef.current = now;

    switch (severity) {
      case "critical":
        playCriticalAlert();
        break;
      case "high":
        playHighAlert();
        break;
      case "medium":
        playMediumAlert();
        break;
      case "low":
        playLowAlert();
        break;
    }
  }, [options.enabled, playCriticalAlert, playHighAlert, playMediumAlert, playLowAlert]);

  const playMultipleDetections = useCallback((severities: SeverityLevel[]) => {
    if (!options.enabled || severities.length === 0) return;

    // Play alert for highest severity found
    const priorityOrder: SeverityLevel[] = ["critical", "high", "medium", "low"];
    for (const priority of priorityOrder) {
      if (severities.includes(priority)) {
        playDetectionAlert(priority);
        break;
      }
    }
  }, [options.enabled, playDetectionAlert]);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    playDetectionAlert,
    playMultipleDetections,
    playCriticalAlert,
    playHighAlert,
    playMediumAlert,
    playLowAlert,
    cleanup,
  };
};
