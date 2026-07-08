# Prerequis Linux et macOS

Cette page liste ce qu'il faut installer avant de tester SSHFS-Win Manager Evo sur Linux ou macOS.

L'application ne fournit pas le moteur SSHFS elle-meme : elle lance le binaire `sshfs` installe sur le systeme, puis utilise FUSE pour exposer le dossier distant comme un dossier local.

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

Sur macOS, il faut installer deux choses :

- macFUSE
- SSHFS pour macFUSE

Le site macFUSE indique que macFUSE installe le support FUSE, mais que les systemes de fichiers comme SSHFS doivent etre installes separement.

### Installation recommandee

1. Installer macFUSE depuis le site officiel :

   <https://macfuse.github.io/>

2. Installer SSHFS depuis la page officielle macFUSE/SSHFS :

   <https://github.com/macfuse/macfuse/wiki/File-Systems-%E2%80%90-SSHFS>

3. Si macOS demande d'autoriser une extension systeme ou un composant macFUSE, le faire dans `Reglages systeme` > `Confidentialite et securite`.

4. Redemarrer macOS si l'installateur ou le systeme le demande.

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

Si SSHFS est installe ailleurs, renseigner le chemin exact dans `Parametres` > `Binaire SSHFS`.

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

Il est possible de choisir un dossier local dans le formulaire de connexion. Le dossier peut etre vide ou deja existant, mais il doit etre accessible en ecriture par l'utilisateur courant.

## Serveur distant

Le serveur distant doit accepter les connexions SSH et exposer le sous-systeme SFTP. Dans la majorite des installations OpenSSH, SFTP est deja actif.

Verifier la connexion SSH avant de tester l'application :

```bash
ssh -p 22 user@example.com
```

Si cette commande echoue, SSHFS echouera aussi.

## Sources utiles

- macFUSE : <https://macfuse.github.io/>
- SSHFS pour macFUSE : <https://github.com/macfuse/macfuse/wiki/File-Systems-%E2%80%90-SSHFS>
- SSHFS upstream : <https://github.com/libfuse/sshfs>
