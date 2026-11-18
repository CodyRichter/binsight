import { Button } from "@mantine/core";
import { Sheet } from "@/components/Sheet";
import { ValueRow } from "@/components/ValueRow";
import { problemText, type ImportProblem } from "./importProblems";

interface ImportProblemsSheetProps {
  problems: ImportProblem[];
  onClose: () => void;
}

/** Why nothing was imported: each row's problem, so the file can be fixed and chosen again. */
export function ImportProblemsSheet({ problems, onClose }: ImportProblemsSheetProps) {
  return (
    <Sheet
      opened={problems.length > 0}
      title="Can't import"
      onClose={onClose}
      rows={problems.map((problem) => (
        <ValueRow key={`${problem.row}-${problem.column ?? ""}`} name={`Row ${problem.row}`}>
          {problemText(problem)}
        </ValueRow>
      ))}
    >
      <Button variant="primary" onClick={onClose}>
        Close
      </Button>
    </Sheet>
  );
}
