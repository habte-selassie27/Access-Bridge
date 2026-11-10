import { useReducer, useCallback } from "react";

export function useMachine<S, E>(
  reducer: (state: S, event: E) => S,
  initial: S
): [S, (event: E) => void] {
  const [state, dispatch] = useReducer(reducer, initial);
  const send = useCallback((event: E) => dispatch(event), []);
  return [state, send];
}
