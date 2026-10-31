import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  AlertCircle,
} from 'lucide-react';
import { TimerDefinition } from '../types/timer';
import {
  serializeTimersForExport,
  parseImportedTimersJson,
} from '../services/storage';

interface ImportExportModalProps {
  timers: TimerDefinition[];
  onImportTimers: (imported: TimerDefinition[], mode: 'merge' | 'replace') => void;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  timers,
  onImportTimers,
  onClose,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportedJson = serializeTimersForExport(timers);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-timers-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportText(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const parsed = parseImportedTimersJson(importText);
      onImportTimers(parsed, importMode);
      setSuccessMsg(`Imported ${parsed.length} timer definition(s) successfully.`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import JSON.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel io-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="io-modal-title"
      >
        <div className="modal-header">
          <h3 id="io-modal-title">
            <FileJson size={18} strokeWidth={1.6} />
            <span>Export & Import Timer Definitions</span>
          </h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        <div className="segmented-control">
          <button
            type="button"
            className={`segment-btn ${tab === 'export' ? 'active' : ''}`}
            onClick={() => {
              setTab('export');
              setErrorMsg(null);
            }}
          >
            <Download size={15} strokeWidth={1.6} />
            <span>Export ({timers.length})</span>
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'import' ? 'active' : ''}`}
            onClick={() => {
              setTab('import');
              setErrorMsg(null);
            }}
          >
            <Upload size={15} strokeWidth={1.6} />
            <span>Import JSON</span>
          </button>
        </div>

        {tab === 'export' ? (
          <div className="io-body">
            <p className="io-description">
              Download your saved timer definitions as a JSON file or copy the JSON payload to share across devices.
            </p>
            <textarea
              readOnly
              className="json-textarea"
              value={exportedJson}
              aria-label="Exported timers JSON"
            />
            <div className="io-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyJson}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                className="btn-solid"
                onClick={handleDownloadJson}
              >
                <Download size={16} />
                <span>Download .json</span>
              </button>
            </div>
          </div>
        ) : (
          <form className="io-body" onSubmit={handleConfirmImport}>
            <div className="upload-row">
              <p className="io-description">
                Upload a `.json` file or paste exported timer JSON below:
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>Choose .json File</span>
              </button>
            </div>

            <textarea
              className="json-textarea"
              placeholder='Paste timer JSON here (e.g. {"timers": [...]})'
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setErrorMsg(null);
              }}
              aria-label="Import timers JSON input"
            />

            <div className="import-mode-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span>Merge with existing timers</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>Replace all timers</span>
              </label>
            </div>

            {errorMsg && (
              <div className="alert-banner error" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert-banner success" role="status">
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="io-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-solid"
                disabled={!importText.trim()}
              >
                <Upload size={16} />
                <span>Import Timers</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

