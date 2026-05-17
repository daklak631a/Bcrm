'use client'

import { X, Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

// ==========================================
// MODAL COMPONENT
// ==========================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// FORM COMPONENTS
// ==========================================

interface FormFieldProps {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FormField({ label, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClasses = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow placeholder:text-slate-400"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function FormInput(props: FormInputProps) {
  return <input {...props} className={`${inputClasses} ${props.className || ''}`} />
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export function FormSelect({ children, ...props }: FormSelectProps) {
  return (
    <select {...props} className={`${inputClasses} ${props.className || ''}`}>
      {children}
    </select>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function FormTextarea(props: FormTextareaProps) {
  return (
    <textarea
      {...props}
      rows={props.rows || 3}
      className={`${inputClasses} resize-none ${props.className || ''}`}
    />
  )
}

interface SubmitButtonProps {
  loading?: boolean
  children: ReactNode
  className?: string
}

export function SubmitButton({ loading, children, className = '' }: SubmitButtonProps) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="submit"
        disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-70 shadow-sm ${className}`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    </div>
  )
}
