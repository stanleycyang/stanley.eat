'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import type { DishRecipe } from '@/types/dish';
import {
  SCALE_OPTIONS,
  formatCulinaryAmount,
  type ScaleFactor,
} from './RecipePanel';

export interface CookModeModalProps {
  dish: DishRecipe;
  isOpen: boolean;
  onClose: () => void;
  scale: ScaleFactor;
  onChangeScale: (scale: ScaleFactor) => void;
  checkedMap: Record<string, boolean>;
  onToggleIngredient: (ingredientId: string) => void;
  onResetChecked: () => void;
}

interface DetectedTimer {
  key: string;
  label: string;
  rangeNote?: string;
  durationSeconds: number;
}

interface ActiveTimer {
  id: string;
  label: string;
  stepNumber: number;
  totalSeconds: number;
  remainingMs: number;
  endTime: number | null;
  running: boolean;
  finished: boolean;
}

interface WakeLockSentinelLike {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
  removeEventListener?: (type: 'release', listener: () => void) => void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const DURATION_REGEX =
  /\b(\d+(?:\.\d+)?)\s*(?:(?:-|–|—|\bto\b)\s*(\d+(?:\.\d+)?)\s*)?(hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)\b/gi;

function parseStepTimers(stepText: string): DetectedTimer[] {
  const results: DetectedTimer[] = [];
  const seen = new Set<string>();

  DURATION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = DURATION_REGEX.exec(stepText);

  while (match !== null) {
    const firstVal = Number.parseFloat(match[1]);
    const secondVal = match[2] ? Number.parseFloat(match[2]) : null;
    const rawUnit = match[3].toLowerCase();

    let multiplier = 60;
    let shortUnit = 'min';
    if (rawUnit.startsWith('h')) {
      multiplier = 3600;
      shortUnit = 'hr';
    } else if (rawUnit.startsWith('s')) {
      multiplier = 1;
      shortUnit = 'sec';
    }

    if (Number.isFinite(firstVal) && firstVal > 0) {
      const durationSeconds = Math.max(1, Math.round(firstVal * multiplier));
      const baseLabel = formatChipDuration(durationSeconds);
      const rangeNote =
        secondVal && Number.isFinite(secondVal) && secondVal > firstVal
          ? `${match[1]}–${match[2]} ${shortUnit}`
          : undefined;
      const key = `${durationSeconds}-${rangeNote ?? baseLabel}`;

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          key,
          label: baseLabel,
          rangeNote,
          durationSeconds,
        });
      }
    }

    match = DURATION_REGEX.exec(stepText);
  }

  return results;
}

function formatChipDuration(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.round((totalSeconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr`;
  }
  if (totalSeconds >= 60) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${totalSeconds} sec`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function playBellChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const win = window as unknown as WindowWithWebkitAudio;
    const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const strikeBell = (startTime: number, freq: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 1.5, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.05);

      overtoneGain.gain.setValueAtTime(0.0001, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(
        gainPeak * 0.25,
        startTime + 0.015
      );
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + 1.1);
      overtone.stop(startTime + 0.6);
    };

    strikeBell(now, 880, 0.16);
    strikeBell(now + 0.34, 1046.5, 0.14);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1800);
  } catch {
    // Audio playback may be restricted by browser autoplay policy
  }
}

