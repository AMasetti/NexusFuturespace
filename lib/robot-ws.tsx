"use client";

/**
 * Direct WebSocket connection to firmware-rl (ws://<host>:81).
 * Replaces the ROS bridge path for the RL runner setup.
 *
 * Protocol (firmware-rl):
 *   Receive (50 Hz): { t, imu: {pitch, roll, yaw_rate, gx, gy, gz},
 *                      joints: {l_hip_roll, l_hip_pitch, l_knee, l_ankle_roll,
 *                               r_hip_roll, r_hip_pitch, r_knee, r_ankle_roll,
 *                               l_shoulder_fb, r_shoulder_fb, l_shoulder_lat, r_shoulder_lat,
 *                               l_forearm_lat, r_forearm_lat, hip_yaw} }
 *   Send: { cmd: "set_joints", angles: { ...same keys... } }
 *         { cmd: "halt" }
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RobotImu {
  pitch: number;
  roll: number;
  yaw_rate: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface RobotJoints {
  l_hip_roll: number;
  l_hip_pitch: number;
  l_knee: number;
  l_ankle_roll: number;
  r_hip_roll: number;
  r_hip_pitch: number;
  r_knee: number;
  r_ankle_roll: number;
  l_shoulder_fb: number;
  r_shoulder_fb: number;
  l_shoulder_lat: number;
  r_shoulder_lat: number;
  l_forearm_lat: number;
  r_forearm_lat: number;
  hip_yaw: number;
}

export interface RobotState {
  imu: RobotImu;
  joints: RobotJoints;
  t: number;
}

export type WsStatus = "connecting" | "connected" | "disconnected";

interface RobotWsContextValue {
  status: WsStatus;
  state: RobotState | null;
  sendJoints: (joints: Partial<RobotJoints>) => void;
  sendHalt: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const RobotWsContext = createContext<RobotWsContextValue>({
  status: "disconnected",
  state: null,
  sendJoints: () => {},
  sendHalt: () => {},
});

export function useRobotWs() {
  return useContext(RobotWsContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function RobotWsProvider({
  host,
  port = 81,
  children,
}: {
  host: string;
  port?: number;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [state, setState] = useState<RobotState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const url = `ws://${host}:${port}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => setStatus("connected");

      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data as string) as RobotState;
          setState(d);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => setStatus("disconnected");

      ws.onclose = () => {
        setStatus("disconnected");
        setState(null);
        // Reconnect after 2s
        reconnectTimer.current = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [host, port]);

  const sendJoints = useCallback((joints: Partial<RobotJoints>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[robot-ws] sendJoints: WS not open, state=", ws?.readyState);
      return;
    }
    ws.send(JSON.stringify({ cmd: "set_joints", angles: joints }));
  }, []);

  const sendHalt = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ cmd: "halt" }));
  }, []);

  return (
    <RobotWsContext.Provider value={{ status, state, sendJoints, sendHalt }}>
      {children}
    </RobotWsContext.Provider>
  );
}
