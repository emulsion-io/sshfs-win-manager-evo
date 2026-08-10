# Prerequis Linux et macOS

Cette page liste ce qu'il faut installer avant de tester SSHFS-Win Manager Evo sur Linux ou macOS.

L'application ne fournit pas le moteur SSHFS elle-meme : elle lance le binaire `sshfs` installe sur le systeme, puis utilise FUSE pour exposer le dossier distant comme un dossier local.

## Sommaire

- [Windows](#windows)
- [Linux](#linux)
- [macOS](#macos)
- [Points de montage utilises par l'application](#points-de-montage-utilises-par-lapplication)
- [Serveur distant](#serveur-distant)
- [Sources utiles](#sources-utiles)

## Windows

Sur Windows, installer :

- WinFsp : <https://winfsp.dev/>
- SSHFS-Win : <https://github.com/billziss-gh/sshfs-win>

SSHFS-Win depend de WinFsp. Installer WinFsp en premier, puis SSHFS-Win.

### Chemin SSHFS attendu par l'application

Le chemin par defaut est :

```text
C:\Program Files\SSHFS-Win\bin\sshfs.exe
```

Si SSHFS-Win est installe ailleurs, renseigner le chemin exact dans `Parametres` > `Binaire SSHFS`.

### Verifier l'installation Windows

Dans PowerShell :

```powershell
Test-Path "C:\Program Files\SSHFS-Win\bin\sshfs.exe"
& "C:\Program Files\SSHFS-Win\bin\sshfs.exe" --version
```

La premiere commande doit retourner `True`.

### Test manuel Windows

Avant de tester dans l'application, verifier qu'un montage SSHFS simple fonctionne :

```powershell
& "C:\Program Files\SSHFS-Win\bin\sshfs.exe" user@example.com:/home/user X:
```

Pour demonter le lecteur :

```powershell
net use X: /delete
```

Adapter `X:` avec une lettre libre.

## Linux

### Debian, Ubuntu, Linux Mint

```bash
sudo apt update
sudo apt install sshfs fuse3
```

Sur certaines versions, `sshfs` installe deja la dependance FUSE necessaire. Garder `fuse3` dans la commande rend le prerequis explicite.

Pour construire les paquets Linux depuis Debian, Ubuntu ou Linux Mint, installer aussi `rpm` :

```bash
sudo apt install rpm
```

### Fedora

```bash
sudo dnf install fuse-sshfs fuse3
```

### Arch Linux, Manjaro

```bash
sudo pacman -S sshfs fuse3
```

### openSUSE

```bash
sudo zypper install sshfs fuse3
```

### Verifier l'installation Linux

```bash
which sshfs
sshfs --version
```

Le chemin attendu par defaut dans l'application est :

```text
/usr/bin/sshfs
```

Si `sshfs` est installe ailleurs, renseigner ce chemin dans `Parametres` > `Binaire SSHFS`.

### Test manuel Linux

Avant de tester dans l'application, verifier qu'un montage SSHFS simple fonctionne :

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

L'application n'ajoute pas `allow_other` par defaut sur Linux. Si vous l'ajoutez dans les options avancees SSHFS, il peut etre necessaire d'activer cette option dans :

```text
/etc/fuse.conf
```

La ligne suivante doit alors etre presente et non commentee :

```text
user_allow_other
```

## macOS

Sur macOS, l'application prend en charge deux moteurs. Choisir une seule de ces solutions :

- macFUSE avec SSHFS pour macFUSE ;
- FUSE-T avec `sshfs-fuse-t`, une alternative sans extension noyau qui expose le montage via les mecanismes reseau de macOS.

Dans les deux cas, l'application lance le binaire `sshfs` installé sur le système. Le choix du moteur reste donc entièrement contrôlé par l'installation et par le chemin configuré dans `Parametres` > `Binaire SSHFS`.

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

### Chemins SSHFS cherches par l'application

L'application teste ces chemins dans l'ordre :

```text
/opt/homebrew/bin/sshfs
/usr/local/bin/sshfs
/usr/bin/sshfs
```

Le chemin par defaut est :

```text
/opt/homebrew/bin/sshfs
```

Le chemin `/opt/homebrew/bin/sshfs` reste le choix par defaut. Une installation FUSE-T place habituellement son binaire dans `/usr/local/bin/sshfs`, qui est detecte automatiquement si le chemin par defaut n'existe pas. Si SSHFS est installe ailleurs, renseigner le chemin exact dans `Parametres` > `Binaire SSHFS`.

### Verifier l'installation macOS

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

## Points de montage utilises par l'application

### Linux

Si le champ `Chemin de montage` est vide, l'application cree automatiquement un dossier sous :

```text
~/sshfs-win-manager-evo/<nom-connexion>
```

### macOS

Si le champ `Chemin de montage` est vide, l'application cree automatiquement un dossier sous :

```text
~/Mounts/sshfs-win-manager-evo/<nom-connexion>
```

### Chemin personnalise

Il est possible de choisir un dossier local dans le formulaire de connexion. Le dossier peut être vide ou déjà existant, mais il doit être accessible en écriture par l'utilisateur courant.

## Serveur distant

Le serveur distant doit accepter les connexions SSH et exposer le sous-systeme SFTP. Dans la majorite des installations OpenSSH, SFTP est deja actif.

Verifier la connexion SSH avant de tester l'application :

```bash
ssh -p 22 user@example.com
```

Si cette commande échoue, SSHFS échouera aussi.

## Sources utiles

- macFUSE : <https://macfuse.github.io/>
- SSHFS pour macFUSE : <https://github.com/macfuse/macfuse/wiki/File-Systems-%E2%80%90-SSHFS>
- FUSE-T et SSHFS pour FUSE-T : <https://github.com/macos-fuse-t/fuse-t>
- SSHFS upstream : <https://github.com/libfuse/sshfs>
