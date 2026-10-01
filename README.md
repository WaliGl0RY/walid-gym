# Walid Gym – installable web app (PWA)

Training log (photos, evidence-labelled tips, kg / reps / RIR / remarks), meal plan with your own items and macros,
Lidl shopping list with prices, gym budget, weight/steps progress and JSON backup.
Everything runs in the browser; your logs stay on your phone (no server, no account).

## Put it online with GitHub Pages (free)
1. Create a repository on your personal GitHub account (public is fine), e.g. `walid-gym`.
2. Upload ALL files and folders of this directory (index.html, app.css, app.js, data.js, sw.js, manifest.webmanifest, `img/`, `icons/`)
   to the root of the repo (web: "Add file" -> "Upload files"; keep the folder structure).
3. Repo -> Settings -> Pages -> Source: "Deploy from a branch" -> Branch `main` / folder `/ (root)` -> Save.
4. After about a minute the app is at `https://<your-username>.github.io/walid-gym/`.

## Install on iPhone
1. Open that link in **Safari**.
2. Tap Share -> **Add to Home Screen** -> Add.
3. Open the app from the **home-screen icon** (it has its own storage, separate from Safari).
4. Open it once with internet; afterwards it works offline.

## Good to know
* Export a backup now and then: Progress -> Export backup (save to Files / iCloud Drive). Import restores it.
* Updating: upload the new files to the repo. The phone loads the new version the next time you open the app with internet
  (close and reopen once if you still see the old one).
* Photos: free-exercise-db (public domain). Tips are general training information, not medical advice.
