import { useEffect, useState } from 'react'
import { supplierApi } from '../api/suppliers'
import { Supplier } from '../types'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { clearCache } from '../api/cache'

export default function SuppliersPage() {
  const { data: suppliersData } = useCachedFetch('suppliers', () => supplierApi.list())
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [editing, setEditing] = useState<Supplier | null | 'new'>(null)
  const [form, setForm] = useState({ name: '', contact: '', note: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (suppliersData) setSuppliers(suppliersData as Supplier[]) }, [suppliersData])

  const load = () => supplierApi.list().then(setSuppliers)

  const openNew = () => { setForm({ name: '', contact: '', note: '' }); setEditing('new') }
  const openEdit = (s: Supplier) => { setForm({ name: s.name, contact: s.contact || '', note: s.note || '' }); setEditing(s) }

  const save = async () => {
    setLoading(true)
    try {
      const data = { name: form.name, contact: form.contact || undefined, note: form.note || undefined }
      if (editing === 'new') await supplierApi.create(data)
      else if (editing) await supplierApi.update(editing.id, data)
      clearCache('suppliers')
      setEditing(null); load()
    } finally { setLoading(false) }
  }

  const remove = async (s: Supplier) => {
    if (!confirm(`「${s.name}」を削除しますか？`)) return
    clearCache('suppliers')
    await supplierApi.delete(s.id); load()
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">仕入先管理</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> 仕入先を追加
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">仕入先名</th>
              <th className="text-left px-4 py-3">連絡先</th>
              <th className="text-left px-4 py-3">備考</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-400">{s.contact || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-48">{s.note || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(s)}><Pencil className="w-4 h-4 text-gray-500 hover:text-orange-400" /></button>
                    <button onClick={() => remove(s)}><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">仕入先が登録されていません</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing === 'new' ? '仕入先を追加' : '仕入先を編集'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[{ key: 'name', label: '仕入先名', required: true }, { key: 'contact', label: '連絡先' }, { key: 'note', label: '備考' }].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-800 text-sm py-2 rounded-lg">キャンセル</button>
                <button onClick={save} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
