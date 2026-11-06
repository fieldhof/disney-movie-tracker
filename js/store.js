// Watched-list store.
//
// Signed out ("guest"): the list lives in this browser's localStorage.
// Signed in: the list lives in Firestore (see cloud.js); localStorage keeps a per-user cache so the
// page can render instantly on the next visit. Anything marked as a guest is merged into the account
// on sign-in.
//
// The map is { movieId: watchedAtMillis }. Emits a "change" event with detail.id (one movie) or
// detail.id === null (many movies changed).

const GUEST_KEY = 'dmt:watched:guest';
const LAST_USER_KEY = 'dmt:last-user';
const userKey = (uid) => `dmt:watched:user:${uid}`;

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full: keep working in memory */
  }
};

const sanitize = (map) => {
  const out = {};
  if (map && typeof map === 'object') {
    for (const [id, ts] of Object.entries(map)) if (typeof ts === 'number' && ts > 0) out[id] = ts;
  }
  return out;
};

export class WatchedStore extends EventTarget {
  /** @param {{ resumeUser?: boolean }} options  resumeUser: show the last signed-in user's cached list until auth confirms */
  constructor({ resumeUser = false } = {}) {
    super();
    this.user = null; // { uid, email, name } once auth confirms
    this.remote = null; // { set(id, ts|null), merge(map) }
    this.pending = new Map(); // changes made before auth finished restoring the session

    this.cachedUser = resumeUser ? read(LAST_USER_KEY, null) : null;
    this.key = this.cachedUser ? userKey(this.cachedUser.uid) : GUEST_KEY;
    this.map = sanitize(read(this.key, {}));

    // Keep several open tabs in sync when there is no cloud connection doing it for us.
    window.addEventListener('storage', (e) => {
      if (e.key === this.key && !this.remote) {
        this.map = sanitize(read(this.key, {}));
        this.emit(null);
      }
    });
  }

  get size() {
    return Object.keys(this.map).length;
  }

  has(id) {
    return Object.hasOwn(this.map, id);
  }

  watchedAt(id) {
    return this.map[id] || null;
  }

  /** Mark or unmark a movie. `at` restores an earlier timestamp (used by Undo). */
  set(id, watched, at) {
    const ts = watched ? at || Date.now() : null;
    if ((this.map[id] || null) === ts) return;
    if (ts) this.map[id] = ts;
    else delete this.map[id];
    write(this.key, this.map);
    if (this.remote) this.remote.set(id, ts);
    else if (this.cachedUser) this.pending.set(id, ts);
    this.emit(id);
  }

  /** Add movies from an imported file; keeps existing entries. Returns how many were new. */
  merge(map) {
    const added = {};
    for (const [id, ts] of Object.entries(sanitize(map))) if (!this.has(id)) added[id] = ts;
    const n = Object.keys(added).length;
    if (n) {
      Object.assign(this.map, added);
      write(this.key, this.map);
      this.remote?.merge(added);
      this.emit(null);
    }
    return n;
  }

  useGuest() {
    this.user = null;
    this.remote = null;
    this.cachedUser = null;
    this.pending.clear();
    this.key = GUEST_KEY;
    write(LAST_USER_KEY, null);
    this.map = sanitize(read(GUEST_KEY, {}));
    this.emit(null);
  }

  /** Switch to a signed-in user. Returns how many guest entries were moved into the account. */
  useUser(user, remote) {
    const resumedSameUser = this.cachedUser?.uid === user.uid;
    this.user = user;
    this.remote = remote;
    this.cachedUser = user;
    this.key = userKey(user.uid);
    write(LAST_USER_KEY, user);

    const guest = sanitize(read(GUEST_KEY, {}));
    this.map = { ...sanitize(read(this.key, {})), ...guest };
    write(this.key, this.map);

    if (resumedSameUser) for (const [id, ts] of this.pending) remote.set(id, ts);
    this.pending.clear();

    const moved = Object.keys(guest).length;
    if (moved) {
      remote.merge(guest);
      write(GUEST_KEY, null);
    }
    this.emit(null);
    return moved;
  }

  updateUser(patch) {
    if (!this.user) return;
    Object.assign(this.user, patch);
    write(LAST_USER_KEY, this.user);
  }

  /** Called with the full list whenever the cloud copy changes. */
  applyRemote(map) {
    map = sanitize(map);
    const ids = new Set([...Object.keys(map), ...Object.keys(this.map)]);
    const changed = [...ids].filter((id) => (map[id] || 0) !== (this.map[id] || 0));
    if (!changed.length) return;
    this.map = map;
    write(this.key, map);
    this.emit(changed.length === 1 ? changed[0] : null);
  }

  toJSON() {
    return { ...this.map };
  }

  emit(id) {
    this.dispatchEvent(new CustomEvent('change', { detail: { id } }));
  }
}
