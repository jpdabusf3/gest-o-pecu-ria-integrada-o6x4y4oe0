import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false)
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setSupportsPWA(true)
      setPromptInstall(e as BeforeInstallPromptEvent)

      if (!localStorage.getItem('pwa-prompt-dismissed')) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
    })

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const onClick = async () => {
    if (!promptInstall) return

    await promptInstall.prompt()

    const choiceResult = await promptInstall.userChoice
    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false)
    }
  }

  const onDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (!supportsPWA || isInstalled || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex animate-fade-in-up flex-col gap-3 rounded-xl border bg-card p-4 shadow-xl sm:left-auto sm:right-4 sm:w-96">
      <div className="flex items-start justify-between">
        <div className="flex flex-col pr-4">
          <h3 className="text-sm font-semibold text-foreground">Instalar Aplicativo</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione o sistema à sua tela inicial para acesso rápido e modo offline no campo.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>
      </div>
      <div className="mt-1 flex w-full gap-2">
        <Button onClick={onClick} className="flex-1 gap-2" size="sm">
          <Download className="h-4 w-4" />
          Instalar Agora
        </Button>
        <Button variant="outline" onClick={onDismiss} size="sm">
          Mais tarde
        </Button>
      </div>
    </div>
  )
}
