@echo off
chcp 65001 >nul
title LIGHT UP, DERURU!
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
