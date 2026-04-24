import { useState } from 'react';
import { buildPrompt, type GenerateOptions } from '../lib/diagram-to-prompt';
import { useDiagram } from './useDiagram';

export function useGenerateDocs() {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(options: GenerateOptions) {
    setLoading(true);
    setError(null);
    setOutput('');

    try {
      // Read diagram state at call time — no subscription needed
      const { id, name, nodes, connectors, regions, viewport } = useDiagram.getState();
      const diagram = { id, name, nodes, connectors, regions, viewport };
      const prompt = buildPrompt(diagram, options);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format: options.format }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { content: string };
      setOutput(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { output, loading, error, generate };
}
