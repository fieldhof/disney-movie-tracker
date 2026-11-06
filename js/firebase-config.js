// Accounts + sync across devices (optional). See README → "Accounts with Firebase".
//
// Paste the config of your Firebase web app below. These values are not secret: they only identify
// your Firebase project. The Firestore rules (firestore.rules) make sure every user can only read and
// write their own watched list.
//
// Set firebaseConfig to null to run without accounts (progress is then saved in the browser only).

export const firebaseConfig = {
  apiKey: 'AIzaSyB-OP9KnjUmPTsxpIrf9j2SnfPf2o3BjFg',
  authDomain: 'disney-movie-tracker.firebaseapp.com',
  projectId: 'disney-movie-tracker',
  storageBucket: 'disney-movie-tracker.firebasestorage.app',
  messagingSenderId: '792908698264',
  appId: '1:792908698264:web:21d549a8c7121c0001f6ed',
};

// Show "Continue with Google" in the sign-in dialog (enable the Google provider in Firebase first).
export const enableGoogleSignIn = true;
