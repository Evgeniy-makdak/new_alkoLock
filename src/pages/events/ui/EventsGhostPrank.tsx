import { useEffect, useRef, useState } from 'react';

import {
  readGhostPrankRuntimeEnabled,
  writeGhostPrankRuntimeEnabled,
} from '../config/eventsGhostPrankEnabled';
import styles from './EventsGhostPrank.module.scss';

const SPLATTER_CLEANUP_MS = 4500;
const DROP_COUNT = 72;

type Phase = 'haunting' | 'splatter' | 'done';

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

export const EventsGhostPrank = () => {
  const [runtimeEnabled, setRuntimeEnabled] = useState(readGhostPrankRuntimeEnabled);
  const [phase, setPhase] = useState<Phase>(() =>
    readGhostPrankRuntimeEnabled() ? 'haunting' : 'done',
  );
  const [transform, setTransform] = useState('translate(0vw, 0vh)');
  const [droplets, setDroplets] = useState<BloodDrop[]>([]);
  const [flashPos, setFlashPos] = useState<{ x: string; y: string } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const waypointsRef = useRef(buildWaypoints(12));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.ctrlKey &&
        e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key.toLowerCase() === 'g' &&
        !e.repeat
      ) {
        e.preventDefault();
        setRuntimeEnabled((prev) => {
          const next = !prev;
          writeGhostPrankRuntimeEnabled(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey, { capture: false });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (runtimeEnabled) {
      setPhase('haunting');
      waypointsRef.current = buildWaypoints(12);
      setDroplets([]);
      setFlashPos(null);
      setTransform('translate(0vw, 0vh)');
    } else {
      setPhase('done');
      setDroplets([]);
      setFlashPos(null);
    }
  }, [runtimeEnabled]);

  useEffect(() => {
    if (phase !== 'splatter' || droplets.length === 0) return undefined;
    const t = window.setTimeout(() => setPhase('done'), SPLATTER_CLEANUP_MS);
    return () => window.clearTimeout(t);
  }, [phase, droplets.length]);

  useEffect(() => {
    if (!runtimeEnabled || phase !== 'haunting') return undefined;

    const entranceStart = { x: -0.08, y: 1.08 };
    const firstTarget = waypointsRef.current[0];
    const entranceMs = 1200;
    const segmentMs = 950 + Math.random() * 450;
    const waypoints = waypointsRef.current;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const wobbleX = Math.sin(now / 380) * 0.9;
      const wobbleY = Math.cos(now / 490) * 0.85;

      const elapsed = now - t0;
      let nx: number;
      let ny: number;
      let rot: number;

      if (elapsed < entranceMs) {
        const t = easeInOutSine(elapsed / entranceMs);
        nx = entranceStart.x + (firstTarget.x - entranceStart.x) * t;
        ny = entranceStart.y + (firstTarget.y - entranceStart.y) * t;
        rot = -10 + t * 15;
      } else {
        const wanderT = elapsed - entranceMs;
        const totalSeg = segmentMs * waypoints.length;
        const cycle = wanderT % totalSeg;
        const segIdx = Math.min(waypoints.length - 1, Math.floor(cycle / segmentMs));
        const localT = easeInOutSine((cycle % segmentMs) / segmentMs);
        const a = waypoints[segIdx];
        const b = waypoints[(segIdx + 1) % waypoints.length];
        nx = a.x + (b.x - a.x) * localT;
        ny = a.y + (b.y - a.y) * localT;
        rot = Math.sin(now / 720) * 18 + Math.cos(now / 980) * 8;
      }

      const xVw = nx * 100 + wobbleX;
      const yVh = ny * 100 + wobbleY;
      setTransform(`translate(${xVw}vw, ${yVh}vh) translate(-50%, -50%) rotate(${rot}deg)`);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, runtimeEnabled]);

  const onGhostClick = (e: React.MouseEvent) => {
    const el = ghostRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : e.clientX;
    const cy = rect ? rect.top + rect.height / 2 : e.clientY;

    setFlashPos({
      x: `${cx}px`,
      y: `${cy}px`,
    });
    window.setTimeout(() => setFlashPos(null), 240);

    setDroplets(makeBloodDroplets(cx, cy, DROP_COUNT));
    setPhase('splatter');
  };

  if (!runtimeEnabled) return null;
  if (phase === 'done') return null;

  return (
    <div className={styles.root} aria-hidden>
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

      {phase === 'haunting' ? (
        <div
          ref={ghostRef}
          className={styles.ghost}
          style={{ transform }}
          onClick={onGhostClick}
          role="presentation"
          title="Бу!">
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
              fill="#f5f5fa"
              opacity="0.95"
              d="M42 180c-6 28 28 42 48 22l10-12c16 18 44 18 60 0l10 12c20 20 54 6 48-22v-18c-42 22-88 22-128 0l-48 18z"
            />
            <ellipse cx="72" cy="98" rx="14" ry="20" fill="#1a1a24" />
            <ellipse cx="128" cy="98" rx="14" ry="20" fill="#1a1a24" />
            <ellipse cx="76" cy="94" rx="5" ry="7" fill="#fff" opacity="0.5" />
            <ellipse cx="132" cy="94" rx="5" ry="7" fill="#fff" opacity="0.5" />
          </svg>
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
