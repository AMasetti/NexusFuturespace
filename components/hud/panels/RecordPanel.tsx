"use client";

import { useEffect, useState } from "react";
import { Circle, Square } from "lucide-react";
import { HudPanel } from "../core/HudPanel";
import { cn } from "@/lib/utils";
import { useRosPublish, useRosStatus, useRosTopic } from "@/lib/ros";
import { loadOperator, saveOperator } from "@/lib/persist";

// The recorder (docker/recorder in the NexusRobotics stack) takes JSON commands and
// reports its state as JSON, both on std_msgs/String so rosbridge needs no custom types.
interface RecorderStatus {
  state: "idle" | "recording" | "error";
  episode: string | null;
  task: string | null;
  elapsed_s: number;
  last: string | null;
  error: string | null;
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;

const field =
  "h-8 w-full rounded-full border border-white/10 bg-white/5 px-3 font-mono text-[11px] text-white/90 outline-none placeholder:text-white/30 focus:border-cyan-300/50 disabled:opacity-40";

export function RecordPanel({
  topics,
  collapsed,
  onToggle,
}: {
  topics: { command: string; status: string };
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const ros = useRosStatus();
  const publish = useRosPublish();
  const msg = useRosTopic<{ data: string }>(topics.status, "std_msgs/String");
  const [task, setTask] = useState("");
  const [operator, setOperator] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOperator(loadOperator() ?? "");
  }, []);

  let status: RecorderStatus | null = null;
  try {
    status = msg ? (JSON.parse(msg.data) as RecorderStatus) : null;
  } catch {
    status = null;
  }
  const recording = status?.state === "recording";
  const online = ros === "connected" && status !== null;
  const offlineReason =
    ros !== "connected"
      ? "rosbridge not connected"
      : status === null
        ? "recorder not running"
        : null;

  const send = (command: object) =>
    publish(topics.command, "std_msgs/String", { data: JSON.stringify(command) });

  const start = () => {
    saveOperator(operator.trim());
    send({
      action: "start",
      task: task.trim(),
      operator: operator.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <HudPanel
      title="Record"
      subtitle={recording ? "REC" : online ? "READY" : "OFFLINE"}
      status={recording ? "critical" : online ? "online" : "offline"}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3 p-3">
        {recording ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-mono text-xs font-bold tracking-widest text-rose-200 uppercase">
                {status?.task}
              </span>
              <span className="truncate font-mono text-[10px] text-white/50">
                {status?.episode}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-rose-200 tabular-nums">
              {fmt(status?.elapsed_s ?? 0)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              aria-label="Task"
              className={field}
              placeholder="Task — e.g. wave, walk 1 m"
              value={task}
              maxLength={60}
              disabled={!online}
              onChange={(e) => setTask(e.target.value)}
            />
            <input
              aria-label="Operator"
              className={field}
              placeholder="Operator"
              value={operator}
              maxLength={40}
              disabled={!online}
              onChange={(e) => setOperator(e.target.value)}
            />
            <input
              aria-label="Notes"
              className={field}
              placeholder="Notes (optional)"
              value={notes}
              maxLength={200}
              disabled={!online}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={recording ? () => send({ action: "stop" }) : start}
          disabled={!online || (!recording && !task.trim())}
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-full border font-mono text-[11px] font-bold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            recording
              ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
              : "border-rose-300/40 bg-rose-400/15 text-rose-100 hover:bg-rose-400/25"
          )}
        >
          {recording ? (
            <>
              <Square className="h-3.5 w-3.5" /> Stop
            </>
          ) : (
            <>
              <Circle className="h-3.5 w-3.5 fill-current" /> Record
            </>
          )}
        </button>

        <p className="font-mono text-[10px] leading-relaxed text-white/45">
          {offlineReason
            ? `Unavailable — ${offlineReason}. Recording needs the Docker stack (make docker-up).`
            : status?.error
              ? `Error: ${status.error}`
              : status?.last
                ? `Last: ${status.last} · run make data-ingest to process it`
                : "Episodes go to the nexus-data landing folder."}
        </p>
      </div>
    </HudPanel>
  );
}
