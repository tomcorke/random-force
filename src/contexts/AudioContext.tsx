import React, { createContext, useRef } from "react";
import useSettings from "./useSettings";

type AudioApi = {
  playTick: () => Promise<void>;
  playDing: () => Promise<void>;
};

const AudioContext = createContext<AudioApi | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const { soundEnabled } = useSettings();

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const win = window as unknown as {
        webkitAudioContext?: unknown;
        AudioContext?: unknown;
      };
      const ctor = (win.AudioContext ||
        win.webkitAudioContext) as unknown as new (
        ...args: unknown[]
      ) => AudioContext;
      audioCtxRef.current = new ctor();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 0.05;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended")
      await audioCtxRef.current.resume();
  };

  const playTick = async () => {
    if (!soundEnabled) return;
    try {
      await ensureAudio();
      const ctx = audioCtxRef.current!;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      g.connect(masterGainRef.current!);

      const osc = ctx.createOscillator();
      osc.type = "square" as OscillatorType;
      osc.frequency.value = 1000 + Math.random() * 300;
      osc.connect(g);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        try {
          osc.disconnect();
          g.disconnect();
        } catch {
          /* ignore */
        }
      }, 200);
    } catch {
      // ignore audio errors
    }
  };

  const playDing = async () => {
    if (!soundEnabled) return;
    try {
      await ensureAudio();
      const ctx = audioCtxRef.current!;
      const master = masterGainRef.current!;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      g.connect(master);

      const o1 = ctx.createOscillator();
      o1.type = "sine" as OscillatorType;
      o1.frequency.value = 880;
      const o2 = ctx.createOscillator();
      o2.type = "sine" as OscillatorType;
      o2.frequency.value = 1320;

      o1.connect(g);
      o2.connect(g);
      o1.start();
      o2.start();
      o1.stop(ctx.currentTime + 1.1);
      o2.stop(ctx.currentTime + 1.1);

      setTimeout(() => {
        try {
          o1.disconnect();
          o2.disconnect();
          g.disconnect();
        } catch {
          /* ignore */
        }
      }, 1500);
    } catch {
      // ignore audio errors
    }
  };

  return (
    <AudioContext.Provider value={{ playTick, playDing }}>
      {children}
    </AudioContext.Provider>
  );
};

export default AudioContext;
