// In-memory flag (never stored): true when the summary was opened from the
// console in this tab, so "Back" can return to the same search.
export const nav = { fromConsole: false };

// Distance options in km. Default 10.
export const DISTANCES = [5, 10, 15, 25];
export const DEFAULT_INPUTS = {
  postcode: '', specialty: '410', maxKm: 10, priority: 'balanced', includeSpecialist: false, includeQuality: false,
};

// The current search, kept in memory only (never written to storage), so
// "Back" from the summary returns to the same search within this tab.
export const session = { inputs: DEFAULT_INPUTS, origin: null, collapsed: false };

// "New search" in the header: clear the search and tell the console.
export const RESET_EVENT = 'rc:new-search';
export function resetSession() {
  session.inputs = DEFAULT_INPUTS;
  session.origin = null;
  session.collapsed = false;
  nav.fromConsole = false;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RESET_EVENT));
}
