import type { DiagramState } from '../types/diagram';

export type DocFormat = 'CLAUDE.md' | 'README.md' | 'OpenAPI YAML' | 'Terraform' | 'Docker Compose';

export interface GenerateOptions {
  format: DocFormat;
  scope: 'full' | 'selected';
  selectedNodeIds?: string[];
  includeApiSpecs: boolean;
  includeDataModels: boolean;
  includeAuthFlows: boolean;
  includeEnvVars: boolean;
  includeMermaid: boolean;
}

export function buildPrompt(diagram: DiagramState, options: GenerateOptions): string {
  const scopedDiagram =
    options.scope === 'selected' && options.selectedNodeIds?.length
      ? {
          ...diagram,
          nodes: diagram.nodes.filter((n) => options.selectedNodeIds!.includes(n.id)),
          connectors: diagram.connectors.filter(
            (c) =>
              options.selectedNodeIds!.includes(c.sourceNodeId) &&
              options.selectedNodeIds!.includes(c.targetNodeId)
          ),
        }
      : diagram;

  const inclusions = [
    options.includeApiSpecs && 'API endpoint specifications (method, path, auth, request/response schemas)',
    options.includeDataModels && 'Data model descriptions',
    options.includeAuthFlows && 'Authentication and authorization flows',
    options.includeEnvVars && 'Environment variable requirements',
    options.includeMermaid && 'Mermaid diagram of the architecture',
  ]
    .filter(Boolean)
    .join('\n- ');

  return `You are a senior backend architect. Given the following system architecture diagram JSON, generate a ${options.format} document.

The output should include:
- Service descriptions and responsibilities
- ${inclusions}
- Inter-service communication patterns
- Deployment topology

Output ONLY the ${options.format} document content, no additional commentary.

Diagram JSON:
${JSON.stringify(scopedDiagram, null, 2)}`;
}
