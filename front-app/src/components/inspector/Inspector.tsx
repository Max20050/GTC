import { useDiagram } from '../../hooks/useDiagram';
import { NodeDetail } from './NodeDetail';
import { ConnectorDetail } from './ConnectorDetail';
import styles from './Inspector.module.css';

export function Inspector() {
  const selection = useDiagram((s) => s.selection);
  const nodes = useDiagram((s) => s.nodes);
  const connectors = useDiagram((s) => s.connectors);

  const selectedNode = selection.type === 'node'
    ? nodes.find((n) => n.id === selection.id) ?? null
    : null;

  const selectedConnector = selection.type === 'connector'
    ? connectors.find((c) => c.id === selection.id) ?? null
    : null;

  return (
    <aside className={styles.inspector}>
      {selectedNode && <NodeDetail node={selectedNode} />}
      {selectedConnector && <ConnectorDetail connector={selectedConnector} nodes={nodes} />}
      {!selectedNode && !selectedConnector && (
        <div className={styles.empty}>
          <p>Select a node or connector to inspect it.</p>
        </div>
      )}
    </aside>
  );
}
