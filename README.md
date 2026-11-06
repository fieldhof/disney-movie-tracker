# Disney Movie Tracker

A streaming-style website with every Walt Disney Animation Studios, Pixar and DisneyToon Studios film.
Browse the posters, open a movie for more info (synopsis, cast, trailer), tick off what you've watched,
and let the 🎲 **Suggest a movie** button pick something you haven't seen yet.

- **Home**: featured hero, progress per studio, and rows per studio, Disney era and genre, plus *Up next*, *Short on time?* and a Top 10.
- **All movies**: search (titles, voices, directors, years) with filters for watched status, studio, era and release type, and sorting.
- **Suggest**: random unwatched movie, with filters for time available, studio, and whether to include direct-to-video films.
- **Accounts (optional)**: register or sign in to sync your watched list across devices (Firebase). Without an account the list is saved in your browser, and you can export or import it as a file.

Plain HTML, CSS and JavaScript (ES modules), with no build step, so GitHub Pages can host it as-is.

## Run it locally

The page loads `data/movies.json`, so it needs a web server; opening `index.html` straight from disk won't work.

```sh
python -m http.server 8000
# open http://localhost:8000
```

(Or use the VS Code *Live Server* extension.)

## Publish on GitHub Pages

1. Commit and push to `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick `main` and `/ (root)`, and save.
3. After a minute the site is live at `https://fieldhof.github.io/disney-movie-tracker/`.

## Accounts with Firebase (optional)

GitHub Pages only serves static files, so accounts run on Firebase's free plan: Authentication for
logins and Firestore for each user's watched list.

1. Go to <https://console.firebase.google.com>, click **Add project** (for example `disney-movie-tracker`). Google Analytics isn't needed.
2. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password**. You can also enable **Google**.
3. **Authentication → Settings → Authorized domains → Add domain**: `fieldhof.github.io`. `localhost` is already allowed.
4. **Build → Firestore Database → Create database**: pick a location (e.g. `eur3 (europe-west)`) and start in **production mode**.
   Then open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
5. **Project settings (⚙) → General → Your apps → Web (`</>`)**: register an app (Firebase Hosting isn't needed) and copy the `firebaseConfig` object.
6. Paste it into [`js/firebase-config.js`](js/firebase-config.js) in place of `null`. If you didn't enable Google sign-in, set `enableGoogleSignIn = false`.

The config values are not secret; every Firebase web app ships them to the browser. Security comes from
the Firestore rules, which only let a signed-in user read and write their own document (`users/{uid}`).

When someone signs in, movies they marked before signing in on that device are added to their account.

## Updating the movie list

[`disney_movies.txt`](disney_movies.txt) is the source list (tab-separated, Excel-friendly).
[`scripts/build-movies.mjs`](scripts/build-movies.mjs) turns it into `data/movies.json`, adding TMDB data
(poster, backdrop, title logo, synopsis, genres, rating, director, voice cast, trailer).

1. Create a free API key at <https://www.themoviedb.org/settings/api> and put it in a `.env` file in the project root (it's git-ignored):
   ```
   TMDB_TOKEN=eyJ...           # "API Read Access Token"
   ```
2. Add a line to `disney_movies.txt`. Only *Year*, *Movie*, *Studio* and *Release type* are required.
3. Run (Node 18+):
   ```sh
   node scripts/build-movies.mjs --write-source
   ```
   This finds the TMDB match, fills in the TMDB ID and runtime, sorts the list by release date and regenerates `data/movies.json`.
   Check the report it prints (weak matches, years that differ from TMDB), then commit.

   Without `--write-source` only `data/movies.json` is regenerated (e.g. to refresh ratings).

Years in the txt are kept as they are, because TMDB sometimes lists the general release instead of the premiere
(*Snow White* premiered in 1937, not 1938). Runtimes come from TMDB. If a match is wrong, put the correct ID
(from the movie's themoviedb.org URL) in the *TMDB ID* column.

## Files

```
index.html               page layout
css/styles.css           styling
js/app.js                rows, hero, details, search, suggest, accounts UI
js/store.js              watched list (browser storage + sync)
js/cloud.js              Firebase auth + Firestore (only loaded when configured)
js/firebase-config.js    your Firebase config
data/movies.json         generated movie data, do not edit by hand
disney_movies.txt        source list
scripts/build-movies.mjs txt → json with TMDB data
firestore.rules          security rules to paste into Firebase
```

---

Fan-made project, not affiliated with or endorsed by The Walt Disney Company. Movie data and images from
[TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
