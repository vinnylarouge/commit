export type Brand<T, Name extends string> = T & Readonly<{ __brand: Name }>

export type UnitId = Brand<string, 'UnitId'>
export type WeaponId = Brand<string, 'WeaponId'>
export type AbilityId = Brand<string, 'AbilityId'>
export type RosterId = Brand<string, 'RosterId'>
export type SessionId = Brand<string, 'SessionId'>

export const unitId = (value: string): UnitId => value as UnitId
export const weaponId = (value: string): WeaponId => value as WeaponId
export const abilityId = (value: string): AbilityId => value as AbilityId
export const rosterId = (value: string): RosterId => value as RosterId
export const sessionId = (value: string): SessionId => value as SessionId
