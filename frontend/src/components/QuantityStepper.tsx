import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import classes from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  onChange: (quantity: number) => void;
}

export function QuantityStepper({ value, onChange }: QuantityStepperProps) {
  const [typing, setTyping] = useState(false);
  const [digits, setDigits] = useState(String(value).length);
  const numberRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!typing && restoreFocus.current) {
      restoreFocus.current = false;
      numberRef.current?.focus();
    }
  }, [typing]);

  function startTyping() {
    setDigits(String(value).length);
    setTyping(true);
  }

  function finishTyping(typed: string) {
    setTyping(false);
    const quantity = /^\d+$/.test(typed.trim()) ? Number(typed) : 0;
    if (quantity >= 1 && quantity !== value) onChange(quantity);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      restoreFocus.current = true;
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      restoreFocus.current = true;
      event.currentTarget.value = String(value);
      event.currentTarget.blur();
    }
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
          style={{ "--digits": Math.max(2, digits) } as CSSProperties}
          aria-label="Quantity"
          inputMode="numeric"
          defaultValue={value}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDigits(event.currentTarget.value.length)}
          onBlur={(event) => finishTyping(event.currentTarget.value)}
          onKeyDown={handleKey}
        />
      ) : (
        <button
          ref={numberRef}
          type="button"
          className={classes.number}
          aria-label={`Quantity ${value}, type a number`}
          onClick={startTyping}
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
