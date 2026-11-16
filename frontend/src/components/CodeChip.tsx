import classes from "./CodeChip.module.css";

interface CodeChipProps {
  code: string;
  large?: boolean;
  blank?: boolean;
}

export function CodeChip({ code, large = false, blank = false }: CodeChipProps) {
  return (
    <span className={classes.chip} data-large={large || undefined} data-blank={blank || undefined}>
      {code}
    </span>
  );
}
