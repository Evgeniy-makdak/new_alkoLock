import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

import {
  getGhostPrankIdleDelayMs,
  readGhostPrankRuntimeEnabled,
  writeGhostPrankRuntimeEnabled,
} from '../config/eventsGhostPrankEnabled';
import styles from './EventsGhostPrank.module.scss';

const SPLATTER_CLEANUP_MS = 4500;
const DROP_COUNT = 72;

const RECEDE_MS = 780;
const CHARGE_MS = 880;
const IMPACT_MS = 280;
const RECOVER_MS = 620;
const SPARK_CLEANUP_MS = 1100;
const SPARK_COUNT = 40;
const CRACK_CLEANUP_MS = 3150;
const IMPACT_SLOGAN_CLEANUP_MS = 10400;
/** Пауза между циклами «блуждание → удар» (случайно в диапазоне), мс. Меньше — чаще врезания. */
const ATTACK_GAP_MIN_MS = 3200;
const ATTACK_GAP_MAX_MS = 8500;

/** Отключение «призрака» на тач-устройствах: удержание без движения */
const GHOST_LONG_PRESS_MS = 1200;
const GHOST_LONG_PRESS_MOVE_PX = 22;

const IDLE_MOUSEMOVE_THROTTLE_MS = 400;

type Phase = 'haunting' | 'splatter' | 'done';

type Edge = 'left' | 'right' | 'top' | 'bottom';
type Sp = { id: string; left: number; top: number; sx: number; sy: number; dur: number };
type GlassCrackBurst = {
  id: number;
  xPct: number;
  yPct: number;
  main: string[];
  hair: string[];
};
type ImpactSlogan = { id: number; left: number; top: number; dripPx: number; text: string };

