import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText, Upload, Trash2, Search, FileImage, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

interface DocumentRecord {
  id: string
  name: string
  type: string
  date: string
  size: string
}

export function DocumentManager({ entityId }: { entityId: string }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([
    { id: '1', name: 'GTA_Entrada_45091.pdf', type: 'GTA', date: '15/04/2025', size: '245 KB' },
    {
      id: '2',
      name: 'Exame_Brucelose.pdf',
      type: 'Laboratório',
      date: '10/03/2026',
      size: '1.2 MB',
    },
    {
      id: '3',
      name: 'NF_Compra_Insumos.pdf',
      type: 'Nota Fiscal',
      date: '01/02/2026',
      size: '512 KB',
    },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadType, setUploadType] = useState('Outros')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const newDoc: DocumentRecord = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: uploadType,
        date: new Date().toLocaleDateString('pt-BR'),
        size: `${(file.size / 1024).toFixed(1)} KB`,
      }
      setDocuments([newDoc, ...documents])
      toast({
        title: 'Documento Anexado',
        description: `${file.name} foi salvo com sucesso no repositório.`,
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = (id: string, name: string) => {
    setDocuments(documents.filter((d) => d.id !== id))
    toast({
      title: 'Documento Removido',
      description: `${name} foi excluído do sistema.`,
      variant: 'destructive',
    })
  }

  const filteredDocs = documents.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Documento Digital</CardTitle>
          <CardDescription>
            Anexe arquivos importantes como GTAs, Notas Fiscais e exames para o registro {entityId}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="space-y-2 w-full sm:w-[250px]">
              <Label>Categoria do Documento</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GTA">Guia de Trânsito (GTA)</SelectItem>
                  <SelectItem value="Nota Fiscal">Nota Fiscal</SelectItem>
                  <SelectItem value="Laboratório">Exame Laboratorial</SelectItem>
                  <SelectItem value="Receituário">Receituário</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto flex-1 max-w-sm">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                <Upload className="h-4 w-4" /> Selecionar e Enviar Arquivo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Repositório de Documentos</CardTitle>
            <CardDescription>
              Gerencie todos os arquivos vinculados a esta entidade.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou tipo..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Arquivo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2 whitespace-nowrap">
                      {doc.name.endsWith('.pdf') ? (
                        <FileText className="h-4 w-4 text-red-500" />
                      ) : (
                        <FileImage className="h-4 w-4 text-blue-500" />
                      )}
                      {doc.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {doc.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {doc.size}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" title="Baixar">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(doc.id, doc.name)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum documento encontrado com os critérios atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
