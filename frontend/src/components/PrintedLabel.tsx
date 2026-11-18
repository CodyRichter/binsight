import classes from "./PrintedLabel.module.css";

interface PrintedLabelProps {
  code: string;
  imageUrl: string;
}

/** A location's label on its printed sheet, so the paper can be scanned like the bin. */
export function PrintedLabel({ code, imageUrl }: PrintedLabelProps) {
  return <img className={classes.label} src={imageUrl} alt={`Label ${code}`} />;
}
