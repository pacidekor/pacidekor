"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /** Optional icon on the left (e.g. Lock in admin login). */
  leading?: ReactNode;
};

export function PasswordField({
  leading,
  className = "",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leading}
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-2.5 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/40 transition-colors hover:bg-[#2f2924]/5 hover:text-[#2f2924]/70"
        aria-label={visible ? "Skryť heslo" : "Zobraziť heslo"}
        tabIndex={props.tabIndex}
      >
        {visible ? (
          <EyeOff className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="size-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>
  );
}
