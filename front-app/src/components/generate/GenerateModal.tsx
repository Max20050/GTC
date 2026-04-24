import { useState } from 'react';
import { X, Download, Copy, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerateDocs } from '../../hooks/useGenerateDocs';
import type { DocFormat, GenerateOptions } from '../../lib/diagram-to-prompt';
import { DocPreview } from './DocPreview';
import styles from './GenerateModal.module.css';

const FORMATS: DocFormat[] = ['CLAUDE.md', 'README.md', 'OpenAPI YAML', 'Terraform', 'Docker Compose'];

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
}

export function GenerateModal({ open, onClose }: GenerateModalProps) {
  const [format, setFormat] = useState<DocFormat>('CLAUDE.md');
  const [scope, setScope] = useState<'full' | 'selected'>('full');
  const [includeApiSpecs, setIncludeApiSpecs] = useState(true);
  const [includeDataModels, setIncludeDataModels] = useState(true);
  const [includeAuthFlows, setIncludeAuthFlows] = useState(true);
  const [includeEnvVars, setIncludeEnvVars] = useState(true);
  const [includeMermaid, setIncludeMermaid] = useState(false);

  const { output, loading, error, generate } = useGenerateDocs();

  function handleGenerate() {
    const opts: GenerateOptions = {
      format,
      scope,
      includeApiSpecs,
      includeDataModels,
      includeAuthFlows,
      includeEnvVars,
      includeMermaid,
    };
    generate(opts);
  }

  function handleCopy() {
    if (output) navigator.clipboard.writeText(output);
  }

  function handleDownload() {
    const ext = format.endsWith('.md') ? 'md' : format.endsWith('YAML') ? 'yaml' : 'tf';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format.toLowerCase().replace(/\s/g, '-').replace('.', '-') + '.' + ext;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Generate Documentation</h2>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.controls}>
                <Field label="Output format">
                  <div className={styles.radioGroup}>
                    {FORMATS.map((f) => (
                      <label key={f} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="format"
                          value={f}
                          checked={format === f}
                          onChange={() => setFormat(f)}
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Scope">
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="scope"
                        value="full"
                        checked={scope === 'full'}
                        onChange={() => setScope('full')}
                      />
                      Full diagram
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="scope"
                        value="selected"
                        checked={scope === 'selected'}
                        onChange={() => setScope('selected')}
                      />
                      Selected nodes
                    </label>
                  </div>
                </Field>

                <Field label="Include">
                  <div className={styles.checkGroup}>
                    <Check label="API specs" checked={includeApiSpecs} onChange={setIncludeApiSpecs} />
                    <Check label="Data models" checked={includeDataModels} onChange={setIncludeDataModels} />
                    <Check label="Auth flows" checked={includeAuthFlows} onChange={setIncludeAuthFlows} />
                    <Check label="Env vars" checked={includeEnvVars} onChange={setIncludeEnvVars} />
                    <Check label="Mermaid diagram" checked={includeMermaid} onChange={setIncludeMermaid} />
                  </div>
                </Field>

                <button
                  className={styles.generateBtn}
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  <FileCode size={14} />
                  {loading ? 'Generating…' : 'Generate with Claude'}
                </button>

                {error && <p className={styles.error}>{error}</p>}
              </div>

              <div className={styles.preview}>
                <DocPreview content={output} format={format} />
                {output && (
                  <div className={styles.previewActions}>
                    <button className={styles.actionBtn} onClick={handleCopy}>
                      <Copy size={13} /> Copy
                    </button>
                    <button className={styles.actionBtn} onClick={handleDownload}>
                      <Download size={13} /> Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.checkLabel}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
