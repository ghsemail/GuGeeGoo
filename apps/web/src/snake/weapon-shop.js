import { WEAPONS, DEFAULT_WEAPON_ID, getWeapon } from './weapons.js';
import {
  getSpendableBalance,
  getItemCount,
  addInventoryItem,
  spendPoints,
  getEquippedWeaponId,
  setEquippedWeaponId,
  persistWallet,
} from './storage.js';

export { WEAPONS };

/** 首次进入赠送弹弓 */
export function ensureStarterWeapon() {
  if (getItemCount(DEFAULT_WEAPON_ID) < 1) {
    addInventoryItem(DEFAULT_WEAPON_ID, 1);
    if (!getEquippedWeaponId()) {
      setEquippedWeaponId(DEFAULT_WEAPON_ID);
    }
  }
}

export function canBuyWeapon(weaponId) {
  const w = getWeapon(weaponId);
  if (!w) return { ok: false, reason: 'unknown' };
  if (getItemCount(weaponId) >= 1) return { ok: false, reason: 'owned' };
  if (w.price > 0 && getSpendableBalance() < w.price) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, weapon: w };
}

export async function buyWeapon(weaponId) {
  const check = canBuyWeapon(weaponId);
  if (!check.ok) return check;
  if (check.weapon.price > 0) {
    const spend = spendPoints(check.weapon.price);
    if (!spend.ok) return spend;
  }
  addInventoryItem(weaponId, 1);
  setEquippedWeaponId(weaponId);
  await persistWallet();
  return { ok: true, weapon: check.weapon };
}

export async function equipWeapon(weaponId) {
  if (getItemCount(weaponId) < 1) return { ok: false, reason: 'not_owned' };
  setEquippedWeaponId(weaponId);
  await persistWallet();
  return { ok: true, weaponId };
}

export function getWeaponShopState(weaponId) {
  const weapon = getWeapon(weaponId);
  const owned = getItemCount(weaponId) > 0;
  const equipped = getEquippedWeaponId() === weaponId;
  return { weapon, owned, equipped };
}
