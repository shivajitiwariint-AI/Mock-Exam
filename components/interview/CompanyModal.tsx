'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createCompanySchema } from '@/lib/validations/interview.schema'
import type { CompanyData } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type FormData = z.infer<typeof createCompanySchema>

type Props = {
  company?: CompanyData
  onClose: () => void
  onSave: (company: CompanyData) => void
}

export default function CompanyModal({ company, onClose, onSave }: Props) {
  const isEditing = !!company

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(createCompanySchema),
      defaultValues: {
        name: company?.name ?? '',
        website: company?.website ?? '',
        industry: company?.industry ?? '',
        notes: company?.notes ?? '',
      },
    })

  const onSubmit = async (data: FormData) => {
    const url = isEditing ? `/api/interview/companies/${company!.id}` : '/api/interview/companies'
    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const json = await res.json() as { company: CompanyData }
    onSave(json.company)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Company' : 'Add Company'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
          <Input {...register('name')} placeholder="e.g. Google, Microsoft" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
          <Input {...register('industry')} placeholder="e.g. Technology, Finance" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <Input {...register('website')} placeholder="https://company.com" type="url" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Any notes about this company…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Company'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
