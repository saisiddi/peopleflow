import { ReactNode } from 'react'

/* Tidal design system — deep ink #0B2740 / abyss #061524 / aqua #4CC2FF / foam #F4F9FC */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl shadow-[0_1px_2px_rgba(6,21,36,0.05)] border border-[#0B2740]/10 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-[#0B2740] text-white hover:bg-[#061524]',
    ghost: 'bg-[#EDF4F9] text-[#0B2740] hover:bg-[#E1EEF7]',
    danger: 'bg-[#FF6B5E] text-white hover:bg-[#FF574A]',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-2xl text-sm font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-2xl border border-[#0B2740]/12 bg-white focus:border-[#4CC2FF] focus:outline-none focus:ring-4 focus:ring-[#4CC2FF]/15 text-sm placeholder:text-slate-400 transition ${props.className || ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-2xl border border-[#0B2740]/12 focus:border-[#4CC2FF] focus:outline-none focus:ring-4 focus:ring-[#4CC2FF]/15 text-sm bg-white transition ${props.className || ''}`}
    />
  )
}

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-[#EDF4F9] text-[#0B2740]/70',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-[#FF6B5E]/10 text-[#E14A3D]',
    blue: 'bg-sky-50 text-sky-700',
    indigo: 'bg-[#EAF4FB] text-[#0B6FA8]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    present: ['green', 'Present'],
    absent: ['red', 'Absent'],
    half_day: ['amber', 'Half day'],
    on_leave: ['blue', 'On leave'],
    pending_exit: ['amber', 'Pending exit'],
    pending: ['amber', 'Pending'],
    approved: ['green', 'Approved'],
    rejected: ['red', 'Rejected'],
  }
  const [color, label] = map[status] || ['slate', status]
  return <Badge color={color}>{label}</Badge>
}
