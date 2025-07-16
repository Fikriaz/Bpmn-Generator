import type React from "react"

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    />
  )
}
