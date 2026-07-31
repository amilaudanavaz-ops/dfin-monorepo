// src/lib/sync/WebSocketClient.ts
import * as Y from 'yjs';
import { ydoc } from './CRDTEngine';

let ws: WebSocket | null = null;

export function connectToLocalNode() {
  ws = new WebSocket('ws://127.0.0.1:3030/sync');

  ws.onopen = () => {
    console.log('[SYNC] Connected to local DFIN P2P Node on Port 3030.');
    
    const stateVector = Y.encodeStateAsUpdate(ydoc);
    // FIX: Cast to 'any' to bypass strict TS DOM ArrayBufferLike checks
    ws?.send(stateVector as any);
  };

  ws.onmessage = (event) => {
    const incomingUpdate = new Uint8Array(event.data);
    Y.applyUpdate(ydoc, incomingUpdate);
    console.log('[SYNC] Received and merged remote state update.');
  };

  ws.onclose = () => {
    console.warn('[SYNC] Connection to local node lost. Reconnecting in 3s...');
    setTimeout(connectToLocalNode, 3000);
  };

  ws.onerror = (err) => {
    console.error('[SYNC] WebSocket Error:', err);
  };

  ydoc.on('update', (update) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // FIX: Cast to 'any'
      ws.send(update as any);
    }
  });
}