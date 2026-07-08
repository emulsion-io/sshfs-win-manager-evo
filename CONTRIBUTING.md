# Developpement et build

Cette page explique comment installer les dependances, lancer le projet en mode developpement, verifier le code, puis compiler l'application.

Le projet est en cours d'ouverture multi-OS. Windows reste la cible de packaging principale pour le moment, mais le code applicatif contient maintenant des handlers separes pour Windows, Linux et macOS.

## Prerequis

- Node.js et npm compatibles avec `package.json`
- Git
- Les prerequis SSHFS de votre OS pour tester une vraie connexion

La configuration actuelle a ete verifiee avec Node `24.11.1` et npm `11.6.2`.

Le projet fournit un fichier `.nvmrc`. Avec `nvm` :

```bash
nvm install
nvm use
node -v
npm -v
```

Les dependances actuelles demandent Node `^22.18.0` ou `>=24.11.0`. Sur Ubuntu, le Node fourni par les depots APT peut etre trop ancien.

Si `nvm` n'est pas installe sur Linux ou macOS :

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
```

Fermer puis rouvrir le terminal, ou charger `nvm` dans le shell courant :

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

Puis relancer :

```bash
nvm install
nvm use
```

Pour installer les prerequis SSHFS par systeme, voir [install.md](install.md).

Resume rapide :

- Windows : WinFsp + SSHFS-Win
- Linux : `sshfs` + FUSE/fuse3
- macOS : macFUSE + SSHFS pour macFUSE

## Installer les dependances

Depuis la racine du projet :

```bash
npm install
```

Le projet est aligne sur des versions compatibles entre elles. `npm install` doit donc passer sans `--legacy-peer-deps`.

## Lancer en mode developpement

Pour lancer l'application Electron en mode developpement :

```bash
npm run dev
```

Ce mode demarre le serveur Vite, compile le process principal Electron et ouvre l'application. Le port par defaut est `5173`; si le port est deja utilise, Vite choisit le suivant.

Les scripts passent par `scripts/run-electron-vite.cjs`. Ce wrapper supprime `ELECTRON_RUN_AS_NODE` avant le lancement et force le telechargement du binaire Electron si necessaire. C'est volontaire : cette variable peut provoquer une fenetre blanche ou un crash au demarrage sous Windows.

Pour demarrer directement en mode systray :

```bash
npm run dev:tray
```

## Tester une vraie connexion SSHFS

Avant de tester depuis l'application, verifier que le montage SSHFS fonctionne en ligne de commande.

Exemple Linux :

```bash
mkdir -p ~/sshfs-test
sshfs user@example.com:/home/user ~/sshfs-test
fusermount3 -u ~/sshfs-test
```

Exemple macOS :

```bash
mkdir -p ~/Mounts/sshfs-test
sshfs user@example.com:/home/user ~/Mounts/sshfs-test
diskutil unmount ~/Mounts/sshfs-test
```

Exemple Windows :

```powershell
sshfs.exe user@example.com:/home/user X:
```

Les details d'installation et de verification sont dans [install.md](install.md).

## Verifier le code

Pour lancer le lint :

```bash
npm run lint
```

Pour appliquer les corrections automatiques ESLint :

```bash
npm run lint:fix
```

## Compiler uniquement Electron/Vite

Cette commande verifie que le process principal et le renderer compilent, sans produire d'installateur :

```bash
npm run build:clean-output
node scripts/run-electron-vite.cjs build
```

C'est le test de build le plus rapide pendant le developpement multi-OS.

## Compiler sans installateur

Pour generer une application non empaquetee dans un installateur :

```bash
npm run build:dir
```

Le resultat est cree dans un sous-dossier de `build/`, par exemple :

```text
build/win-unpacked/
```

Selon l'OS utilise pour lancer la commande, electron-builder peut produire un dossier different.

## Compiler l'installateur Windows

Pour generer l'installateur NSIS Windows :

```bash
npm run build
```

Le fichier d'installation est cree dans le dossier `build/`, avec un nom proche de :

```text
sshfs-win-manager-evo-setup-v2.3.2.exe
```

Le nom exact depend de la version definie dans `package.json`.

## Packaging par plateforme

Des scripts explicites existent pour chaque plateforme :

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

Et pour generer uniquement un dossier non empaquete :

```bash
npm run build:dir:win
npm run build:dir:linux
npm run build:dir:mac
```

Cibles configurees :

- Windows : NSIS
- Linux : AppImage, deb, rpm
- macOS : dmg, zip

Points a traiter avant publication stable :

- tester les paquets Linux sur plusieurs distributions ;
- tester le build macOS sur une machine macOS, idealement Intel et Apple Silicon ;
- prevoir signature et notarization si l'application doit etre distribuee hors developpement local.

Sur Debian, Ubuntu ou Linux Mint, la cible `rpm` demande l'outil systeme `rpm` :

```bash
sudo apt install rpm
```

## Generer les icones

```bash
npm run icons:generate
```

La source principale du logo est `build/icons/sshfs-evo-logo.svg`.

Le script genere :

- les PNG dans `build/icons/`
- les fichiers `.ico` utilises par le build Windows
- le fichier `.icns` utilise par le build macOS
- les icones utilisees a l'execution dans `static/`

## Nettoyer les builds

Pour nettoyer les fichiers generes par le build Electron/Vue :

```bash
npm run build:clean
```

## Audit securite

Pour verifier les vulnerabilites npm :

```bash
npm audit
```

L'objectif actuel est `found 0 vulnerabilities`.

## Notes multi-OS

- Windows utilise `src/renderer/process/ProcessHandlerWin.js`.
- Linux utilise `src/renderer/process/ProcessHandlerLinux.js`.
- macOS utilise `src/renderer/process/ProcessHandlerMac.js`.
- Les infos de plateforme et les points de montage automatiques sont centralises dans `src/renderer/platform/index.js`.
- Sous Linux, le point de montage auto est `~/sshfs-win-manager-evo/<nom-connexion>`.
- Sous macOS, le point de montage auto est `~/Mounts/sshfs-win-manager-evo/<nom-connexion>`.
- Vite reste sur la derniere branche 7 compatible avec `electron-vite@5`. Vite 8 existe, mais `electron-vite@5` ne le declare pas encore dans ses peer dependencies.
