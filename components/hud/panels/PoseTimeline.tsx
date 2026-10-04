"use client";

import { useEffect, useRef, useState } from "react";
import { CopyPlus, Download, Play, Plus, Repeat, Square, Upload, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DURATION_S,
  MIN_DURATION_S,
  newPoseId,
  poseTimes,
  totalDuration,
  type Pose,
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

/** Animation name: always editable, saved on blur/Enter, Escape restores. */
function SequenceNameInput({
  value,
  onCommit,
  disabled,
}: {
  value: string;
  onCommit: (name: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const name = draft?.trim();
    if (name && name !== value) onCommit(name.slice(0, 40));
    setDraft(null);
  };
  return (
    <input
      value={draft ?? value}
      disabled={disabled}
      maxLength={40}
      aria-label="Animation name"
      title="Animation name — used in the export file name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
      className="h-8 w-40 rounded-full border border-white/10 bg-white/5 px-3 font-mono text-[11px] font-bold tracking-widest text-white/90 uppercase outline-none focus:border-cyan-300/50 disabled:opacity-40"
    />
  );
}

/** Inline name field: Enter or blur saves, Escape cancels. */
function PoseNameInput({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      autoFocus
      value={draft}
      maxLength={32}
      aria-label="Pose name"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => onDone(draft.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") onDone(null);
      }}
      className="w-28 rounded-md bg-black/30 px-1 font-mono text-[11px] font-bold tracking-widest text-white uppercase ring-1 ring-cyan-300/50 outline-none"
    />
  );
}

/**
 * One pose in the track, with the transition field that leads into it (the
 * duration belongs to the pose, so they move together when reordered). The
 * card is the drag handle; a short click still selects it.
 */
function SortablePose({
  pose,
  index,
  prevName,
  time,
  selected,
  playing,
  renaming,
  cardRef,
  onSelect,
  onStartRename,
  onRename,
  onDuration,
  onCopy,
  onRemove,
}: {
  pose: Pose;
  index: number;
  prevName?: string;
  time: number;
  selected: boolean;
  playing: boolean;
  renaming: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onRename: (name: string | null) => void;
  onDuration: (d: number) => void;
  onCopy: () => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pose.id,
    disabled: playing || renaming,
  });
  const timeLabel = index === 0 ? "start" : `t = ${time.toFixed(2)} s`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex shrink-0 items-center gap-2", isDragging && "relative z-10 opacity-80")}
    >
      {index > 0 && (
        <DurationInput
          value={pose.durationS}
          disabled={playing}
          title={`Seconds from ${prevName} to ${pose.name}`}
          onCommit={onDuration}
        />
      )}
      <div
        ref={cardRef}
        {...attributes}
        {...listeners}
        // dnd-kit marks a disabled sortable aria-disabled, which would also
        // disable the rename field and buttons inside for assistive tech.
        aria-disabled={undefined}
        role="group"
        aria-label={`${pose.name}, drag to reorder`}
        className={cn(
          "group relative flex touch-none items-center rounded-2xl border transition-colors",
          !playing && "cursor-grab active:cursor-grabbing",
          isDragging && "shadow-lg shadow-black/40",
          selected
            ? "border-cyan-300/60 bg-cyan-300/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        )}
      >
        {renaming ? (
          <div className="flex flex-col items-start gap-0.5 px-3 py-2">
            <PoseNameInput initial={pose.name} onDone={onRename} />
            <span className={cn(MONO, "text-[10px] text-cyan-200/60")}>{timeLabel}</span>
          </div>
        ) : (
          <button
            onClick={onSelect}
            onDoubleClick={() => !playing && onStartRename()}
            disabled={playing}
            aria-pressed={selected}
            title="Click to edit · double-click to rename · drag to reorder"
            className="flex cursor-[inherit] flex-col items-start gap-0.5 px-3 py-2 text-left disabled:cursor-default"
          >
            <span className="font-mono text-[11px] font-bold tracking-widest text-white/90 uppercase">
              {pose.name}
            </span>
            <span className={cn(MONO, "text-[10px] text-cyan-200/60")}>{timeLabel}</span>
          </button>
        )}
        {!playing && (
          <div className="mr-1.5 flex flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={onCopy}
              aria-label={`Copy ${pose.name} to the end`}
              title={`Add a copy of ${pose.name} at the end`}
              className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-cyan-200"
            >
              <CopyPlus className="h-3 w-3" />
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                aria-label={`Remove ${pose.name}`}
                title={`Remove ${pose.name}`}
                className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-rose-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
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
  embedded = false,
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
  /** Inside another glass surface (mobile sheet): a card, without its own blur. */
  embedded?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [renaming, setRenaming] = useState<string | null>(null);

  // A vertical mouse wheel scrolls the track sideways. Native listener: React's
  // wheel handler is passive, so it couldn't stop the page from scrolling instead.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Adding a pose scrolls to the end (new pose and + both visible); selecting
  // one scrolls just enough to show it.
  const count = sequence.poses.length;
  const prevCount = useRef(count);
  const selectedId = sequence.poses[selected]?.id;
  useEffect(() => {
    const added = count > prevCount.current;
    prevCount.current = count;
    // Wait a frame: the new card's width isn't in scrollWidth until layout runs.
    const raf = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el) return;
      if (added) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      else if (selectedId)
        cardRefs.current[selectedId]?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId, count]);
  const { poses } = sequence;
  const total = totalDuration(sequence);
  const times = poseTimes(sequence);
  const canPlay = poses.length > 1;

  // A 6 px threshold keeps a plain click as "select"; arrows reorder from the keyboard.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = poses.findIndex((p) => p.id === active.id);
    const to = poses.findIndex((p) => p.id === over.id);
    const next: Sequence = { ...sequence, poses: arrayMove(poses, from, to) };
    onChange(next);
    // Keep the same pose selected wherever it landed.
    onSelect(
      Math.max(
        0,
        next.poses.findIndex((p) => p.id === selectedId)
      ),
      next
    );
  };

  const renamePose = (i: number, name: string | null) => {
    setRenaming(null);
    if (name && name !== poses[i].name)
      onChange({ ...sequence, poses: poses.map((p, k) => (k === i ? { ...p, name } : p)) });
  };

  const setDuration = (i: number, d: number) =>
    onChange({ ...sequence, poses: poses.map((p, k) => (k === i ? { ...p, durationS: d } : p)) });

  /** Appends a copy of pose `i` and selects it — handy for repeating moves in a loop. */
  const appendCopy = (i: number) => {
    const next: Sequence = {
      ...sequence,
      poses: [
        ...poses,
        {
          id: newPoseId(),
          name: `Pose ${poses.length + 1}`,
          angles: { ...poses[i].angles },
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
      className={cn(
        "flex shrink-0 flex-col gap-3 p-3",
        embedded ? "glass-card rounded-2xl" : "glass-panel rounded-3xl"
      )}
    >
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <SequenceNameInput
          value={sequence.name}
          disabled={playing}
          onCommit={(name) => onChange({ ...sequence, name })}
        />
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
        {sequence.recording && (
          <span
            className="rounded-full border border-rose-300/30 bg-rose-400/10 px-2.5 py-1 font-mono text-[10px] tracking-widest text-rose-100 uppercase"
            title="Plays the recorded frames exactly. Editing a pose's angles, timing or order turns it into a regular sequence."
          >
            Recorded · {sequence.recording.hz} Hz
          </span>
        )}

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
      <div ref={trackRef} className="glass-scroll flex items-center gap-2 overflow-x-auto pb-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={poses.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
            {poses.map((p, i) => (
              <SortablePose
                key={p.id}
                pose={p}
                index={i}
                prevName={poses[i - 1]?.name}
                time={times[i]}
                selected={i === selected && !playing}
                playing={playing}
                renaming={renaming === p.id}
                cardRef={(el) => {
                  cardRefs.current[p.id] = el;
                }}
                onSelect={() => onSelect(i)}
                onStartRename={() => setRenaming(p.id)}
                onRename={(name) => renamePose(i, name)}
                onDuration={(d) => setDuration(i, d)}
                onCopy={() => appendCopy(i)}
                onRemove={i > 0 ? () => removePose(i) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>

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
          onClick={() => appendCopy(poses.length - 1)}
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
