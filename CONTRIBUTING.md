# Developpement et build

Cette page explique comment installer les dependances, lancer le projet en mode test/developpement, puis compiler une version Windows.

## Prerequis

- Windows
- Node.js et npm
- SSHFS-Win installe pour tester une vraie connexion SSHFS

La configuration actuelle a ete verifiee avec Node `24.11.1` et npm `11.6.2`.

## Installer les dependances

Depuis la racine du projet :

```powershell
npm install
```

Le projet est aligne sur des versions compatibles entre elles. `npm install` doit donc passer sans `--legacy-peer-deps`.

## Lancer en mode test

Pour lancer l'application Electron en mode developpement :

```powershell
npm run dev
```

Ce mode demarre le serveur Vite, compile le process principal Electron et ouvre l'application. Le port par defaut est `5173`; si le port est deja utilise, Vite choisit le suivant.

Les scripts passent par `scripts/run-electron-vite.cjs`. Ce wrapper supprime `ELECTRON_RUN_AS_NODE` avant le lancement et force le telechargement du binaire Electron si necessaire. C'est volontaire : cette variable peut provoquer une fenetre blanche ou un crash au demarrage sous Windows.

Pour demarrer directement en mode systray :

```powershell
npm run dev:tray
```

## Verifier le code

Pour lancer le lint :

```powershell
npm run lint
```

Pour appliquer les corrections automatiques ESLint :

```powershell
npm run lint:fix
```

## Compiler sans installateur

Pour generer une application Windows non empaquetee dans un installateur :

```powershell
npm run build:dir
```

Le resultat est cree dans :

```text
build/win-unpacked/
```

C'est pratique pour verifier rapidement que l'application compile et se lance avant de produire un installateur.

## Compiler l'installateur Windows

Pour generer l'installateur NSIS :

```powershell
npm run build
```

Le fichier d'installation est cree dans le dossier `build/`, avec un nom proche de :

```text
sshfs-win-manager-evo-setup-v1.3.1.exe
```

Le nom exact depend de la version definie dans `package.json`.

## Nettoyer les builds

Pour nettoyer les fichiers generes par le build Electron/Vue :

```powershell
npm run build:clean
```

## Audit securite

Pour verifier les vulnerabilites npm :

```powershell
npm audit
```

L'objectif actuel est `found 0 vulnerabilities`.

## Notes

- Le projet utilise maintenant `electron-vite`, Electron moderne et Vue 3.
- Vite reste sur la derniere branche 7 compatible avec `electron-vite@5`. Vite 8 existe, mais `electron-vite@5` ne le declare pas encore dans ses peer dependencies.
- Le build non empaquete (`npm run build:dir`) est le test le plus rapide avant de generer l'installateur complet.
