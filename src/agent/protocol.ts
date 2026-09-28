import type { JointReport, ReviewViewId, SceneDocument } from '../types/index.ts'

/**
 * Messages between the PoseRef server (which hosts the MCP endpoint) and the
 * browser tab over the `/ws` WebSocket. The server sends requests on behalf of
 * AI agents; the browser, which owns the scene and the WebGL renderer, answers.
 * Shared by `server/` (run directly by Node) and `src/`, so import only types here.
 */
export interface BridgeMethods {
  getScene: { params: Record<string, never>; result: SceneDocument }
  /** `params` has already been validated and normalized by the server. */
  setScene: {
    params: SceneDocument
    /** groundShift: how far the hips were moved up (+) or down (-) to rest on the floor; null if not grounded. */
    result: { scene: SceneDocument; groundShift: number | null }
  }
  renderViews: {
    params: { views: ReviewViewId[]; size: number }
    result: { pngBase64: string; width: number; height: number }
  }
  getJoints: { params: Record<string, never>; result: JointReport }
}

export type BridgeMethod = keyof BridgeMethods

export interface BridgeRequest<M extends BridgeMethod = BridgeMethod> {
  type: 'request'
  id: number
  method: M
  params: BridgeMethods[M]['params']
}

export type BridgeResponse =
  | { type: 'response'; id: number; ok: true; result: unknown }
  | { type: 'response'; id: number; ok: false; error: string }

/** Sent when the tab gains focus, so requests go to the tab the user is looking at. */
export interface BridgeFocus {
  type: 'focus'
}

export type BrowserToServerMessage = BridgeResponse | BridgeFocus

export const BRIDGE_PATH = '/ws'
