import { Plus, Trash2 } from 'lucide-react';
import type { DiagramNode, Contract } from '../../types/diagram';
import styles from './Detail.module.css';

const PRIMITIVE_TYPES = ['string', 'number', 'boolean', 'Date', 'string[]', 'number[]'];

interface Props {
  node: DiagramNode;
  onChange: (contracts: Contract[]) => void;
}

export function ContractsEditor({ node, onChange }: Props) {
  const contracts = (node.config._contracts as Contract[] | undefined) ?? [];

  function addContract() {
    onChange([...contracts, { name: 'NewStruct', fields: [] }]);
  }

  function removeContract(idx: number) {
    onChange(contracts.filter((_, i) => i !== idx));
  }

  function updateContractName(idx: number, name: string) {
    const next = contracts.map((c, i) => (i === idx ? { ...c, name } : c));
    onChange(next);
  }

  function addField(contractIdx: number) {
    const next = contracts.map((c, i) =>
      i === contractIdx ? { ...c, fields: [...c.fields, { name: 'field', type: 'string' }] } : c
    );
    onChange(next);
  }

  function removeField(contractIdx: number, fieldIdx: number) {
    const next = contracts.map((c, i) =>
      i === contractIdx
        ? { ...c, fields: c.fields.filter((_, fi) => fi !== fieldIdx) }
        : c
    );
    onChange(next);
  }

  function updateField(
    contractIdx: number,
    fieldIdx: number,
    patch: { name?: string; type?: string }
  ) {
    const next = contracts.map((c, i) =>
      i === contractIdx
        ? {
            ...c,
            fields: c.fields.map((f, fi) =>
              fi === fieldIdx ? { ...f, ...patch } : f
            ),
          }
        : c
    );
    onChange(next);
  }

  return (
    <div className={styles.contractsEditor}>
      {contracts.length === 0 && (
        <p className={styles.emptyHint}>No contracts defined</p>
      )}

      {contracts.map((contract, ci) => (
        <div key={ci} className={styles.contractBlock}>
          <div className={styles.contractHeader}>
            <input
              className={styles.contractNameInput}
              value={contract.name}
              onChange={(e) => updateContractName(ci, e.target.value)}
              aria-label="Contract name"
            />
            <button
              className={styles.removeBtn}
              aria-label="Remove contract"
              onClick={() => removeContract(ci)}
            >
              <Trash2 size={11} />
            </button>
          </div>

          <div className={styles.fieldList}>
            {contract.fields.map((field, fi) => (
              <div key={fi} className={styles.fieldRow}>
                <input
                  className={styles.fieldName}
                  value={field.name}
                  onChange={(e) => updateField(ci, fi, { name: e.target.value })}
                  aria-label="Field name"
                  list={`types-${ci}-${fi}`}
                />
                <input
                  className={styles.fieldType}
                  value={field.type}
                  onChange={(e) => updateField(ci, fi, { type: e.target.value })}
                  aria-label="Field type"
                  list={`types-${ci}-${fi}`}
                />
                <datalist id={`types-${ci}-${fi}`}>
                  {PRIMITIVE_TYPES.map((t) => <option key={t} value={t} />)}
                </datalist>
                <button
                  className={styles.removeBtn}
                  aria-label="Remove field"
                  onClick={() => removeField(ci, fi)}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button
              className={styles.addFieldBtn}
              aria-label="Add field"
              onClick={() => addField(ci)}
            >
              <Plus size={11} /> field
            </button>
          </div>
        </div>
      ))}

      <button className={styles.addStructBtn} onClick={addContract}>
        <Plus size={11} /> Add struct
      </button>
    </div>
  );
}
