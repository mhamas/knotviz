/**
 * Typed wrapper around `self.postMessage` for our Web Workers.
 *
 * TS's default lib types `self` as `Window & typeof globalThis`, whose
 * `postMessage(msg, targetOrigin, transfer?)` signature differs from the
 * worker form `postMessage(msg, transfer)`. Adding the WebWorker lib
 * would conflict with DOM at the project level, so we narrow `self`
 * structurally here — one cast lives in this file and call sites stay
 * cast-free.
 */
export function postResult(msg: unknown, transfer: Transferable[] = []): void {
  ;(self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage(msg, transfer)
}
