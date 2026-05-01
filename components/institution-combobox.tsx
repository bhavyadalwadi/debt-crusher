"use client";

import { useEffect, useMemo, useState } from "react";
import type { InstitutionOption } from "@/lib/institution-options";

interface InstitutionComboboxProps {
  value: string;
  placeholder: string;
  options: InstitutionOption[];
  invalid?: boolean;
  onChange: (value: string) => void;
}

function matchesOption(option: InstitutionOption, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (option.label.toLowerCase().includes(normalized)) {
    return true;
  }

  return option.keywords.some((keyword) => keyword.includes(normalized));
}

export function InstitutionCombobox({
  value,
  placeholder,
  options,
  invalid = false,
  onChange,
}: InstitutionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesOption(option, value)).slice(0, 8),
    [options, value],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  function chooseOption(option: InstitutionOption) {
    onChange(option.label);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="combobox-shell">
      <input
        className={invalid ? "field-invalid" : ""}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setOpen(true);
            return;
          }

          if (!filteredOptions.length) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % filteredOptions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) =>
              current === 0 ? filteredOptions.length - 1 : current - 1,
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            chooseOption(filteredOptions[activeIndex] ?? filteredOptions[0]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && filteredOptions.length > 0 ? (
        <div className="combobox-menu" role="listbox">
          {filteredOptions.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={`combobox-option${index === activeIndex ? " active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                chooseOption(option);
              }}
            >
              <strong>{option.label}</strong>
              <span>{option.keywords[0]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
