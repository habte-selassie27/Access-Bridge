import type {
  DocumentUIState,
  DocumentEvent,
  FollowUpState,
  FollowUpEvent,
  AudioState,
  AudioEvent,
  EvalState,
  EvalEvent,
  CameraState,
  CameraEvent,
} from "./types.ts";

export const initialDocumentState: DocumentUIState = { status: "idle" };

export function documentReducer(state: DocumentUIState, event: DocumentEvent): DocumentUIState {
  switch (event.type) {
    case "SUBMIT":
      return state.status === "idle" || state.status === "error" ? { status: "validating" } : state;
    case "VALIDATE":
      return state.status === "validating" ? { status: "processing" } : state;
    case "PROCESSING":
      return { status: "processing", requestId: event.requestId };
    case "SUCCESS":
      return { status: "success", result: event.result };
    case "ERROR":
      return { status: "error", error: event.error };
    case "RETRY":
      return { status: "validating" };
    case "RESET":
      return initialDocumentState;
    default:
      return state;
  }
}

export const initialFollowUpState: FollowUpState = {
  status: "idle",
  messages: [],
  input: "",
  error: null,
};

export function followupReducer(state: FollowUpState, event: FollowUpEvent): FollowUpState {
  switch (event.type) {
    case "INPUT":
      return { ...state, input: event.value, error: null };
    case "SEND": {
      const q = event.question.trim();
      if (!q) return state;
      return {
        ...state,
        status: "sending",
        messages: [...state.messages, { role: "user", content: q }],
        input: "",
        error: null,
      };
    }
    case "SENT":
      return { ...state, status: "sending" };
    case "ANSWER":
      return {
        ...state,
        status: "success",
        messages: [...state.messages, { role: "assistant", content: event.answer }],
        error: null,
      };
    case "FAIL":
      return { ...state, status: "error", error: event.error };
    case "RESET":
      return initialFollowUpState;
    default:
      return state;
  }
}

export const initialAudioState: AudioState = { status: "idle", error: null };

export function audioReducer(state: AudioState, event: AudioEvent): AudioState {
  switch (event.type) {
    case "PLAY":
      return { status: "loading", error: null };
    case "LOADING":
      return { status: "loading", error: null };
    case "PLAYING":
      return { status: "playing", error: null };
    case "PAUSED":
      return { status: "paused", error: state.error };
    case "STOPPED":
      return { status: "idle", error: null };
    case "ERROR":
      return { status: "error", error: event.message };
    case "RESET":
      return initialAudioState;
    default:
      return state;
  }
}

export const initialEvalState: EvalState = {
  status: "loading",
  view: "overview",
  data: null,
  error: null,
};

export function evalReducer(state: EvalState, event: EvalEvent): EvalState {
  switch (event.type) {
    case "LOAD":
      return { ...state, status: "loading", error: null };
    case "LOADED":
      return { ...state, status: "ready", data: event.data, error: null };
    case "FAILED":
      return { ...state, status: "error", error: event.error };
    case "VIEW":
      return { ...state, view: event.view };
    case "RESET":
      return initialEvalState;
    default:
      return state;
  }
}

export const initialCameraState: CameraState = {
  status: "idle",
  error: null,
  stream: null,
};

export function cameraReducer(state: CameraState, event: CameraEvent): CameraState {
  switch (event.type) {
    case "REQUEST":
      return { status: "requesting", error: null, stream: state.stream };
    case "GRANTED":
      return { status: "streaming", error: null, stream: event.stream };
    case "CAPTURED":
      return state.status === "streaming" ? { ...state, status: "captured" } : state;
    case "DENIED":
      return { status: "error", error: event.error, stream: null };
    case "STOP":
      return { status: "idle", error: null, stream: null };
    case "RESET":
      return initialCameraState;
    default:
      return state;
  }
}
