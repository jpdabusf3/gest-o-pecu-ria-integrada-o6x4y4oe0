import React, { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Trash2, Upload, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ModalFotoPerfilProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalFotoPerfil({ open, onOpenChange }: ModalFotoPerfilProps) {
  const { user, updateAvatar, removeAvatar } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validações
    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB. Escolha outra foto.',
        variant: 'destructive',
      })
      return
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validMimes.includes(file.type)) {
      toast({
        title: 'Formato não suportado',
        description: 'Por favor, selecione uma imagem em formato JPG, PNG, WEBP ou GIF.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
  }

  const handleSalvar = async () => {
    if (!selectedFile) return
    try {
      setLoading(true)
      await updateAvatar(selectedFile)
      toast({
        title: 'Foto Atualizada!',
        description: 'Sua foto de perfil foi alterada com sucesso.',
      })
      onOpenChange(false)
      setPreview(null)
      setSelectedFile(null)
    } catch (err: any) {
      toast({
        title: 'Erro no Upload',
        description: err?.message || 'Não foi possível salvar sua foto de perfil.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemover = async () => {
    try {
      setLoading(true)
      await removeAvatar()
      toast({
        title: 'Foto Removida',
        description: 'Sua foto foi removida. O perfil agora usa o avatar padrão com suas iniciais.',
      })
      setPreview(null)
      setSelectedFile(null)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao remover',
        description: err?.message || 'Falha ao remover foto de perfil.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currentDisplayAvatar = preview || user.avatar

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          setPreview(null)
          setSelectedFile(null)
        }
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Foto de Perfil
          </DialogTitle>
          <DialogDescription>
            Atualize sua foto para identificação no sistema e relatórios de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="relative group">
            <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-md">
              <AvatarImage src={currentDisplayAvatar} alt={user.name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Trocar imagem"
            >
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-[11px] font-medium">Trocar</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center text-center">
            <p className="font-semibold text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Formatos aceitos: JPG, PNG, WEBP (máx. 5MB)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="h-4 w-4" /> Selecionar Foto
            </Button>

            {user.avatar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleRemover}
                disabled={loading}
                title="Remover foto e voltar ao avatar com iniciais"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          {selectedFile && (
            <Button type="button" onClick={handleSalvar} disabled={loading} className="gap-1.5">
              <Check className="h-4 w-4" />
              {loading ? 'Enviando...' : 'Salvar Foto'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
