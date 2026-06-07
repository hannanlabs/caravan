'use client';

import type { ReactNode } from 'react';
import { IconMinus, IconPlus } from './icons';

/** A labelled section inside a modal body. `aside` sits at the top-right (e.g. a chip). */
export function Block({ label, aside, children }: { label?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="block">
      {(label || aside) && (
        <div className="block-head">
          {label ? <span className="eyebrow">{label}</span> : <span />}
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

/** Custom range slider with a painted fill behind the native input. */
export function Range({
  value, max, min = 0, onChange, disabled,
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div className="range">
      <div className="track" />
      <div className="fill" style={{ width: `${pct}%` }} />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Adjust value"
      />
    </div>
  );
}

/** Number stepper: minus / value / plus. */
export function Stepper({
  value, onChange, step = 10, min = 0, disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="step-btn"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Decrease"
      >
        <IconMinus size={16} />
      </button>
      <input
        type="number"
        className="tnum"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
      <button
        type="button"
        className="step-btn"
        disabled={disabled}
        onClick={() => onChange(value + step)}
        aria-label="Increase"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

/** Segmented preset buttons. */
export function Segmented<T extends string | number>({
  options, value, onChange, disabled, render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          className="seg"
          aria-pressed={value === opt}
          disabled={disabled}
          onClick={() => onChange(opt)}
        >
          {render ? render(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Chip({ tone = 'neutral', children }: { tone?: 'pos' | 'neg' | 'neutral' | 'accent'; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}
