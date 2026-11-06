// Firebase Authentication + Firestore, loaded from Google's CDN only when js/firebase-config.js
// contains a config. Each user's watched list is one document: users/{uid} -> { watched: { movieId: millis } }.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export async function connectCloud(config) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);

  const app = initializeApp(config);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const ref = (uid) => F.doc(db, 'users', uid);
  const toUser = (u) => (u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null);

  return {
    onUser: (callback) => A.onAuthStateChanged(auth, (u) => callback(toUser(u))),

    async register(name, email, password) {
      const { user } = await A.createUserWithEmailAndPassword(auth, email, password);
      if (name) await A.updateProfile(user, { displayName: name });
      return toUser(user);
    },
    signIn: (email, password) => A.signInWithEmailAndPassword(auth, email, password),
    signInWithGoogle: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    resetPassword: (email) => A.sendPasswordResetEmail(auth, email),
    signOut: () => A.signOut(auth),

    watch(uid, onData, onError) {
      return F.onSnapshot(
        ref(uid),
        (snap) => {
          // An empty answer from the local cache only means "not loaded yet", not "empty list".
          if (!snap.exists() && snap.metadata.fromCache) return;
          onData(snap.get('watched') || {});
        },
        onError,
      );
    },
    setWatched: (uid, id, ts) =>
      F.setDoc(ref(uid), { watched: { [id]: ts ?? F.deleteField() }, updatedAt: F.serverTimestamp() }, { merge: true }),
    mergeWatched: (uid, map) =>
      F.setDoc(ref(uid), { watched: map, updatedAt: F.serverTimestamp() }, { merge: true }),
  };
}
