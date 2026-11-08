import { newRequestId } from "../lib/utils/ids.ts";

export function attachRequestId(req: any, _res: any, next: any): void {
  req.requestId = newRequestId();
  next();
}
