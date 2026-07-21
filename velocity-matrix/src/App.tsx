import { MatrixVoiceWave } from "./components/MatrixVoiceWave";
import { NeuralNode } from "./components/NeuralNode";
import { SynthesisSpinner } from "./components/SynthesisSpinner";

/**
 * React application root — Neuropunk Cortex surface.
 */
export default function App() {
  return (
    <main className="cortex-root">
      <header className="cortex-brand">
        <h1>Velocity Matrix</h1>
        <p>Ambient Cortex · Synthesis Grid · Resolution Feed</p>
      </header>

      <section className="cortex-stage" aria-label="Cortex stage">
        <MatrixVoiceWave active={false} />
        <SynthesisSpinner synthesizing={false} />
        <NeuralNode />
      </section>
    </main>
  );
}
