// Icons by Lorc, Delapouite, Dark Zaitzev, and Skoll via game-icons.net, licensed CC BY 3.0
// (https://creativecommons.org/licenses/by/3.0/). See the credit line in the site footer.

import foundationIcon from '../assets/icons/foundation.svg?raw'
import ciIcon from '../assets/icons/ci.svg?raw'
import serpentsHandIcon from '../assets/icons/serpentsHand.svg?raw'

import agentIcon from '../assets/icons/agent.svg?raw'
import researcherIcon from '../assets/icons/researcher.svg?raw'
import medicalOfficerIcon from '../assets/icons/medicalOfficer.svg?raw'
import trackerIcon from '../assets/icons/tracker.svg?raw'
import wardenIcon from '../assets/icons/warden.svg?raw'
import enforcerIcon from '../assets/icons/enforcer.svg?raw'
import infiltratorIcon from '../assets/icons/infiltrator.svg?raw'
import saboteurIcon from '../assets/icons/saboteur.svg?raw'
import framerIcon from '../assets/icons/framer.svg?raw'
import anomalyIcon from '../assets/icons/anomaly.svg?raw'
import whispererIcon from '../assets/icons/whisperer.svg?raw'
import theFoolIcon from '../assets/icons/theFool.svg?raw'
import theMarkedIcon from '../assets/icons/theMarked.svg?raw'
import puppeteerIcon from '../assets/icons/puppeteer.svg?raw'
import cartographerIcon from '../assets/icons/cartographer.svg?raw'
import cultivatorIcon from '../assets/icons/cultivator.svg?raw'

import type { Faction, RoleId } from './types'

export const FACTION_ICONS: Record<Faction, string> = {
  foundation: foundationIcon,
  ci: ciIcon,
  serpentsHand: serpentsHandIcon,
}

export const ROLE_ICONS: Record<RoleId, string> = {
  agent: agentIcon,
  researcher: researcherIcon,
  medicalOfficer: medicalOfficerIcon,
  tracker: trackerIcon,
  warden: wardenIcon,
  enforcer: enforcerIcon,
  infiltrator: infiltratorIcon,
  saboteur: saboteurIcon,
  framer: framerIcon,
  anomaly: anomalyIcon,
  whisperer: whispererIcon,
  theFool: theFoolIcon,
  theMarked: theMarkedIcon,
  puppeteer: puppeteerIcon,
  cartographer: cartographerIcon,
  cultivator: cultivatorIcon,
}
