import { randomBytes } from "node:crypto";

// One unguessable token per subscription, so the link in an email works without signing in --
// exactly what CAN-SPAM requires (a working one-click opt-out) -- while still being safe to expose
// in the URL: nothing about it reveals or lets someone guess another subscription's token.
export function generateUnsubscribeToken() {
  return randomBytes(24).toString("base64url");
}
