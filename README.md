# SSHFS-Win Manager Evo

## Introduction 
SSHFS-Win Manager Evo is a GUI (graphics user interface) for SSHFS on Windows.

This project is based on [SSHFS-Win Manager](https://github.com/evsar3/sshfs-win-manager) by Evandro Araujo.

## Installation
**Step 1**  

Install SSHFS-Win on your Windows computer.  
Follow their [installation instructions](https://github.com/billziss-gh/sshfs-win/blob/master/README.md) before continuing.  

**Step 2**  

Once SSHFS-Win is installed, build or install SSHFS-Win Manager Evo and add your connections.

**Step 3**  

Add your connections and enjoy!

## Features

- Electron-based application. [Electron](https://github.com/electron/electron) is the same engine that powers [Visual Studio Code](https://github.com/microsoft/vscode), [Discord](https://discordapp.com/), [GitKraken](https://www.gitkraken.com/) and [many more](https://www.electronjs.org/apps).

- User-friendly and intuitive interface

- Multiple authentication methods: 
  - Password<sup>1</sup>
  - Private Key (without password)
  - Ask for password

- Startup with Windows
- Close to system tray
- Quick debug tool
- Supports advanced command line params
- Easily duplicate connections
- Reorder connections
- Connection debug log

## Screenshots
![Main Window](https://user-images.githubusercontent.com/1992754/179056109-a0df5872-f187-40b1-895c-9ef57abd5fe7.png)  
*Main Window*

![Add Connection](https://user-images.githubusercontent.com/1992754/179056126-0f767346-fe93-48fc-9ceb-3514b0b7b386.png)  
*Add & edit connections*

![Open mounted drive](https://user-images.githubusercontent.com/1992754/179056142-3d368a65-f9c6-4232-86d6-bb8db6eff556.png)  
*Explore mounted drive*

![System tray](https://user-images.githubusercontent.com/1992754/179056152-9a7088c4-f23a-4c0d-b70b-1ccf879897fb.png)  
*Close to system tray*

## Upstream project
The original SSHFS-Win Manager repository is available at [evsar3/sshfs-win-manager](https://github.com/evsar3/sshfs-win-manager).

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for development, test mode, and installer build commands.

## Notes
<sup>1</sup> This software stores your password in a plain json file. If there is any concerns on storing your password that way, please use one of the other authentication methods. See issue #28

## License
MIT License

Copyright (c) 2020 Evandro Araújo
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
