import { Button } from "@mantine/core";
import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { ListSection } from "@/components/ListSection";
import { ValueRow } from "@/components/ValueRow";
import { exportAddress } from "@/lib/api/exportAddress";
import type { ImportProblem } from "./importProblems";
import { ImportProblemsSheet } from "./ImportProblemsSheet";
import { useImport } from "./useImport";

/** The Settings section for downloading everything and importing items from a CSV file. */
export function ExportImportSection() {
  const [problems, setProblems] = useState<ImportProblem[]>([]);
  const importFile = useImport(setProblems);
  const input = useRef<HTMLInputElement>(null);
  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (chosen) importFile(chosen);
  };
  return (
    <>
      <ListSection title="Export and import">
        <ValueRow name="Export everything">
          <Button component="a" href={exportAddress()} download>
            Download
          </Button>
        </ValueRow>
        <ValueRow name="Insurance list">
          <Button component={Link} to="/insurance">
            Open
          </Button>
        </ValueRow>
        <ValueRow name="Import from CSV">
          <Button onClick={() => input.current?.click()}>Choose file</Button>
          <input
            ref={input}
            hidden
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={picked}
          />
        </ValueRow>
      </ListSection>
      <ImportProblemsSheet problems={problems} onClose={() => setProblems([])} />
    </>
  );
}
