export const MODULES_CONFIG = [
  { key: 'reservas',      label: 'Reservas',        icon: '📅' },
  { key: 'clientes',      label: 'Clientes',         icon: '👥' },
  { key: 'productos',     label: 'Productos',        icon: '📦' },
  { key: 'horarios',      label: 'Horarios',         icon: '🕐' },
  { key: 'metricas',      label: 'Métricas',         icon: '📊' },
  { key: 'recordatorios', label: 'Recordatorios',    icon: '🔔' },
  { key: 'dominio',       label: 'Dominio propio',   icon: '🌐' },
] as const

export type ModuleKey = typeof MODULES_CONFIG[number]['key']

export const PLAN_DEFAULTS: Record<string, Record<ModuleKey, boolean>> = {
  free: {
    reservas: true, clientes: true, productos: true, horarios: true,
    metricas: false, recordatorios: false, dominio: false,
  },
  pro: {
    reservas: true, clientes: true, productos: true, horarios: true,
    metricas: true, recordatorios: true, dominio: false,
  },
  premium: {
    reservas: true, clientes: true, productos: true, horarios: true,
    metricas: true, recordatorios: true, dominio: true,
  },
}
