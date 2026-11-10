import { test } from "node:test";
import assert from "node:assert/strict";
import {
  documentReducer,
  initialDocumentState,
  followupReducer,
  initialFollowUpState,
  audioReducer,
  initialAudioState,
  evalReducer,
  initialEvalState,
} from "./state/reducers.ts";

test("document machine: idle -> processing -> success", () => {
  let s = documentReducer(initialDocumentState, { type: "PROCESSING" });
  assert.equal(s.status, "processing");
  s = documentReducer(s, { type: "SUCCESS", result: { ok: true } });
  assert.equal(s.status, "success");
});

test("document machine: error can retry", () => {
  let s = documentReducer(initialDocumentState, { type: "ERROR", error: { message: "boom" } });
  assert.equal(s.status, "error");
  s = documentReducer(s, { type: "RETRY" });
  assert.equal(s.status, "validating");
});

test("followup machine: send then answer", () => {
  let s = followupReducer(initialFollowUpState, { type: "SEND", question: "hi" });
  assert.equal(s.status, "sending");
  assert.equal(s.messages.length, 1);
  s = followupReducer(s, { type: "ANSWER", answer: "ok" });
  assert.equal(s.status, "success");
  assert.equal(s.messages.length, 2);
});

test("audio machine: play -> playing -> stopped", () => {
  let s = audioReducer(initialAudioState, { type: "LOADING" });
  assert.equal(s.status, "loading");
  s = audioReducer(s, { type: "PLAYING" });
  assert.equal(s.status, "playing");
  s = audioReducer(s, { type: "STOPPED" });
  assert.equal(s.status, "idle");
});

test("eval machine: load -> ready", () => {
  let s = evalReducer(initialEvalState, { type: "LOADED", data: { x: 1 } });
  assert.equal(s.status, "ready");
  s = evalReducer(s, { type: "VIEW", view: "failures" });
  assert.equal(s.view, "failures");
});
