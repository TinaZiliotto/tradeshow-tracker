import { createContext, useContext, useEffect, useState } from 'react'

const RefreshContext = createContext(0)

export function RefreshProvider({ children }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    // 30-second interval — only used for list pages (Dashboard, Shows, Systems, Service).
    // Checklist and Notes use their own Realtime subscriptions and do NOT consume this tick,
    // so this interval never touches user-editable text.
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <RefreshContext.Provider value={tick}>
      {children}
    </RefreshContext.Provider>
  )
}

export const useRefreshTick = () => useContext(RefreshContext)