function formatGhostImpactSlogan(t: TFunction): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${t('tooltips.ghostForeheadToday')} ${dd}.${mm} ${hh}:${mi}`;
}
type AttackMode = 'wander' | 'recede' | 'charge' | 'impact' | 'recover';

type BloodDrop = {
  id: number;
  left: number;
  top: number;
  burstX: number;
  burstY: number;
  drift: number;
  size: number;
  elongate: number;
  duration: number;
  delay: number;
  rotEnd: number;
};

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function buildWaypoints(count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: 0.06 + Math.random() * 0.88,
      y: 0.06 + Math.random() * 0.88,
    });
  }
  return out;
}

function randomEdge(): Edge {
  const edges: Edge[] = ['left', 'right', 'top', 'bottom'];
  return edges[Math.floor(Math.random() * edges.length)] as Edge;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function makeBloodDroplets(cx: number, cy: number, count: number): BloodDrop[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const burst = 28 + Math.random() * 140;
    const bx = Math.cos(angle) * burst * (0.45 + Math.random() * 0.55);
    const by = Math.sin(angle) * burst * (0.4 + Math.random() * 0.45);
    return {
      id: i,
      left: cx,
      top: cy,
      burstX: bx,
      burstY: by,
      drift: (Math.random() - 0.5) * 90 + Math.sin(angle) * 25,
      size: 2.5 + Math.random() * 10,
      elongate: 1.15 + Math.random() * 1.25,
      duration: 2.4 + Math.random() * 1.6,
      delay: Math.random() * 0.1,
      rotEnd: (Math.random() - 0.5) * 40,
    };
  });
}

function buildChargeTargets(edge: Edge, resumeX: number, resumeY: number) {
  const rx = clamp(resumeX, 0.14, 0.86);
  const ry = clamp(resumeY, 0.14, 0.86);
  const jitter = () => (Math.random() - 0.5) * 0.06;
  switch (edge) {
    case 'left':
      return {
        fromX: -0.22,
        fromY: clamp(ry + jitter(), 0.12, 0.88),
        toX: 0.05 + Math.random() * 0.03,
        toY: clamp(ry + jitter() * 0.5, 0.12, 0.88),
      };
    case 'right':
      return {
        fromX: 1.22,
        fromY: clamp(ry + jitter(), 0.12, 0.88),
        toX: 0.95 - Math.random() * 0.03,
        toY: clamp(ry + jitter() * 0.5, 0.12, 0.88),
      };
    case 'top':
      return {
        fromX: clamp(rx + jitter(), 0.12, 0.88),
        fromY: -0.22,
        toX: clamp(rx + jitter() * 0.5, 0.12, 0.88),
        toY: 0.07 + Math.random() * 0.03,
      };
    case 'bottom':
      return {
        fromX: clamp(rx + jitter(), 0.12, 0.88),
        fromY: 1.22,
        toX: clamp(rx + jitter() * 0.5, 0.12, 0.88),
        toY: 0.9 - Math.random() * 0.03,
      };
    default:
      return { fromX: -0.22, fromY: ry, toX: 0.05, toY: ry };
  }
}

function makeEyeSparks(
  leftEye: { x: number; y: number },
  rightEye: { x: number; y: number },
  edge: Edge,
): Sp[] {
  const iw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const ih = typeof window !== 'undefined' ? window.innerHeight : 768;
  /** Базовая дальность ~половина диагонали — искры долетают почти до краёв экрана */
  const reach = Math.hypot(iw, ih) * 0.5;

  const outwardBias = (): number => {
    switch (edge) {
      case 'left':
        return Math.PI * 0.15 + (Math.random() - 0.5) * 0.9;
      case 'right':
        return Math.PI * 0.85 + (Math.random() - 0.5) * 0.9;
      case 'top':
        return Math.PI * -0.35 + (Math.random() - 0.5) * 0.7;
      case 'bottom':
        return Math.PI * 0.35 + (Math.random() - 0.5) * 0.7;
      default:
        return Math.random() * Math.PI * 2;
    }
  };

  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const base = fromLeft ? leftEye : rightEye;
    const angle = outwardBias() + (Math.random() - 0.5) * 1.05;
    const dist = reach * (0.42 + Math.random() * 0.58);
    return {
      id: `sp-${i}-${Math.random().toString(36).slice(2, 9)}`,
      left: base.x,
      top: base.y,
      sx: Math.cos(angle) * dist,
      sy: Math.sin(angle) * dist + (Math.random() - 0.5) * reach * 0.12,
      dur: 0.58 + Math.random() * 0.5,
    };
  });
}

function createCrackRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildGlassCrackPaths(seed: number): { main: string[]; hair: string[] } {
  const rnd = createCrackRng(seed);
  const main: string[] = [];
  const hair: string[] = [];
  const rays = 8 + Math.floor(rnd() * 4);
  for (let i = 0; i < rays; i++) {
    let ang = (i / rays) * Math.PI * 2 + (rnd() - 0.5) * 0.55;
    let d = 'M 0 0';
    let x = 0;
    let y = 0;
    const steps = 12 + Math.floor(rnd() * 10);
    for (let s = 0; s < steps; s++) {
      const step = 2.8 + rnd() * 5.5;
      ang += (rnd() - 0.5) * 0.42;
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    main.push(d);
  }
  const hairs = 8 + Math.floor(rnd() * 5);
  for (let i = 0; i < hairs; i++) {
    const ang = rnd() * Math.PI * 2;
    const len = 12 + rnd() * 42;
    const w = (rnd() - 0.5) * 5;
    const x1 = Math.cos(ang) * len * 0.42 + w;
    const y1 = Math.sin(ang) * len * 0.42 - w * 0.3;
    const x2 = Math.cos(ang) * len;
    const y2 = Math.sin(ang) * len;
    hair.push(`M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }
  return { main, hair };
}

function rotForEdge(edge: Edge, chargeT: number): number {
  const lean = 12 * easeInCubic(chargeT);
  switch (edge) {
    case 'left':
      return lean;
    case 'right':
      return -lean;
    case 'top':
      return -8 + lean * 0.4;
    case 'bottom':
      return 8 - lean * 0.4;
    default:
      return 0;
  }
}

function isTypingTargetEl(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest('[contenteditable="true"]')) return true;
  return false;
}

