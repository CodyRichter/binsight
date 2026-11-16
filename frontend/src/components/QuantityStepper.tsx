import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useState, type KeyboardEvent } from "react";
import classes from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  onChange: (quantity: number) => void;
}

export function QuantityStepper({ value, onChange }: QuantityStepperProps) {
  const [typing, setTyping] = useState(false);

  function finishTyping(typed: string) {
    setTyping(false);
    const quantity = /^\d+$/.test(typed.trim()) ? Number(typed) : 0;
    if (quantity >= 1 && quantity !== value) onChange(quantity);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") finishTyping(event.currentTarget.value);
    if (event.key === "Escape") setTyping(false);
  }

  return (
    <span className={classes.stepper}>
      <button
        type="button"
        className={classes.step}
        aria-label="One fewer"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <IconMinus aria-hidden size={20} />
      </button>
      {typing ? (
        <input
          className={classes.typed}
          aria-label="Quantity"
          inputMode="numeric"
          defaultValue={value}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => finishTyping(event.currentTarget.value)}
          onKeyDown={handleKey}
        />
      ) : (
        <button
          type="button"
          className={classes.number}
          aria-label={`Quantity ${value}, type a number`}
          onClick={() => setTyping(true)}
        >
          {value}
        </button>
      )}
      <button
        type="button"
        className={classes.step}
        aria-label="One more"
        onClick={() => onChange(value + 1)}
      >
        <IconPlus aria-hidden size={20} />
      </button>
    </span>
  );
}
