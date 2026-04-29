import { X, RotateCcw, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuildAgent } from '../../hooks/useBuildAgent';
import { useDiagram } from '../../hooks/useDiagram';
import styles from './GenerateModal.module.css';

const STEP_LABELS: Record<string, string> = {
  generating_plan: 'Generating plan...',
  recommending_skills: 'Recommending skills...',
};

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
}

export function GenerateModal({ open, onClose }: GenerateModalProps) {
  const { status, step, result, error, build, retry } = useBuildAgent();
  const selectedNodeId = useDiagram((s) => s.selection.id);

  const isRunning = status === 'running' || status === 'pending';

  function handleBuild() {
    if (selectedNodeId) build(selectedNodeId);
  }

  const stepLabel = step ? (STEP_LABELS[step] ?? step) : null;
  const showRetry = status === 'failed' || (status === 'done' && (result?.warnings?.length ?? 0) > 0);

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
              <h2 className={styles.title}>Build Implementation</h2>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.controls}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Target node</span>
                  <span className={styles.nodeId}>
                    {selectedNodeId ?? <em>No node selected</em>}
                  </span>
                </div>

                <button
                  className={styles.generateBtn}
                  onClick={handleBuild}
                  disabled={isRunning || !selectedNodeId}
                >
                  <Rocket size={14} />
                  {isRunning ? 'Building...' : 'Build'}
                </button>

                {showRetry && (
                  <button className={styles.retryBtn} onClick={retry}>
                    <RotateCcw size={13} /> Retry
                  </button>
                )}

                {error && <p className={styles.error}>{error}</p>}

                {result?.warnings && result.warnings.length > 0 && (
                  <div className={styles.warnings}>
                    {result.warnings.map((w, i) => (
                      <p key={i} className={styles.warning}>{w}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.results}>
                {!result && !isRunning && !error && (
                  <p className={styles.placeholder}>
                    Select a node and click Build to generate an implementation plan.
                  </p>
                )}

                {isRunning && stepLabel && (
                  <p className={styles.stepLabel}>{stepLabel}</p>
                )}

                {result && (
                  <>
                    {result.plan.length > 0 && (
                      <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Implementation Plan</h3>
                        <ol className={styles.planList}>
                          {result.plan.map((s) => (
                            <li key={s.order} className={styles.planStep}>
                              <strong>{s.title}</strong>
                              <p>{s.description}</p>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {result.prompts.length > 0 && (
                      <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Prompt Files</h3>
                        <ol className={styles.promptList}>
                          {result.prompts.map((p, i) => (
                            <li key={p.filename} className={styles.promptFile}>
                              <span className={styles.promptIndex}>{i + 1}.</span>
                              <span className={styles.promptName}>{p.filename}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
