/** Keep diagnostic history finite during an indefinitely explorable session. */
export function recordTrace<T>(history: T[], event: T, limit = 600) {
  history.push(event);
  if (history.length > limit) history.splice(0, history.length - limit);
}
