# SSHFS-Win Manager Evo

Interface graphique multi-plateforme pour monter des dossiers distants SSH/SFTP avec SSHFS.

SSHFS-Win Manager Evo est un fork modernisé de [SSHFS-Win Manager](https://github.com/evsar3/sshfs-win-manager), créé à l'origine par Evandro Araujo. Cette édition ajoute une interface revue, de nouveaux modes d'authentification, des outils de gestion des connexions et une préparation multi-OS : Windows reste supporté, Linux est disponible en test, et macOS arrive bientôt.

## Aperçu

<p align="center">
  <img src="imgs/full.png" alt="Vue principale de SSHFS-Win Manager Evo" width="100%">
</p>

Vue principale de SSHFS-Win Manager Evo.

Mode compact :

![Mode compact de SSHFS-Win Manager Evo](imgs/compact.png)

Ajout d'une connexion :

![Fenêtre d'ajout d'une connexion](imgs/add.png)

## Fonctionnalités

- Montage de dossiers distants SSH/SFTP via SSHFS.
- Support Windows via SSHFS-Win, Linux via `sshfs`, et préparation macOS via macFUSE/SSHFS.
- Gestion de plusieurs connexions avec favoris, recherche et tri.
- Fiche détaillée par connexion avec statut, host, port, utilisateur, chemin distant et point de montage.
- Icône personnalisable par connexion, affichée dans la liste et dans la fiche détail.
- Attribution automatique d'une lettre de lecteur libre sous Windows.
- Points de montage automatiques sous Linux et macOS.
- Copie rapide d'une commande `ssh` équivalente pour ouvrir la connexion dans un terminal.
- Ouverture rapide d'une connexion SSH dans un terminal avec le bouton `>_` : Tabby est utilisé s'il est installé, sinon le terminal par défaut de l'OS est ouvert.
- Pour les connexions par mot de passe, le mot de passe est récupéré via la passkey ou demandé, puis copié dans le presse-papiers pour être collé au prompt SSH.
- Import/export JSON des connexions.
- Import de l'ancienne configuration SSHFS-Win Manager depuis `%APPDATA%\sshfs-win-manager\vuex.json`.
- Interface multilingue avec sélection de la langue dans les paramètres.
- Mode debug intégré avec logs de connexion.
- Démarrage avec l'OS et fonctionnement dans la zone de notification.
- Connexion automatique au démarrage, exécutée de façon séquentielle pour éviter les collisions.
- Support IPv6 dans les cibles SSHFS.
- Paramètres avancés SSHFS via options de ligne de commande personnalisées.

## Modes d'authentification

Le logiciel prend en charge plusieurs modes selon la configuration du serveur SSH :

- `Private Key`
- `Private Key + Passphrase`
- `Private Key + PAM/OTP`
- `Private Key + Passphrase + PAM/OTP`
- `Password`
- `Password (ask on connect)`
- `PAM/OTP only (no key) [BETA]`

Les modes PAM/OTP utilisent `keyboard-interactive` et peuvent servir avec des configurations PAM, TOTP, OTP, Radius ou MFA. Les secrets saisis dans les popups de connexion ne sont pas enregistrés dans la configuration.

## Sécurisation des mots de passe

Les mots de passe enregistrés ne sont plus stockés en clair dans la configuration.

SSHFS-Win Manager Evo utilise une **passkey globale** au logiciel pour chiffrer les secrets directement dans le JSON de configuration. Cela permet de conserver un fichier exportable/importable tout en évitant de laisser les mots de passe lisibles.

Fonctionnement :

- Les mots de passe sont chiffrés avec `AES-256-GCM`.
- La clé de chiffrement est dérivée de la passkey globale avec `scrypt`.
- La passkey n'est pas enregistrée.
- À l'ouverture, si des secrets chiffrés sont détectés, l'application demande la passkey.
- La passkey peut être gardée en mémoire temporairement selon le réglage choisi : toujours demander, 1 heure, 12 heures ou 2 jours.
- Si une connexion en mode `Password` n'a pas encore de mot de passe chiffré, l'application le demande à la connexion puis le chiffre pour les prochaines utilisations.
- Les anciens mots de passe en clair sont migrés automatiquement vers le format chiffré.

Important : si la passkey est perdue, les mots de passe chiffrés ne peuvent pas être récupérés. Les connexions restent présentes, mais les secrets devront être ressaisis.

## Prérequis

SSHFS-Win Manager Evo pilote le binaire SSHFS disponible sur votre système. Il faut donc installer les composants SSHFS/FUSE adaptés à votre OS avant de lancer une vraie connexion.

### Windows

- [WinFsp](https://winfsp.dev/)
- [SSHFS-Win](https://github.com/billziss-gh/sshfs-win)

L'application pilote ensuite `sshfs.exe` et monte les dossiers distants comme des lecteurs Windows.

### Linux

- `sshfs`
- FUSE/fuse3

Exemple Debian, Ubuntu, Linux Mint :

```bash
sudo apt update
sudo apt install sshfs fuse3
```

Pour construire les paquets Linux depuis Ubuntu/Debian, installer aussi :

```bash
sudo apt install rpm
```

### macOS

- [macFUSE](https://macfuse.github.io/)
- SSHFS pour macFUSE

macOS peut demander d'autoriser macFUSE dans `Réglages système` > `Confidentialité et sécurité`, puis de redémarrer.

Le guide détaillé par OS est disponible dans [install.md](install.md).

## Installation

1. Installez les prérequis SSHFS de votre OS.
2. Installez ou compilez SSHFS-Win Manager Evo.
3. Ajoutez une connexion.
4. Choisissez une lettre de lecteur sous Windows ou un chemin de montage sous Linux/macOS.
5. Cliquez sur `Connecter`.

## Langues

L'application prend en charge plusieurs langues d'interface.

Langues disponibles actuellement :

- Français
- Anglais

La langue se change depuis `Paramètres` > `Langue`. Le choix est enregistré dans la configuration locale et réappliqué au prochain lancement.

## Développement

Les informations de développement, de build, de lint et de génération des icônes sont regroupées dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Notes importantes

- Le mode `Auto (next free letter)` est géré par l'application sous Windows : une vraie lettre libre est choisie avant le lancement de SSHFS-Win.
- Sous Linux, les points de montage automatiques sont créés sous `~/sshfs-win-manager-evo`.
- Sous macOS, les points de montage automatiques sont prévus sous `~/Mounts/sshfs-win-manager-evo`. Le support macOS est en préparation.
- Certaines authentifications interactives dépendent fortement de la configuration OpenSSH/PAM du serveur.
- Pour les clés protégées par passphrase et les challenges PAM/OTP, l'application prépare les réponses avant de lancer SSHFS via `SSH_ASKPASS`.
- Les images personnalisées de connexions sont stockées dans les données de configuration sous forme de data URL.

## Projet original

Ce projet est basé sur SSHFS-Win Manager :

[https://github.com/evsar3/sshfs-win-manager](https://github.com/evsar3/sshfs-win-manager)

Auteur original : Evandro Araujo.

Édition Evo : Fabrice Simonet, [emulsion.io](https://emulsion.io).

## Licence

MIT License

Copyright (c) 2020 Evandro Araujo

Modifications copyright (c) 2026 Fabrice Simonet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
