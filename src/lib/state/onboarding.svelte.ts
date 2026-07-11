import { settingsState, updateSettings } from '$lib/state/settings.svelte'
import { app } from '$lib/state/app.svelte'

export const onboardingState = $state({
  open: false,
})

export function maybeStartOnboarding() {
  if (!settingsState.settings.hasOnboarded) onboardingState.open = true
}

export function completeOnboarding() {
  onboardingState.open = false
  updateSettings({ hasOnboarded: true })
}

export function skipOnboarding() {
  completeOnboarding()
}

export function replayOnboarding() {
  onboardingState.open = true
}

export interface TourStep {
  selector:  string
  title:     string
  body:      string
  placement?: 'right' | 'bottom'
  route?:     string
  padding?:   number
}

export const TOUR_STEPS: TourStep[] = [
  {
    selector:  '[data-tour="sidebar-nav"]',
    title:     'Navigation',
    body:      'Library, Browse, Downloads, Extensions, and Tracking all live here.',
    placement: 'right',
    padding:   16,
  },
  {
    selector:  '[data-tour="add-source"]',
    title:     'Add a source',
    body:      'Add a repo here to install extensions and start browsing manga.',
    placement: 'bottom',
    route:     '/extensions',
  },
]

export const tourState = $state({
  active:   false,
  step:     0,
  finished: false,
})

export function startTour() {
  app.setSettingsOpen(false)
  onboardingState.open = false
  tourState.step     = 0
  tourState.active   = true
  tourState.finished = false
}

export function nextTourStep() {
  if (tourState.step >= TOUR_STEPS.length - 1) { finishTourSteps(); return }
  tourState.step++
}

export function endTour() {
  tourState.active   = false
  tourState.finished = false
}

async function finishTourSteps() {
  tourState.active = false
  const { goto } = await import('$app/navigation')
  await goto('/')
  tourState.finished = true
}

export function finishTour() {
  tourState.finished = false
}