import { useDashboard, type PulseTarget } from '../store/dashboardStore'

/** Flashes an outline over its parent panel whenever an agent changes that part of the dashboard. */
export function Pulse({ target }: { target: PulseTarget }) {
  const { pulse } = useDashboard()
  if (pulse.id === 0 || pulse.target !== target) return null
  // A new key each time restarts the CSS animation.
  return <span key={pulse.id} className="pulse" aria-hidden="true" />
}
