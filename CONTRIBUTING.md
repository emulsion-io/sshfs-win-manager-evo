# Développement et build

Ce guide regroupe l'installation des dépendances de développement, les contrôles de qualité, le packaging local et les workflows GitHub Actions de SSHFS-Win Manager Evo.

Le projet utilise des handlers distincts pour Windows, Linux et macOS. Les commandes de build doivent donc être testées sur la plateforme ciblée ou via les runners GitHub Actions correspondants.

## Prérequis

- Node.js et npm compatibles avec `package.json`
- Git
- Les prérequis SSHFS de la plateforme pour tester une vraie connexion

La configuration actuelle a été vérifiée avec Node `24.11.1` et npm `11.6.2`. Les dépendances demandent Node `^22.18.0` ou `>=24.11.0`.

Le projet fournit un fichier `.nvmrc`. Avec `nvm` :

```bash
nvm install
nvm use
node -v
npm -v
```

Sur Ubuntu, la version de Node fournie par les dépôts APT peut être trop ancienne. Si `nvm` n'est pas installé sous Linux ou macOS :

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
```

Fermer puis rouvrir le terminal, ou charger `nvm` dans le shell courant :

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

Puis exécuter `nvm install` et `nvm use` comme indiqué plus haut.

Les prérequis permettant de tester SSHFS sont détaillés par système :

- [Windows](install.md#windows)
- [Linux](install.md#linux)
- [macOS](install.md#macos)

## Installer les dépendances

Depuis la racine du projet :

```bash
npm install
```

L'installation doit réussir sans `--legacy-peer-deps` et ne modifie pas les sources. Les corrections ESLint restent une action volontaire avec `npm run lint:fix`.

## Lancer en mode développement

Pour démarrer le serveur Vite, compiler le processus principal Electron et ouvrir l'application :

```bash
npm run dev
```

Le port par défaut est `5173` ; Vite choisit le suivant s'il est déjà utilisé.

Les commandes passent par `scripts/run-electron-vite.cjs`. Ce wrapper retire `ELECTRON_RUN_AS_NODE` avant le lancement et force le téléchargement du binaire Electron si nécessaire. Cette variable peut sinon provoquer une fenêtre blanche ou un crash au démarrage sous Windows.

Pour démarrer directement en mode systray :

```bash
npm run dev:tray
```

## Tester une connexion SSHFS

Avant de tester l'application, vérifier que le montage fonctionne en ligne de commande avec le moteur choisi :

- [test manuel Windows](install.md#test-manuel-windows)
- [test manuel Linux](install.md#test-manuel-linux)
- [test manuel macOS](install.md#test-manuel-macos)

## Vérifier le code

Lancer le lint sans modifier les fichiers :

```bash
npm run lint
```

Appliquer volontairement les corrections automatiques ESLint :

```bash
npm run lint:fix
```

Tester le parseur des processus SSHFS :

```bash
npm run test:process
```

La CI exécute `lint` et `test:process` sans correction automatique afin de signaler les erreurs présentes dans les fichiers versionnés.

## Compiler Electron et Vite

Cette vérification compile le processus principal et le renderer sans produire d'installateur :

```bash
npm run build:clean-output
node scripts/run-electron-vite.cjs build
```

C'est le contrôle de build le plus rapide pendant le développement multi-OS.

## Compiler sans installateur

Pour générer une application non empaquetée :

```bash
npm run build:dir
```

Le résultat est créé dans un sous-dossier de `build/`, par exemple `build/win-unpacked/`. Le dossier exact dépend de l'OS utilisé.

Des commandes explicites permettent de cibler une plateforme :

```bash
npm run build:dir:win
npm run build:dir:linux
npm run build:dir:mac
```

## Créer les paquets d'installation

Utiliser le script correspondant à la plateforme :

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

Cibles configurées :

- Windows : installateur NSIS `.exe`
- Linux : `.AppImage`, `.deb` et `.rpm`
- macOS : `.dmg` et `.zip`

Les fichiers sont créés dans `build/`. Leur nom reprend la version définie dans `package.json`, par exemple `sshfs-manager-evo-setup-v2.4.4.exe`.

Sous Debian, Ubuntu ou Linux Mint, la construction de la cible RPM demande également :

```bash
sudo apt install rpm
```

Avant une publication stable, tester les paquets Linux sur plusieurs distributions et les paquets macOS sur Apple Silicon et Intel. Les binaires distribués publiquement devront idéalement être signés ; macOS demande en plus une notarisation.

## GitHub Actions

Deux workflows séparent la validation continue de la fabrication des installateurs.

### CI

Le workflow `CI` s'exécute automatiquement :

- à chaque push vers `master` ;
- à la création ou à la mise à jour d'une pull request vers `master` ;
- manuellement depuis `Actions` > `CI` > `Run workflow`.

Il installe les dépendances avec `npm ci`, lance le lint, teste le parseur SSHFS et vérifie un build Linux non empaqueté.

### Builds de release

Le workflow `Release builds` peut être lancé manuellement depuis l'onglet `Actions`. Il produit des artefacts téléchargeables pendant 14 jours :

- Windows x64 ;
- Linux x64 ;
- macOS Apple Silicon ;
- macOS Intel.

Pour préparer une release, mettre à jour la version dans `package.json`, puis pousser le tag correspondant :

```bash
git tag v2.4.5
git push origin v2.4.5
```

Le tag doit correspondre exactement à la version du paquet. Le workflow crée alors une release GitHub en brouillon contenant les installateurs et `SHA256SUMS.txt`. La publication du brouillon reste manuelle.

Les paquets ne sont actuellement ni signés ni notariés. Une release manuelle sans tag produit seulement les artefacts et ne crée aucune release GitHub.

## Générer les icônes

```bash
npm run icons:generate
```

La source principale est `build/icons/sshfs-evo-logo.svg`. Le script génère :

- les fichiers PNG dans `build/icons/` ;
- les fichiers `.ico` du build Windows ;
- le fichier `.icns` du build macOS ;
- les icônes utilisées à l'exécution dans `static/`.

## Nettoyer les builds

```bash
npm run build:clean
```

Cette commande supprime les fichiers générés par le build Electron/Vue.

## Audit de sécurité

Pour vérifier les vulnérabilités connues des dépendances :

```bash
npm audit
```

Examiner les mises à jour proposées avant d'utiliser `npm audit fix` et ne pas employer `--force` sans avoir évalué les changements majeurs associés.

## Notes multi-OS

- Windows utilise `src/renderer/process/ProcessHandlerWin.js`.
- Linux utilise `src/renderer/process/ProcessHandlerLinux.js`.
- macOS utilise `src/renderer/process/ProcessHandlerMac.js`.
- Le handler macOS accepte macFUSE et FUSE-T. Un montage n'est considéré connecté qu'après un message d'authentification SSH ; un événement FUSE local comme `INIT` ne suffit pas.
- Les informations de plateforme et les points de montage automatiques sont centralisés dans `src/renderer/platform/index.js`.
- Sous Linux, le point de montage automatique est `~/sshfs-win-manager-evo/<nom-connexion>`.
- Sous macOS, le point de montage automatique est `~/Mounts/sshfs-win-manager-evo/<nom-connexion>`.
- Vite reste sur la dernière branche 7 compatible avec `electron-vite@5`. Vite 8 existe, mais `electron-vite@5` ne la déclare pas encore dans ses peer dependencies.
