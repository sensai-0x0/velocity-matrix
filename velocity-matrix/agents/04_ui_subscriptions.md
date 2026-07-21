# 04_realtime_ui_contract.md

## Purpose
This document dictates how the terminal UI consumes live data from the Base44 backend without manual polling. It serves as the frontend implementation guide for establishing a persistent WebSocket connection, ensuring the "Velocity Matrix" grid flickers new data into the DOM the exact millisecond the Deno runtime resolves an AI payload.

## Agent Implementation Instructions

To the agent executing this blueprint, write the frontend logic adhering to the following strict reactive principles.

### Subscription Rules
- **Method:** You must use the Base44 SDK's native `subscribe()` method on the specific entities (`base44.entities.GeneratedSolutions.subscribe()` and `base44.entities.ActiveBlockers.subscribe()`). Do not implement raw WebSockets or `setInterval` polling.
- **State Management:** Bind the subscription payloads directly to the frontend framework's reactive state (e.g., React `useState` or Vue `ref`). When a new record arrives, append it to the top of the local state array.
- **Cyber Aesthetic UI Requirements:** 
  - Unresolved `ActiveBlockers` must map to a red, flickering terminal node.
  - Resolved `GeneratedSolutions` must immediately render in a neon-green data stream. 
  - Implement a rapid character-reveal animation (typing effect) when a new solution arrives to simulate the matrix grid.

## Code Artifact

```javascript
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function MatrixGrid() {
  const [blockers, setBlockers] = useState([]);
  const [solutions, setSolutions] = useState([]);

  useEffect(() => {
    // 1. Subscribe to the Unresolved Voice Ingestion Queue
    const unsubscribeBlockers = base44.entities.ActiveBlockers.subscribe({
      filter: { is_resolved: false }, // Only pull active issues
      onEvent: (event) => {
        if (event.type === 'created' || event.type === 'updated') {
          setBlockers((prev) => [event.data, ...prev.filter(b => b.id !== event.data.id)]);
        }
      },
      onError: (err) => console.error("Matrix Disconnect: Blocker Stream Failed", err)
    });

    // 2. Subscribe to the Live Generated Solutions (The AI's Output)
    const unsubscribeSolutions = base44.entities.GeneratedSolutions.subscribe({
      onEvent: (event) => {
        if (event.type === 'created') {
          // Play a "hacker/synth" sound effect here in the real UI
          setSolutions((prev) => [event.data, ...prev]);
        }
      },
      onError: (err) => console.error("Matrix Disconnect: Solution Stream Failed", err)
    });

    // 3. Cleanup listeners on unmount to prevent memory leaks
    return () => {
      unsubscribeBlockers();
      unsubscribeSolutions();
    };
  }, []);

  return (
    <div className="bg-black font-mono text-xs p-4 min-h-screen">
      <h1 className="text-emerald-500 mb-6 border-b border-emerald-900 pb-2">
        // VELOCITY_MATRIX :: LIVE_FEED
      </h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Active Blockers Stream (Red) */}
        <div>
          <h2 className="text-red-500 mb-4 animate-pulse">>> INGESTING_AUDIO...</h2>
          {blockers.map(blocker => (
            <div key={blocker.id} className="border border-red-800 bg-red-950/30 p-3 mb-3 text-red-400">
              [UNRESOLVED] {blocker.raw_transcript}
            </div>
          ))}
        </div>

        {/* Generated Solutions Stream (Neon Green) */}
        <div>
          <h2 className="text-emerald-500 mb-4">>> SYNTHESIZING_CODE...</h2>
          {solutions.map(solution => (
            <div key={solution.id} className="border border-emerald-600 bg-emerald-900/20 p-3 mb-3 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <pre className="whitespace-pre-wrap">{solution.typescript_code}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}