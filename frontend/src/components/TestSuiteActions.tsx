import { useRef, useState } from "react";
import { exportTestSuite, parseTestSuite, type TestDefinition } from "../reporting/testSuite";

interface Props { tests: TestDefinition[]; onImport?: (tests: TestDefinition[]) => void; disabled?: boolean; }

export function TestSuiteActions({ tests, onImport, disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [reading, setReading] = useState(false);
  return <div className="test-suite-actions">
    <div className="heading-actions">
      {onImport && <>
        <button type="button" className="secondary-button" disabled={disabled || reading} onClick={() => input.current?.click()}>{reading ? "Importing..." : "Import tests"}</button>
        <input ref={input} type="file" aria-label="Import test suite JSON" accept=".json,application/json" hidden disabled={disabled || reading} onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError(undefined);
          setReading(true);
          try { onImport(parseTestSuite(await file.text())); }
          catch (caught) { setError(caught instanceof Error ? caught.message : "The test suite could not be imported."); }
          finally { setReading(false); }
        }} />
      </>}
      <button type="button" className="secondary-button" disabled={disabled || !tests.length} onClick={() => { try { exportTestSuite(tests); setError(undefined); } catch { setError("The test suite could not be exported."); } }}>Export tests</button>
    </div>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </div>;
}
