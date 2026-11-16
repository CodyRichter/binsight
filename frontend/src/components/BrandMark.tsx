import classes from "./BrandMark.module.css";

export function BrandMark() {
  return (
    <svg aria-hidden className={classes.mark} viewBox="0 0 32 32" width={28} height={28}>
      <path className={classes.body} d="M4 10H28L26.2 25.4Q25.9 28 23.3 28H8.7Q6.1 28 5.8 25.4Z" />
      <rect className={classes.label} x="10" y="14.5" width="12" height="8.5" rx="1.4" />
      <path
        className={classes.lid}
        d="M4.2 4H27.8Q30 4 30 6.2V9.3Q30 10 29.3 10H2.7Q2 10 2 9.3V6.2Q2 4 4.2 4Z"
      />
    </svg>
  );
}
