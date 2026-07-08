# Changelog


## 2.3.1

- Ajout de l'option de rétention passkey `1 jour`.
- Augmentation de la hauteur de la popup passkey pour éviter les boutons tronqués.
- Ajout du bouton réduire sur la fenêtre principale.
- Correction du clic sur les notifications Windows pour restaurer l'application au lieu d'ouvrir la page par défaut Electron.

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
