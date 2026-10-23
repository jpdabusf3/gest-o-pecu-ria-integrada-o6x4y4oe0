import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HeartHandshake, Loader2, Sparkles } from 'lucide-react'
import { EstacaoMontaRecord, cadastrarAcaoIatf } from '@/services/reproducao'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ModalCadastroIatfProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estacoes: EstacaoMontaRecord[]
  estacaoPadraoId?: string
  onSucesso?: () => void
}

export function ModalCadastroIatf({
  open,
  onOpenChange,
  estacoes,
  estacaoPadraoId,
  onSucesso,
}: ModalCadastroIatfProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [salvando, setSalvando] = useState(false)
  const [estacaoId, setEstacaoId] = useState<string>(estacaoPadraoId || (estacoes[0]?.id ?? 'nova'))
  const [anoSafra, setAnoSafra] = useState<string>(estacoes[0]?.ano_safra || '2025/2026')
  const [dataAcao, setDataAcao] = useState<string>(new Date().toISOString().slice(0, 10))
  const [loteNome, setLoteNome] = useState<string>('')
  const [quantidadeMatrizes, setQuantidadeMatrizes] = useState<number>(30)
  const [touroSemen, setTouroSemen] = useState<string>('')
  const [touroRegistro, setTouroRegistro] = useState<string>('')
  const [protocolo, setProtocolo] = useState<string>('Protocolo 3 Manejos (BE + P4 + PGF + CE)')
  const [rodada, setRodada] = useState<'1' | '2' | '3' | 'repasse'>('1')
  const [veterinario, setVeterinario] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')

  const handleEstacaoChange = (id: string) => {
    setEstacaoId(id)
    const selecionada = estacoes.find((e) => e.id === id)
    if (selecionada) {
      setAnoSafra(selecionada.ano_safra)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loteNome.trim()) {
      toast({
        title: 'Lote obrigatório',
        description: 'Informe o lote ou piquete das matrizes expostas à ação de IATF.',
        variant: 'destructive',
      })
      return
    }

    if (!touroSemen.trim()) {
      toast({
        title: 'Touro / Sêmen obrigatório',
        description: 'Informe o touro ou sêmen utilizado na inseminação.',
        variant: 'destructive',
      })
      return
    }

    if (quantidadeMatrizes <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe a quantidade de matrizes inseminadas nesta rodada.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const res = await cadastrarAcaoIatf(
        {
          estacao_id: estacaoId === 'nova' ? undefined : estacaoId,
          ano_safra: anoSafra,
          data_acao: dataAcao,
          lote_nome: loteNome.trim(),
          quantidade_matrizes: quantidadeMatrizes,
          touro_semen: touroSemen.trim(),
          touro_registro: touroRegistro.trim() || undefined,
          protocolo: protocolo.trim(),
          rodada,
          veterinario: veterinario.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
        },
        user ? { id: user.id, nome: user.name || 'Gestor', perfil: user.role } : undefined,
      )

      toast({
        title: 'Rodada de IATF registrada!',
        description: res.mensagem,
      })

      // Reset
      setLoteNome('')
      setTouroSemen('')
      setTouroRegistro('')
      setObservacoes('')
      onOpenChange(false)
      onSucesso?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar IATF',
        description: err.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg text-foreground">
                Cadastrar Ação / Rodada de IATF
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre os dados operacionais da inseminação artificial em tempo fixo para a
                estação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          {/* Estação e Safra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Estação de Monta</Label>
              <Select value={estacaoId} onValueChange={handleEstacaoChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione a estação" />
                </SelectTrigger>
                <SelectContent>
                  {estacoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.ano_safra})
                    </SelectItem>
                  ))}
                  <SelectItem value="nova">+ Nova Estação de Monta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ano Safra</Label>
              <Input
                value={anoSafra}
                onChange={(e) => setAnoSafra(e.target.value)}
                placeholder="2025/2026"
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          {/* Data e Rodada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data da Inseminação</Label>
              <Input
                type="date"
                value={dataAcao}
                onChange={(e) => setDataAcao(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Rodada</Label>
              <Select value={rodada} onValueChange={(v: any) => setRodada(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª Rodada IATF</SelectItem>
                  <SelectItem value="2">2ª Rodada IATF (Ressinc)</SelectItem>
                  <SelectItem value="3">3ª Rodada IATF</SelectItem>
                  <SelectItem value="repasse">Repasse com Touro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Qtd. Matrizes Expostas</Label>
              <Input
                type="number"
                min={1}
                value={quantidadeMatrizes}
                onChange={(e) => setQuantidadeMatrizes(parseInt(e.target.value, 10) || 0)}
                className="h-8 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Lote e Veterinário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Lote / Piquete das Matrizes *</Label>
              <Input
                value={loteNome}
                onChange={(e) => setLoteNome(e.target.value)}
                placeholder="Ex: Lote Primíparas Piatã, Lote 04..."
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Veterinário / Inseminador</Label>
              <Input
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
                placeholder="Ex: Dr. Carlos Mendonça (CRMV-MS 1420)"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Touro e Registro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Touro / Sêmen Utilizado *</Label>
              <Input
                value={touroSemen}
                onChange={(e) => setTouroSemen(e.target.value)}
                placeholder="Ex: Rifle PHOC, Rem USP, Astro Jacamin..."
                className="h-8 text-xs font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Registro / RGD do Touro (opcional)</Label>
              <Input
                value={touroRegistro}
                onChange={(e) => setTouroRegistro(e.target.value)}
                placeholder="Ex: PHOC 2163, 197217AJ..."
                className="h-8 text-xs uppercase font-mono"
              />
            </div>
          </div>

          {/* Protocolo Hormonal */}
          <div className="space-y-1">
            <Label className="text-xs">Protocolo Reprodutivo</Label>
            <Input
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              placeholder="Ex: D0 BE + Dispositivo P4, D8 Retirada + PGF + CE + eCG, D10 IATF"
              className="h-8 text-xs"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs">Observações do Manejo</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Condição corporal média ECC 3.25; sêmen convencional lote 8492..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold gap-1.5"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gravando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Salvar Rodada de IATF
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
