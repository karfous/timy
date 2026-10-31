import React, { useRef, useState, useEffect } from 'react';

interface CircularTimeInputProps {
  label: string;
  valueSec: number;
  onChange: (newTotalSec: number) => void;
  minSec?: number;
  maxMinutes?: number;
  accentColorVar?: string;
}

type ActiveRing = 'minutes' | 'seconds' | null;

export const CircularTimeInput: React.FC<CircularTimeInputProps> = ({
  label,
  valueSec,
  onChange,
  minSec = 0,
  maxMinutes = 60,
  accentColorVar = 'var(--accent-primary)',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingRing, setDraggingRing] = useState<ActiveRing>(null);
  const [rawSecText, setRawSecText] = useState<string>(String(valueSec));
  const [isEditingRaw, setIsEditingRaw] = useState(false);

  const minutes = Math.min(maxMinutes, Math.floor(valueSec / 60));
  const seconds = valueSec % 60;

  useEffect(() => {
    if (!isEditingRaw) {
      setRawSecText(String(valueSec));
    }
  }, [valueSec, isEditingRaw]);

  const size = 216;
  const center = size / 2;
  const outerRadius = 86; // Minutes ring
  const innerRadius = 58; // Seconds ring
  const splitRadius = (outerRadius + innerRadius) / 2; // 72

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const minFraction = Math.min(1, Math.max(0, minutes / maxMinutes));
  const secFraction = Math.min(1, Math.max(0, seconds / 60));

  const outerDashOffset = outerCircumference * (1 - minFraction);
  const innerDashOffset = innerCircumference * (1 - secFraction);

  const angleFromFraction = (fraction: number) => fraction * 2 * Math.PI - Math.PI / 2;

  const outerThumbAngle = angleFromFraction(minFraction);
  const outerThumbX = center + outerRadius * Math.cos(outerThumbAngle);
  const outerThumbY = center + outerRadius * Math.sin(outerThumbAngle);

  const innerThumbAngle = angleFromFraction(secFraction);
  const innerThumbX = center + innerRadius * Math.cos(innerThumbAngle);
  const innerThumbY = center + innerRadius * Math.sin(innerThumbAngle);

  const commitChange = (nextMin: number, nextSec: number) => {
    const clampedMin = Math.max(0, Math.min(maxMinutes, Math.round(nextMin)));
    const clampedSec = Math.max(0, Math.min(59, Math.round(nextSec)));
    const total = Math.max(minSec, clampedMin * 60 + clampedSec);
    onChange(total);
  };

  const updateFromPointer = (clientX: number, clientY: number, ring: ActiveRing) => {
    if (!svgRef.current || !ring) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const x = (clientX - rect.left) * scaleX - center;
    const y = (clientY - rect.top) * scaleY - center;

    // Angle from top (12 o'clock = 0, clockwise = 0..1)
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    const fraction = angle / (2 * Math.PI);

    if (ring === 'minutes') {
      const nextMin = Math.round(fraction * maxMinutes) % (maxMinutes + 1);
      commitChange(nextMin, seconds);
    } else if (ring === 'seconds') {
      const nextSec = Math.round(fraction * 60) % 60;
      commitChange(minutes, nextSec);
    }
  };

  const detectRingFromPointer = (clientX: number, clientY: number): ActiveRing => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const x = (clientX - rect.left) * scaleX - center;
    const y = (clientY - rect.top) * scaleY - center;
    const dist = Math.hypot(x, y);

    // Ignore clicks right inside the center numeric input zone
    if (dist < 36) return null;
    return dist >= splitRadius ? 'minutes' : 'seconds';
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const ring = detectRingFromPointer(e.clientX, e.clientY);
    if (!ring) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingRing(ring);
    updateFromPointer(e.clientX, e.clientY, ring);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRing) return;
    updateFromPointer(e.clientX, e.clientY, draggingRing);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingRing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingRing(null);
    }
  };

  const handleMinutesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value || '0', 10);
    if (Number.isNaN(val)) return;
    commitChange(val, seconds);
  };

  const handleSecondsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value || '0', 10);
    if (Number.isNaN(val)) return;
    if (val >= 60) {
      const extraMin = Math.floor(val / 60);
      commitChange(minutes + extraMin, val % 60);
    } else {
      commitChange(minutes, val);
    }
  };

  const handleRawSecondsCommit = () => {
    setIsEditingRaw(false);
    const cleaned = rawSecText.trim();
    if (!cleaned) {
      setRawSecText(String(valueSec));
      return;
    }
    // Support either "MM:SS" or plain total seconds e.g. "90"
    if (cleaned.includes(':')) {
      const [mStr, sStr] = cleaned.split(':');
      const m = parseInt(mStr || '0', 10) || 0;
      const s = parseInt(sStr || '0', 10) || 0;
      const total = Math.max(minSec, m * 60 + s);
      onChange(total);
      setRawSecText(String(total));
    } else {
      const parsed = parseInt(cleaned, 10);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(minSec, Math.min(maxMinutes * 60 + 59, parsed));
        onChange(clamped);
        setRawSecText(String(clamped));
      } else {
        setRawSecText(String(valueSec));
      }
    }
  };

  return (
    <div className="circular-input-card">
      <div className="circular-input-header">
        <span className="circular-input-label">{label}</span>
        <div className="ring-legend">
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: accentColorVar }}
            />
            Outer: Min
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: 'var(--accent-break)' }}
            />
            Inner: Sec
          </span>
        </div>
      </div>

      <div className="circular-dial-wrapper">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="concentric-dial-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label={`${label} circular time picker`}
          aria-valuemin={minSec}
          aria-valuemax={maxMinutes * 60 + 59}
          aria-valuenow={valueSec}
        >
          {/* Subtle tick marks on outer ring (every 5 minutes) */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx / 12) * 2 * Math.PI - Math.PI / 2;
            const r1 = outerRadius + 7;
            const r2 = outerRadius + 10;
            return (
              <line
                key={idx}
                x1={center + r1 * Math.cos(angle)}
                y1={center + r1 * Math.sin(angle)}
                x2={center + r2 * Math.cos(angle)}
                y2={center + r2 * Math.sin(angle)}
                stroke="var(--border-subtle)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            );
          })}

          {/* OUTER RING: MINUTES */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth="4"
          />
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={accentColorVar}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerDashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="dial-progress-ring"
          />
          <circle
            cx={outerThumbX}
            cy={outerThumbY}
            r={draggingRing === 'minutes' ? 8 : 6.5}
            fill="var(--bg-surface)"
            stroke={accentColorVar}
            strokeWidth="2.5"
            className="dial-thumb"
          />

          {/* INNER RING: SECONDS */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth="4"
          />
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="var(--accent-break)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerDashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="dial-progress-ring"
          />
          <circle
            cx={innerThumbX}
            cy={innerThumbY}
            r={draggingRing === 'seconds' ? 7.5 : 6}
            fill="var(--bg-surface)"
            stroke="var(--accent-break)"
            strokeWidth="2.5"
            className="dial-thumb"
          />
        </svg>

        {/* Center Direct Numeric Inputs (MM:SS) */}
        <div className="dial-center-inputs">
          <div className="mm-ss-inputs">
            <label className="time-segment-label" title="Minutes">
              <input
                type="number"
                min={0}
                max={maxMinutes}
                value={String(minutes).padStart(2, '0')}
                onChange={handleMinutesInput}
                aria-label={`${label} minutes`}
                className="dial-number-input"
              />
              <span className="unit-tag">m</span>
            </label>
            <span className="time-colon">:</span>
            <label className="time-segment-label" title="Seconds">
              <input
                type="number"
                min={0}
                max={59}
                value={String(seconds).padStart(2, '0')}
                onChange={handleSecondsInput}
                aria-label={`${label} seconds`}
                className="dial-number-input"
              />
              <span className="unit-tag">s</span>
            </label>
          </div>
        </div>
      </div>

      {/* Direct Text Input Bar for typing total seconds or MM:SS */}
      <div className="direct-text-row">
        <span className="direct-text-hint">Type seconds or MM:SS</span>
        <input
          type="text"
           inputMode="text"
          className="direct-seconds-input"
          value={rawSecText}
          aria-label={`${label} direct text input`}
          onFocus={() => setIsEditingRaw(true)}
          onChange={(e) => setRawSecText(e.target.value)}
          onBlur={handleRawSecondsCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  );
};
