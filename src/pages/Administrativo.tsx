import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { farmRegistry, businessContacts } from '@/data/mock'
import { Building2, Save, Plus, Users, MapPin } from 'lucide-react'

function ContactDialog({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    onSave()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Contato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Parceiro de Negócios</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Contato ou Empresa</Label>
            <Input placeholder="Ex: Frigorífico ABC" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select defaultValue="comprador">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprador">Comprador</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="contato@empresa.com" />
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Contato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Administrativo() {
  const { toast } = useToast()
  const [farmData, setFarmData] = useState(farmRegistry)

  const handleSaveRegistry = () => {
    toast({
      title: 'Registro Atualizado',
      description: 'Os dados da propriedade foram salvos com sucesso na base administrativa.',
    })
  }

  const handleSaveContact = () => {
    toast({
      title: 'Contato Adicionado',
      description: 'Novo parceiro de negócio registrado no sistema.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Cadastro Administrativo
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie os dados oficiais da propriedade e centralize sua rede de contatos.
        </p>
      </div>

      <Tabs defaultValue="registro" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="registro" className="gap-2">
            <MapPin className="h-4 w-4" /> Registro da Fazenda
          </TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2">
            <Users className="h-4 w-4" /> Contatos Comerciais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Dados Principais da Propriedade</CardTitle>
              <CardDescription>
                Informações utilizadas para emissão de relatórios, notas fiscais e controle interno.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Identificação</h3>
                  <div className="space-y-2">
                    <Label>Nome da Fazenda</Label>
                    <Input
                      value={farmData.nome}
                      onChange={(e) => setFarmData({ ...farmData, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Razão Social / Proprietário</Label>
                    <Input
                      value={farmData.proprietario}
                      onChange={(e) => setFarmData({ ...farmData, proprietario: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ / CPF</Label>
                      <Input
                        value={farmData.cnpj}
                        onChange={(e) => setFarmData({ ...farmData, cnpj: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={farmData.inscricaoEstadual}
                        onChange={(e) =>
                          setFarmData({ ...farmData, inscricaoEstadual: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Localização e Áreas</h3>
                  <div className="space-y-2">
                    <Label>Cadastro Ambiental Rural (CAR)</Label>
                    <Input
                      value={farmData.car}
                      onChange={(e) => setFarmData({ ...farmData, car: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Área Total (ha)</Label>
                      <Input
                        type="number"
                        value={farmData.areaTotal}
                        onChange={(e) =>
                          setFarmData({ ...farmData, areaTotal: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Área Pastagem</Label>
                      <Input
                        type="number"
                        value={farmData.areaPastagem}
                        onChange={(e) =>
                          setFarmData({ ...farmData, areaPastagem: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Área Reserva</Label>
                      <Input
                        type="number"
                        value={farmData.areaReserva}
                        onChange={(e) =>
                          setFarmData({ ...farmData, areaReserva: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Endereço / Roteiro</Label>
                      <Input
                        value={farmData.endereco}
                        onChange={(e) => setFarmData({ ...farmData, endereco: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade/UF</Label>
                      <Input
                        value={`${farmData.cidade} - ${farmData.estado}`}
                        onChange={(e) =>
                          setFarmData({ ...farmData, cidade: e.target.value.split('-')[0].trim() })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveRegistry} className="gap-2">
                  <Save className="h-4 w-4" /> Atualizar Registro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contatos" className="mt-0">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Diretório de Contatos Comerciais</CardTitle>
                <CardDescription>
                  Gestão centralizada de compradores, frigoríficos e fornecedores de insumos.
                </CardDescription>
              </div>
              <ContactDialog onSave={handleSaveContact} />
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Empresa</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{contact.nome}</div>
                          <div className="text-xs text-muted-foreground">{contact.empresa}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              contact.categoria === 'Comprador'
                                ? 'default'
                                : contact.categoria === 'Fornecedor'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {contact.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{contact.contato}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={contact.status === 'Ativo' ? 'outline' : 'secondary'}
                            className={
                              contact.status === 'Ativo'
                                ? 'text-green-600 border-green-200 bg-green-50'
                                : ''
                            }
                          >
                            {contact.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
