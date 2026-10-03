"use client";

import { useRef, useState } from "react";
import { Download, Play, Plus, Repeat, Square, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DURATION_S,
  MIN_DURATION_S,
  newPoseId,
  poseTimes,
  totalDuration,
  type Sequence,
} from "@/lib/sequence";

const MONO = "font-mono tabular-nums";

/** Seconds field: edits a draft, commits on blur/Enter so typing "0.5" isn't fought. */
function DurationInput({
  value,
  onCommit,
  disabled,
  title,
  prefix,
}: {
  value: number;
  onCommit: (v: number) => void;
  disabled?: boolean;
  title: string;
  prefix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = parseFloat(draft);
    if (Number.isFinite(v)) onCommit(Math.max(MIN_DURATION_S, Math.round(v * 100) / 100));
    setDraft(null);
  };
  return (
    <label
      title={title}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1",
        MONO,
        "text-[10px] text-cyan-200/80",
        disabled && "opacity-40"
      )}
    >
      {prefix && <span className="text-cyan-200/50">{prefix}</span>}
      <input
        type="number"
        step={0.1}
        min={MIN_DURATION_S}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-10 [appearance:textfield] bg-transparent text-right outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-cyan-200/50">s</span>
    </label>
  );
}

/**
 * Pose sequence editor under the 3D viewer: pose cards with the transition time
 * between them, + to add a pose, play once or in a loop, export/import JSON.
 */
export function PoseTimeline({
  sequence,
  selected,
  onSelect,
  onChange,
  playing,
  time,
  onPlay,
  onStop,
  onExport,
  onImport,
  message,
}: {
  sequence: Sequence;
  selected: number;
  /** `next` is passed when the selection follows a change made in the same click. */
  onSelect: (index: number, next?: Sequence) => void;
  onChange: (seq: Sequence) => void;
  playing: boolean;
  time: number;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  message?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { poses } = sequence;
  const total = totalDuration(sequence);
  const times = poseTimes(sequence);
  const canPlay = poses.length > 1;

  const setDuration = (i: number, d: number) =>
    onChange({ ...sequence, poses: poses.map((p, k) => (k === i ? { ...p, durationS: d } : p)) });

  const addPose = () => {
    const last = poses[poses.length - 1];
    const next: Sequence = {
      ...sequence,
      poses: [
        ...poses,
        {
          id: newPoseId(),
          name: `Pose ${poses.length + 1}`,
          angles: { ...last.angles },
          durationS: DEFAULT_DURATION_S,
        },
      ],
    };
    onChange(next);
    onSelect(poses.length, next);
  };

  const removePose = (i: number) => {
    const next: Sequence = { ...sequence, poses: poses.filter((_, k) => k !== i) };
    onChange(next);
    onSelect(selected >= i ? Math.max(0, selected - 1) : selected, next);
  };

  const btn =
    "flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 font-mono text-[10px] tracking-widest uppercase transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section
      aria-label="Pose timeline"
      className="glass-panel flex shrink-0 flex-col gap-3 rounded-3xl p-3"
    >
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <button onClick={onStop} className={cn(btn, "text-rose-200")} aria-label="Stop">
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={!canPlay}
            className={cn(btn, "text-emerald-200")}
            aria-label="Play"
            title={canPlay ? "Play the sequence" : "Add a second pose to play"}
          >
            <Play className="h-3.5 w-3.5" /> Play
          </button>
        )}
        <button
          onClick={() => onChange({ ...sequence, loop: !sequence.loop })}
          aria-pressed={sequence.loop}
          className={cn(
            btn,
            sequence.loop ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "text-white/60"
          )}
          title="Loop: return to pose 1 and repeat"
        >
          <Repeat className="h-3.5 w-3.5" /> Loop
        </button>
        <span className={cn(MONO, "px-2 text-xs text-cyan-200/80")}>
          {time.toFixed(2)} / {total.toFixed(2)} s
        </span>

        <div className="ml-auto flex items-center gap-2">
          {message && <span className="font-mono text-[10px] text-amber-200/90">{message}</span>}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={playing}
            className={cn(btn, "text-white/70")}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button onClick={onExport} className={cn(btn, "text-white/70")}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* ── Track ────────────────────────────────────────────── */}
      <div className="glass-scroll flex items-center gap-2 overflow-x-auto pb-1">
        {poses.map((p, i) => {
          const isSelected = i === selected && !playing;
          return (
            <div key={p.id} className="flex shrink-0 items-center gap-2">
              {i > 0 && (
                <DurationInput
                  value={p.durationS}
                  disabled={playing}
                  title={`Seconds from ${poses[i - 1].name} to ${p.name}`}
                  onCommit={(d) => setDuration(i, d)}
                />
              )}
              <div
                className={cn(
                  "group relative flex items-center rounded-2xl border transition-colors",
                  isSelected
                    ? "border-cyan-300/60 bg-cyan-300/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <button
                  onClick={() => onSelect(i)}
                  disabled={playing}
                  aria-pressed={isSelected}
                  className="flex flex-col items-start gap-0.5 px-3 py-2 text-left disabled:cursor-default"
                >
                  <span className="font-mono text-[11px] font-bold tracking-widest text-white/90 uppercase">
                    {p.name}
                  </span>
                  <span className={cn(MONO, "text-[10px] text-cyan-200/60")}>
                    {i === 0 ? "start" : `t = ${times[i].toFixed(2)} s`}
                  </span>
                </button>
                {i > 0 && !playing && (
                  <button
                    onClick={() => removePose(i)}
                    aria-label={`Remove ${p.name}`}
                    className="mr-1.5 rounded-full p-1 text-white/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-rose-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sequence.loop && poses.length > 1 && (
          <DurationInput
            value={poses[0].durationS}
            disabled={playing}
            prefix="↺"
            title={`Seconds to return from ${poses[poses.length - 1].name} to ${poses[0].name}`}
            onCommit={(d) => setDuration(0, d)}
          />
        )}

        <button
          onClick={addPose}
          disabled={playing}
          aria-label="Add pose"
          title="Add a pose (copies the last one)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/20 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* ── Progress ─────────────────────────────────────────── */}
      <div className="relative h-1 w-full rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-cyan-300/70"
          style={{ width: `${total > 0 ? (time / total) * 100 : 0}%` }}
        />
        {total > 0 &&
          times.map((t, i) => (
            <div
              key={poses[i].id}
              className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full bg-white/40"
              style={{ left: `${(t / total) * 100}%` }}
            />
          ))}
      </div>
    </section>
  );
}
