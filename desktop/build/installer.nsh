; Classgrid Code's own icon on the desktop and in the Start menu, next to Classgrid's. It runs the Classgrid app with
; --code (main.js): Classgrid Code opens with the app's login, without the app's window. Removed again on uninstall.
!macro customInstall
  CreateShortCut "$DESKTOP\Classgrid Code.lnk" "$appExe" "--code" "$INSTDIR\resources\classgrid-code.ico" 0
  CreateShortCut "$SMPROGRAMS\Classgrid Code.lnk" "$appExe" "--code" "$INSTDIR\resources\classgrid-code.ico" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Classgrid Code.lnk"
  Delete "$SMPROGRAMS\Classgrid Code.lnk"
!macroend
