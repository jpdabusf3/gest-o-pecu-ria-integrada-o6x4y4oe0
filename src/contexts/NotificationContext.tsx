import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from '@/hooks/use-toast'

export type AppNotification = {
  id: string
  title: string
  message: string
  date: Date
  read: boolean
  type: 'task' | 'goal' | 'alert'
}

interface NotificationContextType {
  notifications: AppNotification[]
  addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'init-1',
      title: 'Meta Atingida! 🎯',
      message: 'João (Operador Campo) atingiu a meta: GMD Confinamento > 1.4kg/dia.',
      date: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      read: false,
      type: 'goal',
    },
  ])

  const auth = useAuth()
  const { toast } = useToast()

  // Simulated Mobile Alert Workflow for Management Tasks (e.g. DG)
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification({
        title: '⏰ Alerta de Manejo Crítico (DG)',
        message:
          'O lote LCR-01 possui Diagnóstico de Gestação (DG) agendado para as próximas 48h. Evite atrasos no protocolo IATF.',
        type: 'alert',
      })
    }, 4500)
    return () => clearTimeout(timer)
  }, [])

  const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now().toString(),
      date: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotif, ...prev])

    const prefs = auth.user.preferences
    const lowerTitle = notif.title.toLowerCase()
    let shouldSend = false

    if (
      notif.type === 'alert' &&
      prefs.notifyHealth &&
      (lowerTitle.includes('sanit') ||
        lowerTitle.includes('vacina') ||
        lowerTitle.includes('peso') ||
        lowerTitle.includes('iatf') ||
        lowerTitle.includes('manejo'))
    ) {
      shouldSend = true
    } else if (
      notif.type === 'alert' &&
      prefs.notifyFinancial &&
      (lowerTitle.includes('finan') ||
        lowerTitle.includes('custo') ||
        lowerTitle.includes('orçamento'))
    ) {
      shouldSend = true
    } else if ((notif.type === 'task' || notif.type === 'goal') && prefs.notifyManagement) {
      shouldSend = true
    } else if (notif.type === 'alert' && prefs.notifyManagement) {
      shouldSend = true // default fallback for general alerts if management is on
    }

    if (shouldSend) {
      // Native Push Notification Simulation
      if (
        prefs.pushEnabled &&
        'serviceWorker' in navigator &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(notif.title, {
            body: notif.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'gpi-alert',
          } as any)
        })
      }

      // WhatsApp Simulation Logic
      if (prefs.whatsappEnabled && auth.user.whatsapp) {
        setTimeout(() => {
          toast({
            title: '📱 Notificação Push / WhatsApp',
            description: `Alerta automatizado enviado para ${auth.user.whatsapp}: "${notif.title}"`,
            variant: 'default',
            className: 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-100',
          })
        }, 1500)
      }
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useAppNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useAppNotifications must be used within NotificationProvider')
  return context
}
