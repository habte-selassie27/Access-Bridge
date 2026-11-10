// Explicit, discriminated-union state machines for PasteWise.
// See UI.md section 13 "Frontend State Management".
//
// Each machine is a pure reducer over a tagged union so that:
//  - impossible states are unrepresentable (DX)
//  - transitions are exhaustive and reviewable (AX)
//  - UI renders one state at a time with no flicker (UX)

export type DocumentStatus = "idle" | "validating" | "processing" | "success" | "error";

export interface DocumentError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export type DocumentUIState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "processing"; requestId?: string }
  | { status: "success"; result: unknown }
  | { status: "error"; error: DocumentError };

export type DocumentEvent =
  | { type: "SUBMIT" }
  | { type: "VALIDATE" }
  | { type: "PROCESSING"; requestId?: string }
  | { type: "SUCCESS"; result: unknown }
  | { type: "ERROR"; error: DocumentError }
  | { type: "RETRY" }
  | { type: "RESET" };

export type FollowUpStatus = "idle" | "sending" | "success" | "error";

export interface FollowUpMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FollowUpState {
  status: FollowUpStatus;
  messages: FollowUpMessage[];
  input: string;
  error: string | null;
}

export type FollowUpEvent =
  | { type: "INPUT"; value: string }
  | { type: "SEND"; question: string }
  | { type: "SENT" }
  | { type: "ANSWER"; answer: string }
  | { type: "FAIL"; error: string }
  | { type: "RESET" };

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioState {
  status: AudioStatus;
  error: string | null;
}

export type AudioEvent =
  | { type: "PLAY" }
  | { type: "LOADING" }
  | { type: "PLAYING" }
  | { type: "PAUSED" }
  | { type: "STOPPED" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

export type EvalStatus = "loading" | "ready" | "error";

export type EvalView = "overview" | "languages" | "samples" | "failures";

export interface EvalState {
  status: EvalStatus;
  view: EvalView;
  data: unknown | null;
  error: string | null;
}

export type EvalEvent =
  | { type: "LOAD" }
  | { type: "LOADED"; data: unknown }
  | { type: "FAILED"; error: string }
  | { type: "VIEW"; view: EvalView }
  | { type: "RESET" };

export type CameraStatus = "idle" | "requesting" | "streaming" | "captured" | "error";

export interface CameraState {
  status: CameraStatus;
  error: string | null;
  stream: MediaStream | null;
}

export type CameraEvent =
  | { type: "REQUEST" }
  | { type: "GRANTED"; stream: MediaStream }
  | { type: "CAPTURED" }
  | { type: "DENIED"; error: string }
  | { type: "STOP" }
  | { type: "RESET" };
