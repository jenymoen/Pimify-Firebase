"use client";

import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { useFormStatus } from 'react-dom';

type SubmitButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  loadingText?: string;
};

export function SubmitButton({ children, loadingText = 'Saving...', className, disabled, ...rest }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-busy={pending}
      disabled={pending || disabled}
      className={`px-3 py-2 rounded ${pending ? 'opacity-70 cursor-not-allowed' : ''} ${className || ''}`}
      {...rest}
    >
      {pending ? loadingText : children}
    </button>
  );
}


