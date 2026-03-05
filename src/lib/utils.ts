export function isValidUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,}$/.test(username);
}

export function hoursFromNow(h: number) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

export function nowIso() {
  return new Date().toISOString();
}
