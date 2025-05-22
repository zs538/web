@echo off
REM Set path to portable Node.js
SET NODE_PATH=G:\nodejs\node-v22.15.1-win-x64
SET PATH=%NODE_PATH%;%PATH%

REM Create shortcuts for common commands
DOSKEY npm=%NODE_PATH%\npm.cmd $*
DOSKEY node=%NODE_PATH%\node.exe $*
DOSKEY npx=%NODE_PATH%\npx.cmd $*

echo Node.js environment set up successfully!
echo You can now use 'node', 'npm', and 'npx' commands directly.
echo Current Node.js version:
%NODE_PATH%\node.exe -v
echo Current npm version:
%NODE_PATH%\npm.cmd -v
