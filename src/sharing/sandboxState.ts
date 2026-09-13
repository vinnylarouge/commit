import type { UnitProfile, WeaponProfile } from '../domain/profiles'
import { defaultSandboxModifiers, type SandboxModifiers, type SandboxState } from '../domain/sandbox'

const finiteWithin = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlToBytes = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const byteStream = (bytes: Uint8Array): ReadableStream<Uint8Array> => new ReadableStream({
  start: (controller) => {
    controller.enqueue(bytes)
    controller.close()
  },
})

const compress = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = byteStream(bytes).pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const decompress = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = byteStream(bytes).pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const isDice = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false
  const die = value as Record<string, unknown>
  return die.kind === 'constant'
    ? finiteWithin(die.value, 0, 200)
    : die.kind === 'die' && finiteWithin(die.count, 0, 100) && finiteWithin(die.sides, 2, 100) && finiteWithin(die.modifier, -100, 100)
}

const isWeapon = (value: unknown): value is WeaponProfile => {
  if (typeof value !== 'object' || value === null) return false
  const weapon = value as Record<string, unknown>
  return typeof weapon.id === 'string' && typeof weapon.name === 'string'
    && isDice(weapon.attacks) && finiteWithin(weapon.skill, 2, 6)
    && finiteWithin(weapon.strength, 1, 100) && finiteWithin(weapon.armourPenetration, -100, 0)
    && isDice(weapon.damage) && Array.isArray(weapon.keywords)
    && (weapon.phase === undefined || weapon.phase === 'shoot' || weapon.phase === 'fight')
}

const isUnit = (value: unknown): value is UnitProfile => {
  if (typeof value !== 'object' || value === null) return false
  const unit = value as Record<string, unknown>
  return typeof unit.id === 'string' && typeof unit.name === 'string'
    && finiteWithin(unit.points, 0, 10_000) && finiteWithin(unit.models, 1, 100)
    && finiteWithin(unit.toughness, 1, 100) && finiteWithin(unit.armourSave, 2, 7)
    && (unit.invulnerableSave === null || finiteWithin(unit.invulnerableSave, 2, 7))
    && finiteWithin(unit.woundsPerModel, 1, 100)
    && (unit.feelNoPain === null || finiteWithin(unit.feelNoPain, 2, 6))
    && Array.isArray(unit.keywords) && Array.isArray(unit.weapons) && unit.weapons.every(isWeapon)
    && Array.isArray(unit.abilities) && Array.isArray(unit.unsupportedRules)
}

const isModifiers = (value: unknown): value is SandboxModifiers => {
  if (typeof value !== 'object' || value === null) return false
  const modifiers = value as Record<string, unknown>
  return typeof modifiers.benefitOfCover === 'boolean'
    && finiteWithin(modifiers.hitModifier, -2, 2) && finiteWithin(modifiers.woundModifier, -2, 2)
    && ['profile', 'none', 'ones', 'failed'].includes(String(modifiers.rerollHits))
    && ['profile', 'none', 'ones', 'failed'].includes(String(modifiers.rerollWounds))
    && typeof modifiers.lethalHits === 'boolean' && finiteWithin(modifiers.sustainedHits, 0, 3)
    && typeof modifiers.devastatingWounds === 'boolean' && finiteWithin(modifiers.damageReduction, 0, 2)
    && finiteWithin(modifiers.toughnessModifier, -2, 2) && finiteWithin(modifiers.saveModifier, -2, 2)
    && ['none', 'ones', 'failed'].includes(String(modifiers.rerollSaves))
    && ['profile', 'none', '2', '3', '4', '5', '6'].includes(String(modifiers.invulnerableSave))
    && ['profile', 'none', '2', '3', '4', '5', '6'].includes(String(modifiers.feelNoPain))
}

export const isSandboxState = (value: unknown): value is SandboxState => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return state.version === 1 && isUnit(state.attacker) && isUnit(state.target)
    && (state.weaponId === undefined || typeof state.weaponId === 'string')
    && isModifiers(state.modifiers)
}

export const normaliseSandboxState = (value: unknown): SandboxState | null => {
  if (typeof value !== 'object' || value === null) return null
  const state = value as Record<string, unknown>
  if (typeof state.modifiers !== 'object' || state.modifiers === null) return null
  const migrated = {
    ...state,
    modifiers: { ...defaultSandboxModifiers, ...state.modifiers },
  }
  return isSandboxState(migrated) ? migrated : null
}

export const encodeSandboxState = async (state: SandboxState): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  return bytesToBase64Url(await compress(bytes))
}

export const decodeSandboxState = async (encoded: string): Promise<SandboxState> => {
  if (encoded.length > 50_000) throw new Error('This shared matchup is too large to open safely.')
  const bytes = await decompress(base64UrlToBytes(encoded))
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
  const state = normaliseSandboxState(parsed)
  if (state === null) throw new Error('This link uses an unsupported Commit format.')
  return state
}

export const sandboxStateFromHash = async (hash: string): Promise<SandboxState | null> => {
  const query = hash.split('?')[1]
  if (query === undefined) return null
  const encoded = new URLSearchParams(query).get('s')
  return encoded === null ? null : decodeSandboxState(encoded)
}
