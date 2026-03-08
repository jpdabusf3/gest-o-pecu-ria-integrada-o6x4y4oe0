import React, { createContext, useContext, useState } from 'react'

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

  const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now().toString(),
      date: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotif, ...prev])
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