export function CookModeModal({
  dish,
  isOpen,
  onClose,
  scale,
  onChangeScale,
  checkedMap,
  onToggleIngredient,
  onResetChecked,
}: CookModeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockWanted, setWakeLockWanted] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const wakeLockDesiredRef = useRef(false);
  const chimedTimerIdsRef = useRef<Set<string>>(new Set());
  const timerIdCounterRef = useRef(0);

  // Reset step and active timers when switching to a different dish
  useEffect(() => {
    setCurrentStep(0);
    setActiveTimers([]);
    chimedTimerIdsRef.current.clear();
    setDrawerOpen(false);
  }, [dish.id]);

  // Collapse the ingredients drawer when Cook Mode closes
  useEffect(() => {
    if (!isOpen) {
      setDrawerOpen(false);
    }
  }, [isOpen]);

  // Lock page scrolling while Cook Mode is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Wake Lock API management
  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockSentinelRef.current;
    wakeLockSentinelRef.current = null;
    setWakeLockActive(false);
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors
      }
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as unknown as NavigatorWithWakeLock;
    if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
      setWakeLockSupported(false);
      return;
    }
    setWakeLockSupported(true);

    if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
      return;
    }

    try {
      const sentinel = await nav.wakeLock.request('screen');

      // Guard against modal closing/unmounting or user toggling off while request was in flight
      if (!wakeLockDesiredRef.current) {
        if (!sentinel.released) {
          try {
            await sentinel.release();
          } catch {
            // Ignore release errors
          }
        }
        return;
      }

      wakeLockSentinelRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.('release', () => {
        if (wakeLockSentinelRef.current === sentinel) {
          wakeLockSentinelRef.current = null;
        }
        setWakeLockActive(false);
      });
    } catch {
      if (wakeLockDesiredRef.current) {
        setWakeLockActive(false);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as unknown as NavigatorWithWakeLock;
      setWakeLockSupported(Boolean(nav.wakeLock && typeof nav.wakeLock.request === 'function'));
    }
  }, []);

  useEffect(() => {
    const desired = isOpen && wakeLockWanted;
    wakeLockDesiredRef.current = desired;

    if (!desired) {
      void releaseWakeLock();
      return;
    }

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockDesiredRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      wakeLockDesiredRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [isOpen, wakeLockWanted, requestWakeLock, releaseWakeLock]);

  // Live countdown ticker (drift-free via wall-clock endTime)
  const hasRunningTimers = useMemo(
    () => activeTimers.some((timer) => timer.running),
    [activeTimers]
  );

  useEffect(() => {
    if (!hasRunningTimers) return;

    const interval = window.setInterval(() => {
      const now = Date.now();

      setActiveTimers((prev) =>
        prev.map((timer) => {
          if (!timer.running || timer.endTime === null) return timer;
          const remainingMs = Math.max(0, timer.endTime - now);
          if (remainingMs === 0) {
            return {
              ...timer,
              remainingMs: 0,
              endTime: null,
              running: false,
              finished: true,
            };
          }
          return { ...timer, remainingMs };
        })
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, [hasRunningTimers]);

  // Play bell chime safely in an effect when any timer newly transitions to finished
  useEffect(() => {
    let shouldChime = false;
    for (const timer of activeTimers) {
      if (timer.finished && !chimedTimerIdsRef.current.has(timer.id)) {
        chimedTimerIdsRef.current.add(timer.id);
        shouldChime = true;
      }
    }
    if (shouldChime) {
      playBellChime();
    }
  }, [activeTimers]);

  const totalSteps = dish.steps.length;
  const clampedStep = Math.min(currentStep, Math.max(0, totalSteps - 1));
  const stepText = dish.steps[clampedStep] ?? '';

  const detectedTimers = useMemo(() => parseStepTimers(stepText), [stepText]);

  const checkedCount = useMemo(
    () => dish.ingredients.filter((item) => Boolean(checkedMap[item.id])).length,
    [dish.ingredients, checkedMap]
  );

  const handleStartTimer = useCallback(
    (detected: DetectedTimer) => {
      timerIdCounterRef.current += 1;
      const now = Date.now();
      const durationMs = detected.durationSeconds * 1000;
      const newTimer: ActiveTimer = {
        id: `timer-${timerIdCounterRef.current}`,
        label: detected.rangeNote ?? detected.label,
        stepNumber: clampedStep + 1,
        totalSeconds: detected.durationSeconds,
        remainingMs: durationMs,
        endTime: now + durationMs,
        running: true,
        finished: false,
      };
      setActiveTimers((prev) => [...prev, newTimer]);
    },
    [clampedStep]
  );

  const handleTogglePauseTimer = useCallback((timerId: string) => {
    const now = Date.now();
    chimedTimerIdsRef.current.delete(timerId);
    setActiveTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== timerId) return timer;
        if (timer.running) {
          const remainingMs =
            timer.endTime !== null ? Math.max(0, timer.endTime - now) : timer.remainingMs;
          return {
            ...timer,
            running: false,
            endTime: null,
            remainingMs,
          };
        }
        const nextRemaining =
          timer.remainingMs > 0 ? timer.remainingMs : timer.totalSeconds * 1000;
        return {
          ...timer,
          running: true,
          finished: false,
          remainingMs: nextRemaining,
          endTime: now + nextRemaining,
        };
      })
    );
  }, []);

  const handleResetTimer = useCallback((timerId: string) => {
    chimedTimerIdsRef.current.delete(timerId);
    setActiveTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== timerId) return timer;
        return {
          ...timer,
          running: false,
          finished: false,
          endTime: null,
          remainingMs: timer.totalSeconds * 1000,
        };
      })
    );
  }, []);

  const handleDismissTimer = useCallback((timerId: string) => {
    chimedTimerIdsRef.current.delete(timerId);
    setActiveTimers((prev) => prev.filter((timer) => timer.id !== timerId));
  }, []);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  // Keyboard navigation inside Cook Mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (drawerOpen) {
          setDrawerOpen(false);
        } else {
          onClose();
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextStep();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevStep();
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        setDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, drawerOpen, onClose, handleNextStep, handlePrevStep]);

  if (!isOpen) return null;

  const progressPercent = totalSteps > 0 ? ((clampedStep + 1) / totalSteps) * 100 : 100;
  const isFirstStep = clampedStep === 0;
  const isLastStep = clampedStep >= totalSteps - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Cook Mode for ${dish.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF7F2] text-[#1C1917]"
    >
      {/* Top Progress Track */}
      <div className="h-1.5 w-full bg-[#EFE8DC]">
        <div
          className="h-full bg-[#D9381E] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header Bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E6DDD0] bg-[#FFFDF9]/90 px-4 py-3.5 backdrop-blur-md sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="text-2xl leading-none">
            {dish.emoji}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-lg sm:text-xl font-semibold tracking-[-0.02em] text-[#1C1917]">
              {dish.name}
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#786E63]">
              Cook Mode · Step {clampedStep + 1} of {totalSteps}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wake Lock Pill */}
          {wakeLockSupported && (
            <button
              type="button"
              onClick={() => setWakeLockWanted((prev) => !prev)}
              aria-pressed={wakeLockActive}
              title={
                wakeLockActive
                  ? 'Screen wake lock active — tap to disable'
                  : 'Keep screen awake while cooking'
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                wakeLockActive
                  ? 'border-[#C7DEC4] bg-[#EEF7ED] text-[#285A24]'
                  : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#6B6258] hover:text-[#1C1917]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {wakeLockActive ? 'Screen Awake' : 'Keep Awake'}
              </span>
            </button>
          )}

          {/* Toggle Ingredients Drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
              drawerOpen
                ? 'border-[#1C1917] bg-[#1C1917] text-[#FFFDF9]'
                : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] hover:border-[#D9381E]/50 hover:bg-[#FFF5F0]'
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ingredients</span>
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                drawerOpen
                  ? 'bg-[#FFFDF9]/18 text-[#FFFDF9]'
                  : 'bg-[#EFE8DC] text-[#575049]'
              }`}
            >
              {checkedCount}/{dish.ingredients.length}
            </span>
          </button>

          {/* Exit Cook Mode */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit Cook Mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] transition-colors hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Persistent Active Timers Strip (stays visible across steps!) */}
      {activeTimers.length > 0 && (
        <div
          aria-label="Active cooking timers"
          className="shrink-0 border-b border-[#E6DDD0] bg-[#F5EFE5]/90 px-4 py-2.5 sm:px-7"
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2.5">
            {activeTimers.map((timer) => (
              <div
                key={timer.id}
                className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 shadow-xs transition-colors ${
                  timer.finished
                    ? 'animate-pulse border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                    : 'border-[#E2D6C5] bg-[#FFFDF9] text-[#1C1917]'
                }`}
              >
                {timer.finished ? (
                  <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Timer
                    className={`h-4 w-4 shrink-0 ${
                      timer.running ? 'text-[#D9381E]' : 'text-[#8A7E71]'
                    }`}
                    aria-hidden="true"
                  />
                )}

                <span className="font-mono text-base font-bold tracking-tight tabular-nums">
                  {timer.finished ? 'DONE!' : formatCountdown(timer.remainingMs)}
                </span>

                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    timer.finished ? 'text-[#FFE8E0]' : 'text-[#6B6258]'
                  }`}
                >
                  Step {timer.stepNumber} · {timer.label}
                </span>

                <div className="flex items-center gap-1 pl-1">
                  {!timer.finished && (
                    <button
                      type="button"
                      onClick={() => handleTogglePauseTimer(timer.id)}
                      aria-label={timer.running ? 'Pause timer' : 'Resume timer'}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF7F2] text-[#1C1917] transition-colors hover:bg-[#EFE8DC] cursor-pointer"
                    >
                      {timer.running ? (
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResetTimer(timer.id)}
                    aria-label="Reset timer"
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      timer.finished
                        ? 'bg-[#FFFDF9]/20 text-[#FFFDF9] hover:bg-[#FFFDF9]/30'
                        : 'bg-[#FAF7F2] text-[#6B6258] hover:bg-[#EFE8DC] hover:text-[#1C1917]'
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismissTimer(timer.id)}
                    aria-label="Dismiss timer"
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      timer.finished
                        ? 'bg-[#FFFDF9]/20 text-[#FFFDF9] hover:bg-[#FFFDF9]/30'
                        : 'bg-[#FAF7F2] text-[#6B6258] hover:bg-[#EFE8DC] hover:text-[#D9381E]'
                    }`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content + Optional Ingredients Drawer */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Giant Counter-Readable Step Canvas */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-8 sm:px-10 lg:px-16">
          <div className="w-full max-w-3xl space-y-7">
            {/* Step Number Pill & Clickable Step Dots */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F0D5C8] bg-[#FFF5F0] px-3.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#D9381E]">
                Step {clampedStep + 1} of {totalSteps}
              </span>

              <div
                className="flex items-center gap-1.5"
                role="tablist"
                aria-label="Jump to step"
              >
                {dish.steps.map((_, idx) => {
                  const isCurrent = idx === clampedStep;
                  const isDone = idx < clampedStep;
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Go to step ${idx + 1}`}
                      onClick={() => setCurrentStep(idx)}
                      className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                        isCurrent
                          ? 'w-7 bg-[#D9381E]'
                          : isDone
                            ? 'w-2.5 bg-[#D9381E]/45 hover:bg-[#D9381E]/75'
                            : 'w-2.5 bg-[#DDD3C5] hover:bg-[#C3B6A3]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* High-Contrast Giant Editorial Step Text */}
            <p className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-normal leading-relaxed tracking-[-0.015em] text-[#1C1917]">
              {stepText}
            </p>

            {/* Auto-Detected Inline Countdown Timer Chips */}
            {detectedTimers.length > 0 && (
              <div className="pt-1">
                <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A7E71]">
                  Detected Timers · Tap to Start
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {detectedTimers.map((detected) => (
                    <button
                      key={detected.key}
                      type="button"
                      onClick={() => handleStartTimer(detected)}
                      className="group inline-flex items-center gap-2.5 rounded-full border border-[#E2D6C5] bg-[#FFFDF9] px-4 py-2.5 text-sm font-semibold text-[#1C1917] shadow-[0_4px_14px_-6px_rgba(28,25,23,0.14)] transition-all hover:border-[#D9381E] hover:bg-[#FFF5F0] hover:text-[#D9381E] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                    >
                      <Timer
                        className="h-4 w-4 text-[#D9381E] transition-transform group-hover:scale-110"
                        aria-hidden="true"
                      />
                      <span>Start {detected.label}</span>
                      {detected.rangeNote && (
                        <span className="font-mono text-xs font-normal text-[#786E63]">
                          ({detected.rangeNote})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show Stanley's Tip subtly on the final step */}
            {isLastStep && dish.stanleysTip && (
              <div className="rounded-2xl border border-[#E6D8C6] border-l-4 border-l-[#D9381E] bg-[#F7EFE4] px-5 py-4">
                <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#B8321B]">
                  Stanley&apos;s Final Tip
                </p>
                <p className="text-sm sm:text-[15px] leading-relaxed text-[#3F3730]">
                  {dish.stanleysTip}
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Quick Toggleable Ingredients Drawer */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-10 bg-[#1C1917]/20 backdrop-blur-[1px] lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside
              aria-label="Scaled ingredients checklist"
              className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-[#E6DDD0] bg-[#FFFDF9] shadow-[-12px_0_32px_-16px_rgba(28,25,23,0.18)] lg:static lg:shadow-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#E6DDD0] px-5 py-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#1C1917]">
                    Ingredients
                  </h3>
                  <p className="font-mono text-[11px] text-[#786E63]">
                    {dish.baseServings * scale}{' '}
                    {dish.baseServings * scale === 1 ? 'serving' : 'servings'} ({scale}x)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Scale Switcher inside Drawer */}
                  <div
                    role="group"
                    aria-label="Scale ingredients in Cook Mode"
                    className="inline-flex items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5"
                  >
                    {SCALE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onChangeScale(option)}
                        aria-pressed={scale === option}
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                          scale === option
                            ? 'bg-[#D9381E] text-[#FFFDF9]'
                            : 'text-[#6B6258] hover:text-[#1C1917]'
                        }`}
                      >
                        {option}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close ingredients drawer"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B6258] hover:bg-[#FAF7F2] hover:text-[#1C1917] cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {checkedCount > 0 && (
                <div className="flex items-center justify-between border-b border-[#EFE8DC] bg-[#FAF7F2]/70 px-5 py-2 text-xs text-[#6B6258]">
                  <span>
                    {checkedCount} of {dish.ingredients.length} checked
                  </span>
                  <button
                    type="button"
                    onClick={onResetChecked}
                    className="inline-flex items-center gap-1 font-medium text-[#D9381E] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Reset
                  </button>
                </div>
              )}

              <ul className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                {dish.ingredients.map((ingredient) => {
                  const isChecked = Boolean(checkedMap[ingredient.id]);
                  const amountText = formatCulinaryAmount(ingredient.amount, scale);
                  const measurement = [amountText, ingredient.unit]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <li key={ingredient.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => onToggleIngredient(ingredient.id)}
                        className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FAF7F2] cursor-pointer"
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
                            isChecked
                              ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                              : 'border-[#CFC4B4] bg-[#FFFDF9]'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className="flex-1 text-sm leading-snug">
                          {measurement && (
                            <span
                              className={`mr-1.5 font-mono text-xs font-semibold ${
                                isChecked
                                  ? 'text-[#A69C90] line-through'
                                  : scale > 1 && ingredient.amount !== null
                                    ? 'text-[#D9381E]'
                                    : 'text-[#1C1917]'
                              }`}
                            >
                              {measurement}
                            </span>
                          )}
                          <span
                            className={
                              isChecked
                                ? 'text-[#A69C90] line-through'
                                : 'font-medium text-[#292524]'
                            }
                          >
                            {ingredient.name}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </>
        )}
      </div>

      {/* Bottom Touch-Friendly Step Controls */}
      <footer className="shrink-0 border-t border-[#E6DDD0] bg-[#FFFDF9]/95 px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-7">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={isFirstStep}
            className="inline-flex min-h-[52px] flex-1 sm:flex-initial sm:min-w-[164px] items-center justify-center gap-2 rounded-full border border-[#E2D6C5] bg-[#FAF7F2] px-5 py-3 text-sm sm:text-base font-semibold text-[#1C1917] transition-all hover:border-[#CFC4B4] hover:bg-[#EFE8DC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span>Previous</span>
          </button>

          <p className="hidden md:block font-mono text-[11px] tracking-[0.04em] text-[#8A7E71]">
            ← → Steps · I Ingredients · Esc Exit
          </p>

          {isLastStep ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[52px] flex-1 sm:flex-initial sm:min-w-[180px] items-center justify-center gap-2 rounded-full border border-[#B92D17] bg-[#D9381E] px-6 py-3 text-sm sm:text-base font-semibold text-[#FFFDF9] shadow-[0_8px_22px_-6px_rgba(217,56,30,0.48)] transition-all hover:bg-[#C33119] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              <span>Finish Cooking</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex min-h-[52px] flex-1 sm:flex-initial sm:min-w-[180px] items-center justify-center gap-2 rounded-full border border-[#B92D17] bg-[#D9381E] px-6 py-3 text-sm sm:text-base font-semibold text-[#FFFDF9] shadow-[0_8px_22px_-6px_rgba(217,56,30,0.48)] transition-all hover:bg-[#C33119] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <span>Next Step</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default CookModeModal;
