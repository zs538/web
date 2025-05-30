@echo off
REM Set path to portable Node.js
SET NODE_PATH=G:\nodejs\node-v22.16.0-win-x64
SET PATH=%NODE_PATH%;%PATH%

REM Make sure node is also in the PATH
SET NODE_BIN=%NODE_PATH%
SET PATH=%NODE_BIN%;%PATH%

REM Run npm command with all arguments passed to this batch file
%NODE_PATH%\npm.cmd %*

REM If you need to see the environment for debugging
REM echo PATH=%PATH%
