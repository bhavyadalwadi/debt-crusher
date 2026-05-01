"use client";

import { useRef } from "react";

interface ImportPanelProps {
  importing: boolean;
  importMode: "replace" | "merge";
  onImportModeChange: (mode: "replace" | "merge") => void;
  onImport: (file: File) => Promise<void>;
}

export function ImportPanel({
  importing,
  importMode,
  onImportModeChange,
  onImport,
}: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="control-strip">
      <div>
        <p className="eyebrow">Backup Import</p>
        <h2>Import a workbook only when you want to seed or restore data.</h2>
        <p className="subtle-copy">
          The main workflow is direct user input in the app. Workbook import is a
          secondary path, and the template below shows the exact structure if you
          want to fill a spreadsheet first.
        </p>
        <div className="inline-links">
          <a className="text-link" href="/debt-crusher-import-template.xlsx" download>
            Download workbook template
          </a>
        </div>
        <div className="import-mode-row">
          <span>Import mode</span>
          <select
            value={importMode}
            onChange={(event) =>
              onImportModeChange(event.target.value as "replace" | "merge")
            }
          >
            <option value="replace">Replace current portfolio</option>
            <option value="merge">Merge into current portfolio</option>
          </select>
        </div>
      </div>
      <div className="control-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden-input"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            await onImport(file);
            event.target.value = "";
          }}
        />
        <button
          className="secondary-button"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {importing ? "Importing..." : "Import Backup Workbook"}
        </button>
      </div>
    </section>
  );
}
