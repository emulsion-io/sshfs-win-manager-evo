# Changelog

## 2.4.5

- Ajout de FUSE-T comme alternative à macFUSE sur macOS, avec détection du binaire, authentification et démontage adaptés.
- Correction du démarrage automatique natif sous macOS et Linux via `launchd` et `systemd --user`.
- Fiabilisation du chargement et de l'enregistrement de l'état afin d'éviter les écritures concurrentes et la persistance des PID ou statuts d'exécution.
- Adoption au démarrage des montages SSHFS toujours actifs lorsqu'ils correspondent exactement à une connexion enregistrée, afin d'éviter les doubles montages.
- Restauration de la notification système lorsque la fenêtre est fermée vers la zone de notification, avec un libellé d'option plus clair.
- Ajout des workflows GitHub Actions pour contrôler et publier les builds Windows, Linux et macOS.

## 2.4.4

- Préservation du mot de passe stocké en clair lorsqu'une connexion est enregistrée sans saisir un nouveau mot de passe.
- Correction du démarrage avec `--systray` afin que la fenêtre principale reste réellement masquée.
- Vérification d'un montage FUSE actif sous Linux et macOS au lieu de se fier à la seule existence du dossier.
- Ajout des répertoires système usuels au `PATH` transmis à SSHFS sous Linux et macOS.
- Omission de l'option `-ovolname` sous Windows lorsqu'une connexion n'a pas de nom.

## 2.4.3

- Mise en évidence de l'état de la session de secrets dans la barre latérale.
- Affichage de la date et de l'heure d'expiration de la session dans le tooltip lorsque celle-ci est active.
- Passage du voyant en orange avec les états `Expiré` ou `Verrouillé` lorsque les secrets ne sont plus accessibles.
- Ajout d'un bouton pour verrouiller manuellement la session et redemander la passkey à la prochaine utilisation.

## 2.4.2

- Ajout d'un bouton `>_` pour ouvrir directement une connexion SSH dans un terminal.
- Ouverture via Tabby si disponible, puis fallback vers le terminal par défaut de l'OS.
- Pour les connexions par mot de passe, copie du mot de passe dans le presse-papiers avant l'ouverture du terminal.
- Renommage technique Windows en `sshfs-manager-evo` pour éviter le regroupement taskbar hérité `Electron`.

## 2.4.1

- Ajout d'une action `Open` dans le menu de la zone de notification.

## 2.4.0

- Préparation multi-OS :
  - handlers séparés pour Windows, Linux et macOS
  - points de montage par chemin local sous Linux et macOS
  - points de montage automatiques sous `~/sshfs-win-manager-evo` sur Linux
  - points de montage automatiques sous `~/Mounts/sshfs-win-manager-evo` sur macOS
  - démontage Linux via `fusermount3`, `fusermount` ou `umount`
  - démontage macOS via `diskutil unmount` ou `umount`
- Ajout du packaging Linux AppImage, deb et rpm.
- Ajout du packaging macOS dmg et zip.
- Ajout des scripts de build par plateforme.
- Ajout de la génération d'icône macOS `.icns`.
- Ajout de la documentation d'installation Linux/macOS.
- Ajout de `.nvmrc` et déclaration des versions Node/npm attendues.

## 2.3.2

- Ajout d'une notification interne quand la passkey déverrouille correctement les secrets.

## 2.3.1

- Ajout de l'option de rétention passkey `1 jour`.
- Augmentation de la hauteur de la popup passkey pour éviter les boutons tronqués.
- Ajout du bouton réduire sur la fenêtre principale.
- Remplacement des notifications Windows natives.

## 2.3.0

- Sécurisation des mots de passe stockés :
  - passkey globale au logiciel
  - chiffrement AES-256-GCM
  - dérivation scrypt
  - secrets chiffrés conservés dans le JSON exportable
  - rétention mémoire configurable
  - migration des anciens mots de passe en clair

## 2.2.0

- Refonte visuelle de l'interface principale avec mode compact.
- Panneau de détail repliable avec redimensionnement dynamique de la fenêtre.
- Navigation latérale simplifiée, toujours compacte, avec labels au survol.
- Mode démo pour générer des captures avec des connexions fictives.
- Ajout d'aperçus visuels dans le README.
- Icône d'application personnalisée appliquée aux fenêtres Electron.
- Tri par statut corrigé pour afficher les connexions actives en premier.
- Import de l'ancienne configuration SSHFS-Win Manager.
- Support de l'attribution automatique de la prochaine lettre de lecteur libre.
- Ajout et amélioration des modes d'authentification :
  - Private Key
  - Private Key + Passphrase
  - Private Key + PAM/OTP
  - Private Key + Passphrase + PAM/OTP
  - Password
  - Password (ask on connect)
  - PAM/OTP only (no key) [BETA]
- Gestion des passphrases et challenges PAM/OTP via popup dédiée.
- Ajout de l'internationalisation français/anglais.
- Ajout de thèmes sombres et clairs, dont un thème inspiré de GitHub Desktop.
- Personnalisation du logo par connexion.
- Copie rapide d'une commande SSH équivalente.

## 2.1.0

- Préparation de la modernisation de l'interface.
- Ajout des premières options de personnalisation visuelle.
- Corrections autour des logs et du suivi d'état des connexions.

## 2.0.0

- Passage du projet en édition Evo.
- Mise à jour des informations À propos, auteur et liens projet.
- Base de migration depuis le fork original.
