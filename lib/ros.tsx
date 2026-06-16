"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Ros, Topic } from "roslib";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RosStatus = "connecting" | "connected" | "disconnected";

export interface RosContextValue {
  status: RosStatus;
  publish: (topicName: string, msgType: string, msg: object) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

export const RosContext = createContext<RosContextValue>({
  status: "disconnected",
  publish: () => {},
});

export function useRosStatus(): RosStatus {
  return useContext(RosContext).status;
}

export function useRosPublish(): RosContextValue["publish"] {
  return useContext(RosContext).publish;
}

// ── Subscribe hook ────────────────────────────────────────────────────────────

/**
 * Subscribe to a ROS topic and return the latest message, or null when
 * disconnected / not yet received. Falls back silently if ROS is unavailable.
 */
export function useRosTopic<T>(topicName: string, msgType: string): T | null {
  const { status } = useContext(RosContext);
  const rosRef = useContext(RosInstanceContext);
  const [msg, setMsg] = useState<T | null>(null);

  useEffect(() => {
    if (!rosRef.current || status !== "connected") {
      setMsg(null);
      return;
    }
    const topic = new Topic({
      ros: rosRef.current,
      name: topicName,
      messageType: msgType,
    });
    topic.subscribe((m) => setMsg(m as T));
    return () => topic.unsubscribe();
  }, [rosRef, status, topicName, msgType]);

  return msg;
}

// ── Internal context carrying the ROSLIB.Ros instance ref ─────────────────────
// Separate from RosContext so consumers only re-render on status/publish changes.

const RosInstanceContext = createContext<React.RefObject<Ros | null>>({
  current: null,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function RosProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RosStatus>("connecting");
  const rosRef = useRef<Ros | null>(null);
  const topicsRef = useRef<Map<string, Topic>>(new Map());

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_ROS_WS_URL;
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("disconnected");
      return;
    }

    const ros = new Ros({ url });
    rosRef.current = ros;

    ros.on("connection", () => setStatus("connected"));
    ros.on("error", () => setStatus("disconnected"));
    ros.on("close", () => setStatus("disconnected"));

    const topicsMap = topicsRef.current;
    return () => {
      ros.close();
      rosRef.current = null;
      topicsMap.clear();
    };
  }, []);

  const publish = useCallback(
    (topicName: string, msgType: string, data: object) => {
      if (!rosRef.current || status !== "connected") return;
      let topic = topicsRef.current.get(topicName);
      if (!topic) {
        topic = new Topic({
          ros: rosRef.current,
          name: topicName,
          messageType: msgType,
        });
        topicsRef.current.set(topicName, topic);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topic.publish(data as any);
    },
    [status]
  );

  return (
    <RosInstanceContext.Provider value={rosRef}>
      <RosContext.Provider value={{ status, publish }}>{children}</RosContext.Provider>
    </RosInstanceContext.Provider>
  );
}