export const EventsGhostPrank = () => {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const idleDelayMs = getGhostPrankIdleDelayMs();
  const idleLatchedRef = useRef(false);
  const idleArmRef = useRef<(() => void) | null>(null);
  /** После splatter на десктопе — снова ждать простоя (скринсейвер). На таче не выставляется. */
  const pendingRestartIdleAfterSplatterRef = useRef(false);
  const [runtimeEnabled, setRuntimeEnabled] = useState(readGhostPrankRuntimeEnabled);
  const [idleReady, setIdleReady] = useState(() => idleDelayMs === 0);
  const [phase, setPhase] = useState<Phase>(() => {
    const enabled = readGhostPrankRuntimeEnabled();
    if (!enabled) return 'done';
    return idleDelayMs === 0 ? 'haunting' : 'done';
  });
  const [transform, setTransform] = useState(
    'translate(0vw, 0vh) translate(-50%, -50%) rotate(0deg) skewX(0deg) scale(1)',
  );
  const [droplets, setDroplets] = useState<BloodDrop[]>([]);
  const [flashPos, setFlashPos] = useState<{ x: string; y: string } | null>(null);
  const [faceAngry, setFaceAngry] = useState(false);
  const [screenBump, setScreenBump] = useState(0);
  const [sparks, setSparks] = useState<Sp[]>([]);
  const [glassCrack, setGlassCrack] = useState<GlassCrackBurst | null>(null);
  const [impactSlogan, setImpactSlogan] = useState<ImpactSlogan | null>(null);
  const crackSeqRef = useRef(0);
  const sloganSeqRef = useRef(0);
  const skipNextGhostClickRef = useRef(false);
  const ghostLongPressTimerRef = useRef<number | null>(null);
  const ghostLongPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  /** Пока палец на призраке — анимация паузится, не нужно «гоняться» за ним при long-press */
  const ghostTouchHoldRef = useRef(false);
  const ghostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const waypointsRef = useRef(buildWaypoints(12));
  const reducedMotionRef = useRef(false);
  const attackRef = useRef({
    mode: 'wander' as AttackMode,
    phaseStartMs: 0,
    nextAttackAtMs: 0,
    edge: 'left' as Edge,
    hitX: 0,
    hitY: 0,
    chargeFromX: 0,
    chargeFromY: 0,
    chargeToX: 0,
    chargeToY: 0,
    resumeX: 0.5,
    resumeY: 0.5,
    recoverStartX: 0,
    recoverStartY: 0,
    recoverStartScale: 1,
    recoverStartRot: 0,
    impactEndX: 0,
    impactEndY: 0,
    impactEndScale: 1,
    impactEndRot: 0,
  });

  const [coarsePointer, setCoarsePointer] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const onChange = () => setCoarsePointer(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const coarsePointerRef = useRef(coarsePointer);
  coarsePointerRef.current = coarsePointer;

  const clearGhostLongPressTimer = () => {
    const id = ghostLongPressTimerRef.current;
    if (id !== null) {
      window.clearTimeout(id);
      ghostLongPressTimerRef.current = null;
    }
    ghostLongPressOriginRef.current = null;
  };

  const endGhostTouch = () => {
    ghostTouchHoldRef.current = false;
    clearGhostLongPressTimer();
  };

  useEffect(() => () => clearGhostLongPressTimer(), []);

  /** Простой как у скринсейвера: первый показ только после тишины в окне (пока страница «События» открыта). */
  useEffect(() => {
    if (!runtimeEnabled) {
      idleLatchedRef.current = false;
      setIdleReady(false);
      return undefined;
    }

    if (idleDelayMs === 0) {
      idleLatchedRef.current = true;
      setIdleReady(true);
      return undefined;
    }

    let timeoutId: number | null = null;
    let lastMouseMoveReset = 0;

    const fireIdle = () => {
      idleLatchedRef.current = true;
      setIdleReady(true);
    };

    const arm = () => {
      if (idleLatchedRef.current) return;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      setIdleReady(false);
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        fireIdle();
      }, idleDelayMs);
    };

    idleArmRef.current = arm;

    const onActivity = () => {
      if (idleLatchedRef.current) return;
      arm();
    };

    const onMouseMove = () => {
      if (idleLatchedRef.current) return;
      const now = Date.now();
      if (now - lastMouseMoveReset < IDLE_MOUSEMOVE_THROTTLE_MS) return;
      lastMouseMoveReset = now;
      arm();
    };

    arm();

    window.addEventListener('pointerdown', onActivity, { capture: true, passive: true });
    window.addEventListener('keydown', onActivity, true);
    window.addEventListener('wheel', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { capture: true, passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onActivity, { capture: true, passive: true });

    return () => {
      idleArmRef.current = null;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', onActivity, true);
      window.removeEventListener('keydown', onActivity, true);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('scroll', onActivity, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onActivity, true);
    };
  }, [idleDelayMs, runtimeEnabled]);

  const applySplatterAtScreenPoint = (cx: number, cy: number, restartDesktopIdleCycle: boolean) => {
    if (restartDesktopIdleCycle) {
      pendingRestartIdleAfterSplatterRef.current = true;
    }

    setFlashPos({
      x: `${cx}px`,
      y: `${cy}px`,
    });
    window.setTimeout(() => setFlashPos(null), 240);

    const iw = window.innerWidth || 1;
    const ih = window.innerHeight || 1;
    crackSeqRef.current += 1;
    setGlassCrack({
      id: crackSeqRef.current,
      xPct: (cx / iw) * 100,
      yPct: (cy / ih) * 100,
      ...buildGlassCrackPaths(crackSeqRef.current * 11003 + Math.floor(performance.now())),
    });

    setSparks([]);
    setDroplets(makeBloodDroplets(cx, cy, DROP_COUNT));
    setPhase('splatter');
  };

  /** Десктоп: как скринсейвер — движение мыши или стрелки снимают призрака со splatter и запускают новый цикл простоя. */
  useEffect(() => {
    if (coarsePointer) return undefined;
    if (!runtimeEnabled || phase !== 'haunting') return undefined;

    const burstFromGhostCenter = () => {
      const el = ghostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      applySplatterAtScreenPoint(cx, cy, true);
    };

    window.addEventListener('mousemove', burstFromGhostCenter, { passive: true });
    return () => window.removeEventListener('mousemove', burstFromGhostCenter);
  }, [coarsePointer, runtimeEnabled, phase]);

  useEffect(() => {
    if (coarsePointer) return undefined;
    if (!runtimeEnabled || phase !== 'haunting') return undefined;

    const onArrowKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(e.key)) return;
      if (isTypingTargetEl(e.target)) return;
      e.preventDefault();
      const el = ghostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      applySplatterAtScreenPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    };

    window.addEventListener('keydown', onArrowKey, true);
    return () => window.removeEventListener('keydown', onArrowKey, true);
  }, [coarsePointer, runtimeEnabled, phase]);

  /** После splatter на десктопе снова отсчитываем простой до следующего появления. */
  useEffect(() => {
    if (phase !== 'done') return;
    if (!pendingRestartIdleAfterSplatterRef.current) return;
    pendingRestartIdleAfterSplatterRef.current = false;
    if (coarsePointerRef.current || !runtimeEnabled) return;

    idleLatchedRef.current = false;
    setIdleReady(false);

    if (idleDelayMs === 0) {
      queueMicrotask(() => {
        idleLatchedRef.current = true;
        setIdleReady(true);
      });
    } else {
      queueMicrotask(() => idleArmRef.current?.());
    }
  }, [phase, runtimeEnabled, idleDelayMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      /* Физические клавиши (раскладка не важна). Ctrl+Shift+G в Chrome — поиск. */
      const ctrl = e.ctrlKey && !e.metaKey;
      const isToggle = (e.code === 'KeyB' || e.code === 'KeyH') && ctrl && e.altKey && e.shiftKey;
      if (!isToggle) return;

      if (isTypingTargetEl(e.target)) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      setRuntimeEnabled((prev) => {
        const next = !prev;
        writeGhostPrankRuntimeEnabled(next);
        return next;
      });
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  useEffect(() => {
    if (!runtimeEnabled) {
      setPhase('done');
      setDroplets([]);
      setFlashPos(null);
      setFaceAngry(false);
      setSparks([]);
      setGlassCrack(null);
      setImpactSlogan(null);
      return;
    }
    if (!idleReady) {
      setPhase('done');
      setDroplets([]);
      setFlashPos(null);
      setFaceAngry(false);
      setSparks([]);
      setGlassCrack(null);
      setImpactSlogan(null);
      return;
    }
    setPhase('haunting');
    waypointsRef.current = buildWaypoints(12);
    setDroplets([]);
    setFlashPos(null);
    setFaceAngry(false);
    setSparks([]);
    setGlassCrack(null);
    setImpactSlogan(null);
    setTransform('translate(0vw, 0vh) translate(-50%, -50%) rotate(0deg) skewX(0deg) scale(1)');
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    attackRef.current.mode = 'wander';
  }, [runtimeEnabled, idleReady]);

  useEffect(() => {
    if (phase !== 'splatter' || droplets.length === 0) return undefined;
    const t = window.setTimeout(() => setPhase('done'), SPLATTER_CLEANUP_MS);
    return () => window.clearTimeout(t);
  }, [phase, droplets.length]);

  /** Повторный запуск анимации «удара» по экрану (сброс класса) */
  useEffect(() => {
    if (screenBump === 0 || !rootRef.current) return;
    const el = rootRef.current;
    el.classList.remove(styles.screenShake);
    void el.offsetWidth;
    el.classList.add(styles.screenShake);
  }, [screenBump]);

  useEffect(() => {
    if (sparks.length === 0) return undefined;
    const id = window.setTimeout(() => setSparks([]), SPARK_CLEANUP_MS);
    return () => window.clearTimeout(id);
  }, [sparks]);

  useEffect(() => {
    if (!glassCrack) return undefined;
    const id = window.setTimeout(() => setGlassCrack(null), CRACK_CLEANUP_MS);
    return () => window.clearTimeout(id);
  }, [glassCrack]);

  useEffect(() => {
    if (!impactSlogan) return undefined;
    const id = window.setTimeout(() => setImpactSlogan(null), IMPACT_SLOGAN_CLEANUP_MS);
    return () => window.clearTimeout(id);
  }, [impactSlogan]);

  useEffect(() => {
    if (!runtimeEnabled || phase !== 'haunting') return undefined;

    const entranceStart = { x: -0.08, y: 1.08 };
    const firstTarget = waypointsRef.current[0];
    const entranceMs = 1200;
    const segmentMs = 950 + Math.random() * 450;
    const waypoints = waypointsRef.current;
    const a = attackRef.current;
    a.nextAttackAtMs =
      performance.now() +
      ATTACK_GAP_MIN_MS +
      Math.random() * (ATTACK_GAP_MAX_MS - ATTACK_GAP_MIN_MS);
    let raf = 0;
    const wanderT0Ref = { current: performance.now() };

    const triggerImpactFx = () => {
      setScreenBump((n) => n + 1);
      const el = ghostRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const iw = window.innerWidth || 1;
        const ih = window.innerHeight || 1;
        crackSeqRef.current += 1;
        const crackSeed = crackSeqRef.current * 7919 + Math.floor(performance.now());
        setGlassCrack({
          id: crackSeqRef.current,
          xPct: (cx / iw) * 100,
          yPct: (cy / ih) * 100,
          ...buildGlassCrackPaths(crackSeed),
        });
        const leftEye = { x: r.left + r.width * 0.36, y: r.top + r.height * 0.35 };
        const rightEye = { x: r.left + r.width * 0.64, y: r.top + r.height * 0.35 };
        setSparks(makeEyeSparks(leftEye, rightEye, a.edge));
        sloganSeqRef.current += 1;
        setImpactSlogan({
          id: sloganSeqRef.current,
          left: cx,
          top: cy,
          dripPx: Math.max(ih - cy + 140, ih * 0.58),
          text: formatGhostImpactSlogan(tRef.current),
        });
      }
    };

    const beginAttack = (now: number, nx: number, ny: number) => {
      setFaceAngry(false);
      a.mode = 'recede';
      a.phaseStartMs = now;
      a.edge = randomEdge();
      a.resumeX = nx;
      a.resumeY = ny;
      const tgt = buildChargeTargets(a.edge, nx, ny);
      a.chargeToX = tgt.toX;
      a.chargeToY = tgt.toY;
    };

    const tick = (now: number) => {
      if (ghostTouchHoldRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const reduce = reducedMotionRef.current;
      let nx: number;
      let ny: number;
      let rot: number;
      let scale = 1;
      let wobbleX = 0;
      let wobbleY = 0;
      let skewX = 0;

      if (a.mode === 'wander') {
        wobbleX = Math.sin(now / 380) * 0.9;
        wobbleY = Math.cos(now / 490) * 0.85;

        const elapsed = now - wanderT0Ref.current;
        if (elapsed < entranceMs) {
          const te = easeInOutSine(elapsed / entranceMs);
          nx = entranceStart.x + (firstTarget.x - entranceStart.x) * te;
          ny = entranceStart.y + (firstTarget.y - entranceStart.y) * te;
          rot = -10 + te * 15;
        } else {
          const wanderT = elapsed - entranceMs;
          const totalSeg = segmentMs * waypoints.length;
          const cycle = wanderT % totalSeg;
          const segIdx = Math.min(waypoints.length - 1, Math.floor(cycle / segmentMs));
          const localT = easeInOutSine((cycle % segmentMs) / segmentMs);
          const p = waypoints[segIdx];
          const q = waypoints[(segIdx + 1) % waypoints.length];
          nx = p.x + (q.x - p.x) * localT;
          ny = p.y + (q.y - p.y) * localT;
          rot = Math.sin(now / 720) * 18 + Math.cos(now / 980) * 8;
        }

        if (!reduce && elapsed >= entranceMs && now >= a.nextAttackAtMs) {
          beginAttack(now, nx, ny);
          raf = requestAnimationFrame(tick);
          return;
        }

        const xVw = nx * 100 + wobbleX;
        const yVh = ny * 100 + wobbleY;
        setTransform(
          `translate(${xVw}vw, ${yVh}vh) translate(-50%, -50%) rotate(${rot}deg) skewX(${skewX}deg) scale(${scale})`,
        );
        raf = requestAnimationFrame(tick);
        return;
      }

      if (a.mode === 'recede') {
        const dt = now - a.phaseStartMs;
        const t = Math.min(1, dt / RECEDE_MS);
        const e = easeInOutSine(t);
        let pullX = 0;
        let pullY = 0;
        switch (a.edge) {
          case 'left':
            pullX = -0.09 * e;
            break;
          case 'right':
            pullX = 0.09 * e;
            break;
          case 'top':
            pullY = -0.09 * e;
            break;
          case 'bottom':
            pullY = 0.09 * e;
            break;
          default:
            break;
        }
        nx = a.resumeX + pullX;
        ny = a.resumeY + pullY;
        scale = 1 + (0.14 - 1) * e;
        rot = Math.sin(now / 620) * (10 * (1 - e));
        if (t >= 1) {
          a.chargeFromX = nx;
          a.chargeFromY = ny;
          a.mode = 'charge';
          a.phaseStartMs = now;
          setFaceAngry(true);
        }
        setTransform(
          `translate(${nx * 100}vw, ${ny * 100}vh) translate(-50%, -50%) rotate(${rot}deg) skewX(${skewX}deg) scale(${scale})`,
        );
        raf = requestAnimationFrame(tick);
        return;
      }

      if (a.mode === 'charge') {
        const dt = now - a.phaseStartMs;
        const t = Math.min(1, dt / CHARGE_MS);
        const e = easeInCubic(t);
        nx = a.chargeFromX + (a.chargeToX - a.chargeFromX) * e;
        ny = a.chargeFromY + (a.chargeToY - a.chargeFromY) * e;
        scale = 0.14 + 0.86 * e;
        rot = rotForEdge(a.edge, t);
        const gust = Math.sin(now / 26) * (1 - e) * 5 + Math.sin(now / 41 + 1.2) * (1 - e) * 4;
        skewX =
          (a.edge === 'left' || a.edge === 'right' ? -1 : 1) * (6 * easeInCubic(t) + gust * 0.35);
        if (a.edge === 'top' || a.edge === 'bottom') {
          skewX = gust * 0.9 + (a.edge === 'top' ? -4 : 4) * easeInCubic(t);
        }
        if (t >= 1) {
          a.hitX = a.chargeToX;
          a.hitY = a.chargeToY;
          a.mode = 'impact';
          a.phaseStartMs = now;
          triggerImpactFx();
        }
        setTransform(
          `translate(${nx * 100}vw, ${ny * 100}vh) translate(-50%, -50%) rotate(${rot}deg) skewX(${skewX}deg) scale(${scale})`,
        );
        raf = requestAnimationFrame(tick);
        return;
      }

      if (a.mode === 'impact') {
        const dt = now - a.phaseStartMs;
        const t = Math.min(1, dt / IMPACT_MS);
        const recoil = Math.sin(Math.PI * t);
        let pushX = 0;
        let pushY = 0;
        switch (a.edge) {
          case 'left':
            pushX = 0.08 * recoil;
            break;
          case 'right':
            pushX = -0.08 * recoil;
            break;
          case 'top':
            pushY = 0.07 * recoil;
            break;
          case 'bottom':
            pushY = -0.07 * recoil;
            break;
          default:
            break;
        }
        nx = a.hitX + pushX;
        ny = a.hitY + pushY;
        scale = 1 + 0.14 * recoil * (1 - t * 0.5);
        skewX = -10 * recoil * (1 - t) * (a.edge === 'left' || a.edge === 'right' ? 1 : 0.4);
        rot =
          rotForEdge(a.edge, 1) +
          (a.edge === 'left' || a.edge === 'right' ? -6 : 4) * recoil * (1 - t);
        if (t >= 1) {
          a.impactEndX = nx;
          a.impactEndY = ny;
          a.impactEndScale = scale;
          a.impactEndRot = rot;
          a.recoverStartX = nx;
          a.recoverStartY = ny;
          a.recoverStartScale = scale;
          a.recoverStartRot = rot;
          a.mode = 'recover';
          a.phaseStartMs = now;
        }
        setTransform(
          `translate(${nx * 100}vw, ${ny * 100}vh) translate(-50%, -50%) rotate(${rot}deg) skewX(${skewX}deg) scale(${scale})`,
        );
        raf = requestAnimationFrame(tick);
        return;
      }

      if (a.mode === 'recover') {
        const dt = now - a.phaseStartMs;
        const t = Math.min(1, dt / RECOVER_MS);
        const e = easeOutCubic(t);
        nx = a.recoverStartX + (a.resumeX - a.recoverStartX) * e;
        ny = a.recoverStartY + (a.resumeY - a.recoverStartY) * e;
        scale = a.recoverStartScale + (1 - a.recoverStartScale) * e;
        const wanderRot = Math.sin(now / 720) * 18 + Math.cos(now / 980) * 8;
        skewX = (1 - e) * -7;
        rot = a.recoverStartRot + (wanderRot - a.recoverStartRot) * e;
        if (t >= 1) {
          a.mode = 'wander';
          a.nextAttackAtMs =
            now + ATTACK_GAP_MIN_MS + Math.random() * (ATTACK_GAP_MAX_MS - ATTACK_GAP_MIN_MS);
          waypointsRef.current[0] = { x: a.resumeX, y: a.resumeY };
          wanderT0Ref.current = now - entranceMs;
          setFaceAngry(false);
        }
        wobbleX = Math.sin(now / 380) * 0.9 * e;
        wobbleY = Math.cos(now / 490) * 0.85 * e;
        setTransform(
          `translate(${nx * 100 + wobbleX}vw, ${ny * 100 + wobbleY}vh) translate(-50%, -50%) rotate(${rot}deg) skewX(${skewX}deg) scale(${scale})`,
        );
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, runtimeEnabled]);

  const onGhostClick = (e: React.MouseEvent) => {
    if (skipNextGhostClickRef.current) {
      skipNextGhostClickRef.current = false;
      e.preventDefault();
      return;
    }
    const el = ghostRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : e.clientX;
    const cy = rect ? rect.top + rect.height / 2 : e.clientY;
    /* Десктоп: как со скринсейвера — после «лопания» снова ждём простоя; мобильный: один проход как раньше */
    applySplatterAtScreenPoint(cx, cy, !coarsePointerRef.current);
  };

  if (!runtimeEnabled) return null;
  if (phase === 'done') return null;

  return (
    <div ref={rootRef} className={styles.root} aria-hidden>
      {glassCrack ? (
        <svg
          className={styles.crackSvg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden>
          <g transform={`translate(${glassCrack.xPct} ${glassCrack.yPct})`}>
            {glassCrack.main.map((d, i) => (
              <path key={`m-${glassCrack.id}-${i}`} className={styles.crackPath} d={d} />
            ))}
            {glassCrack.hair.map((d, i) => (
              <path key={`h-${glassCrack.id}-${i}`} className={styles.crackPathHair} d={d} />
            ))}
          </g>
        </svg>
      ) : null}

      {flashPos ? (
        <div
          className={styles.flash}
          style={
            {
              '--flash-x': flashPos.x,
              '--flash-y': flashPos.y,
            } as React.CSSProperties
          }
        />
      ) : null}

      {typeof document !== 'undefined' && (sparks.length > 0 || impactSlogan)
        ? createPortal(
            <div className={styles.sparkLayer} aria-hidden>
              {sparks.map((s) => (
                <span
                  key={s.id}
                  className={styles.spark}
                  style={
                    {
                      left: s.left,
                      top: s.top,
                      ['--sx' as string]: `${s.sx}px`,
                      ['--sy' as string]: `${s.sy}px`,
                      animationDuration: `${s.dur}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {impactSlogan ? (
                <div
                  key={impactSlogan.id}
                  className={styles.impactSlogan}
                  style={
                    {
                      left: impactSlogan.left,
                      top: impactSlogan.top,
                      ['--drip-end' as string]: `${impactSlogan.dripPx}px`,
                    } as React.CSSProperties
                  }>
                  {impactSlogan.text}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {phase === 'haunting' ? (
        <div
          className={styles.ghost}
          style={{ transform }}
          onClick={onGhostClick}
          onTouchStart={(e) => {
            if (e.touches.length !== 1) return;
            ghostTouchHoldRef.current = true;
            clearGhostLongPressTimer();
            skipNextGhostClickRef.current = false;
            const touch = e.touches[0];
            ghostLongPressOriginRef.current = { x: touch.clientX, y: touch.clientY };
            ghostLongPressTimerRef.current = window.setTimeout(() => {
              ghostLongPressTimerRef.current = null;
              ghostLongPressOriginRef.current = null;
              skipNextGhostClickRef.current = true;
              ghostTouchHoldRef.current = false;
              writeGhostPrankRuntimeEnabled(false);
              setRuntimeEnabled(false);
            }, GHOST_LONG_PRESS_MS);
          }}
          onTouchMove={(e) => {
            if (!ghostLongPressTimerRef.current || !ghostLongPressOriginRef.current) return;
            const touch = e.touches[0];
            const ox = ghostLongPressOriginRef.current.x;
            const oy = ghostLongPressOriginRef.current.y;
            const dx = touch.clientX - ox;
            const dy = touch.clientY - oy;
            if (dx * dx + dy * dy > GHOST_LONG_PRESS_MOVE_PX * GHOST_LONG_PRESS_MOVE_PX) {
              clearGhostLongPressTimer();
            }
          }}
          onTouchEnd={endGhostTouch}
          onTouchCancel={endGhostTouch}
          role="presentation"
          title={coarsePointer ? t('tooltips.ghostPrankMobile') : t('tooltips.ghostPrank')}>
          <div ref={ghostRef} className={styles.ghostCore}>
            <svg className={styles.svg} viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="eventsGhostGlow" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fafafa" />
                  <stop offset="100%" stopColor="#e8e8f0" />
                </radialGradient>
              </defs>
              <path
                fill="url(#eventsGhostGlow)"
                d="M100 28c-48 0-78 38-78 88v92c0 18 16 28 32 22 14-5 22-18 30-28 8 12 20 28 40 28s32-16 40-28c8 10 16 23 30 28 16 6 32-4 32-22v-92c0-50-30-88-78-88z"
              />
              <path
                fill="#ebe8f2"
                opacity="0.72"
                d="M42 180c-6 28 28 42 48 22l10-12c16 18 44 18 60 0l10 12c20 20 54 6 48-22v-18c-42 22-88 22-128 0l-48 18z"
              />
              <g className={styles.moodNormal} style={{ opacity: faceAngry ? 0 : 1 }}>
                <ellipse cx="72" cy="98" rx="14" ry="20" fill="#1a1a24" />
                <ellipse cx="128" cy="98" rx="14" ry="20" fill="#1a1a24" />
                <ellipse cx="76" cy="94" rx="5" ry="7" fill="#fff" opacity="0.5" />
                <ellipse cx="132" cy="94" rx="5" ry="7" fill="#fff" opacity="0.5" />
                <g className={`${styles.ghostMouth} ${!faceAngry ? styles.ghostMouthWander : ''}`}>
                  {/* Рот как у «злого»: тёмная полость + обводка; при блуждании анимируется scaleY */}
                  <path
                    fill="#2a222c"
                    stroke="#14141c"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    d="M 80 136 C 80 127 88 122 100 122 C 112 122 120 127 120 136 C 120 146 110 155 100 157 C 90 155 80 146 80 136 Z"
                  />
                  <path
                    d="M 86 128 Q 100 120 114 128"
                    fill="none"
                    stroke="#1a1a24"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 89 127 L 89 130 M 95 126 L 95 130 M 101 126 L 101 130 M 107 126 L 107 130 M 113 127 L 113 130"
                    stroke="#f0eef8"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                    opacity="0.82"
                  />
                </g>
              </g>
              <g className={styles.moodAngry} style={{ opacity: faceAngry ? 1 : 0 }}>
                <path
                  d="M52 82 L88 94"
                  stroke="#1a1a24"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M148 82 L112 94"
                  stroke="#1a1a24"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse cx="72" cy="104" rx="13" ry="9" fill="#2a1018" />
                <ellipse cx="128" cy="104" rx="13" ry="9" fill="#2a1018" />
                <ellipse cx="70" cy="102" rx="4" ry="3" fill="#c62828" opacity="0.85" />
                <ellipse cx="126" cy="102" rx="4" ry="3" fill="#c62828" opacity="0.85" />
                <path
                  d="M76 148 Q100 128 124 148"
                  stroke="#1a1a24"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M88 154 L94 162 M100 154 L100 164 M112 154 L106 162"
                  stroke="#1a1a24"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
        </div>
      ) : null}

      {phase === 'splatter' ? (
        <div className={styles.splatterLayer}>
          {droplets.map((d) => (
            <span
              key={d.id}
              className={styles.bloodDrop}
              style={
                {
                  left: d.left,
                  top: d.top,
                  width: d.size,
                  height: d.size * d.elongate,
                  ['--bx' as string]: `${d.burstX}px`,
                  ['--by' as string]: `${d.burstY}px`,
                  ['--drift' as string]: `${d.drift}px`,
                  ['--rot-end' as string]: `${d.rotEnd}deg`,
                  animationDuration: `${d.duration}s`,
                  animationDelay: `${d.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
