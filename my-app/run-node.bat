@echo off
REM Set path to portable Node.js
SET NODE_PATH=G:\nodejs\node-v22.16.0-win-x64
SET PATH=%NODE_PATH%;%PATH%

REM Run node command with all arguments passed to this batch file
%NODE_PATH%\node.exe %*
