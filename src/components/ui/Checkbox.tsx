import type React from "react"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Checkbox({ className = "", ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border border-primary text-primary focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    />
  )
}
