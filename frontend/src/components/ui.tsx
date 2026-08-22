import { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
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
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm ${props.className || ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm bg-white ${props.className || ''}`}
    />
  )
}

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-sky-100 text-sky-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
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
