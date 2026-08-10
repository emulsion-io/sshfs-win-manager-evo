# Installation et prérequis

Cette page liste ce qu'il faut installer avant d'utiliser SSHFS-Win Manager Evo sur Windows, Linux ou macOS.

L'application ne fournit pas le moteur SSHFS elle-même : elle lance le binaire `sshfs` installé sur le système, puis utilise FUSE pour exposer le dossier distant comme un dossier local.

## Sommaire

- [Windows](#windows)
- [Linux](#linux)
- [macOS](#macos)
- [Points de montage utilisés par l'application](#points-de-montage-utilisés-par-lapplication)
- [Serveur distant](#serveur-distant)
- [Sources utiles](#sources-utiles)

## Windows

Sur Windows, installer :

- WinFsp : <https://winfsp.dev/>
- SSHFS-Win : <https://github.com/billziss-gh/sshfs-win>

SSHFS-Win dépend de WinFsp. Installer WinFsp en premier, puis SSHFS-Win.

### Chemin SSHFS attendu par l'application

Le chemin par défaut est :

```text
C:\Program Files\SSHFS-Win\bin\sshfs.exe
```

Si SSHFS-Win est installé ailleurs, renseigner le chemin exact dans `Paramètres` > `Binaire SSHFS`.

### Vérifier l'installation Windows

Dans PowerShell :

```powershell
Test-Path "C:\Program Files\SSHFS-Win\bin\sshfs.exe"
& "C:\Program Files\SSHFS-Win\bin\sshfs.exe" --version
```

La première commande doit retourner `True`.

### Test manuel Windows

Avant de tester dans l'application, vérifier qu'un montage SSHFS simple fonctionne :

```powershell
& "C:\Program Files\SSHFS-Win\bin\sshfs.exe" user@example.com:/home/user X:
```

Pour démonter le lecteur :

```powershell
net use X: /delete
```

Adapter `X:` avec une lettre libre.

## Linux

### Debian, Ubuntu, Linux Mint

```bash
sudo apt update
sudo apt install sshfs
```

Le gestionnaire de paquets installe automatiquement FUSE et les bibliothèques nécessaires avec SSHFS.

### Fedora

```bash
sudo dnf install fuse-sshfs
```

### Arch Linux, Manjaro

```bash
sudo pacman -S sshfs
```

### openSUSE

```bash
sudo zypper install sshfs
```

### Vérifier l'installation Linux

```bash
which sshfs
sshfs --version
```

Le chemin attendu par défaut dans l'application est :

```text
/usr/bin/sshfs
```

Si `sshfs` est installé ailleurs, renseigner ce chemin dans `Paramètres` > `Binaire SSHFS`.

### Test manuel Linux

Avant de tester dans l'application, vérifier qu'un montage SSHFS simple fonctionne :

```bash
mkdir -p ~/sshfs-test
sshfs user@example.com:/home/user ~/sshfs-test
mountpoint ~/sshfs-test
fusermount3 -u ~/sshfs-test
```

Si `fusermount3` n'existe pas, essayer :

```bash
fusermount -u ~/sshfs-test
```

### Option `allow_other`

L'application n'ajoute pas `allow_other` par défaut sur Linux. Si vous l'ajoutez dans les options avancées SSHFS, il peut être nécessaire d'activer cette option dans :

```text
/etc/fuse.conf
```

La ligne suivante doit alors être présente et non commentée :

```text
user_allow_other
```

## macOS

Sur macOS, l'application prend en charge deux moteurs. Choisir une seule de ces solutions :

- macFUSE avec SSHFS pour macFUSE ;
- FUSE-T avec `sshfs-fuse-t`, une alternative sans extension noyau qui expose le montage via les mécanismes réseau de macOS.

Dans les deux cas, l'application lance le binaire `sshfs` installé sur le système. Le choix du moteur reste donc entièrement contrôlé par l'installation et par le chemin configuré dans `Paramètres` > `Binaire SSHFS`.

### Option A : macFUSE

1. Installer macFUSE depuis le site officiel :

   <https://macfuse.github.io/>

2. Installer SSHFS depuis la page officielle macFUSE/SSHFS :

   <https://github.com/macfuse/macfuse/wiki/File-Systems-%E2%80%90-SSHFS>

3. Si macOS demande d'autoriser une extension système ou un composant macFUSE, le faire dans `Réglages système` > `Confidentialité et sécurité`.

4. Redémarrer macOS si l'installateur ou le système le demande.

### Option B : FUSE-T

FUSE-T ne charge pas d'extension noyau. Il peut être installé avec Homebrew :

```bash
brew install macos-fuse-t/homebrew-cask/sshfs-fuse-t
```

La formule installe FUSE-T et son implémentation SSHFS. Après l'installation, vérifier que `sshfs` est disponible comme indiqué ci-dessous.

Comme FUSE-T expose notamment les montages comme des volumes réseau locaux, macOS peut demander l'autorisation d'accéder aux `Volumes réseau` dans `Réglages système` > `Confidentialité et sécurité` > `Fichiers et dossiers`.

### Chemins SSHFS cherchés par l'application

L'application teste ces chemins dans l'ordre :

```text
/opt/homebrew/bin/sshfs
/usr/local/bin/sshfs
/usr/bin/sshfs
```

Le chemin par défaut est :

```text
/opt/homebrew/bin/sshfs
```

Le chemin `/opt/homebrew/bin/sshfs` reste le choix par défaut. Une installation FUSE-T place habituellement son binaire dans `/usr/local/bin/sshfs`, qui est détecté automatiquement si le chemin par défaut n'existe pas. Si SSHFS est installé ailleurs, renseigner le chemin exact dans `Paramètres` > `Binaire SSHFS`.

### Vérifier l'installation macOS

```bash
which sshfs
sshfs --version
```

### Test manuel macOS

Avant de tester dans l'application :

```bash
mkdir -p ~/Mounts/sshfs-test
sshfs user@example.com:/home/user ~/Mounts/sshfs-test
mount | grep sshfs-test
diskutil unmount ~/Mounts/sshfs-test
```

Si `diskutil unmount` ne suffit pas :

```bash
umount ~/Mounts/sshfs-test
```

## Points de montage utilisés par l'application

### Linux

Si le champ `Chemin de montage` est vide, l'application crée automatiquement un dossier sous :

```text
~/sshfs-win-manager-evo/<nom-connexion>
```

### macOS

Si le champ `Chemin de montage` est vide, l'application crée automatiquement un dossier sous :

```text
~/Mounts/sshfs-win-manager-evo/<nom-connexion>
```

### Chemin personnalisé

Il est possible de choisir un dossier local dans le formulaire de connexion. Le dossier peut être vide ou déjà existant, mais il doit être accessible en écriture par l'utilisateur courant.

## Serveur distant

Le serveur distant doit accepter les connexions SSH et exposer le sous-système SFTP. Dans la majorité des installations OpenSSH, SFTP est déjà actif.

Vérifier la connexion SSH avant de tester l'application :

```bash
ssh -p 22 user@example.com
```

Si cette commande échoue, SSHFS échouera aussi.

## Sources utiles

- macFUSE : <https://macfuse.github.io/>
- SSHFS pour macFUSE : <https://github.com/macfuse/macfuse/wiki/File-Systems-%E2%80%90-SSHFS>
- FUSE-T et SSHFS pour FUSE-T : <https://github.com/macos-fuse-t/fuse-t>
- SSHFS upstream : <https://github.com/libfuse/sshfs>
