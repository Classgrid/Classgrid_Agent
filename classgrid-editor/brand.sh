#!/usr/bin/env bash
# Turns the VSCodium build scripts (cloned into ./vscodium) into the Classgrid editor: our name, our logo, our own
# app ids (so it never clashes with a VSCodium or VS Code on the same computer), no VSCodium update server.
set -e
cd "$(dirname "$0")/vscodium"

P=prepare_vscode.sh
sed -i \
  -e 's|"nameShort" "VSCodium"|"nameShort" "Classgrid Code"|' \
  -e 's|"nameLong" "VSCodium"|"nameLong" "Classgrid Code"|' \
  -e 's|^\( *\)setpath "product" "nameLong" "Classgrid Code"|&\n\1setpath "product" "dataFolderName" ".classgrid-code"|' \
  -e 's|"applicationName" "codium"|"applicationName" "classgrid-code"|' \
  -e 's|"linuxIconName" "vscodium"|"linuxIconName" "classgrid-code"|' \
  -e 's|"urlProtocol" "vscodium"|"urlProtocol" "classgrid-code"|' \
  -e 's|"serverApplicationName" "codium-server"|"serverApplicationName" "classgrid-code-server"|' \
  -e 's|"serverDataFolderName" ".vscodium-server"|"serverDataFolderName" ".classgrid-code-server"|' \
  -e 's|"darwinBundleIdentifier" "com.vscodium"|"darwinBundleIdentifier" "in.classgrid.code"|' \
  -e 's|"win32AppUserModelId" "VSCodium.VSCodium"|"win32AppUserModelId" "Classgrid.ClassgridCode"|' \
  -e 's|"win32DirName" "VSCodium"|"win32DirName" "Classgrid Code"|' \
  -e 's|"win32MutexName" "vscodium"|"win32MutexName" "classgridcode"|' \
  -e 's|"win32NameVersion" "VSCodium"|"win32NameVersion" "Classgrid Code"|' \
  -e 's|"win32RegValueName" "VSCodium"|"win32RegValueName" "ClassgridCode"|' \
  -e 's|"win32ShellNameShort" "VSCodium"|"win32ShellNameShort" "Classgrid Code"|' \
  -e 's|{{763CBF88-25C6-4B10-952F-326AE657F16B}|{{F11BC841-44ED-46A6-AF8D-67F792663CA8}|' \
  -e 's|{{88DA3577-054F-4CA1-8122-7D820494CFFB}|{{4628E5D0-9876-4DF8-A6F6-CE78561BB5AC}|' \
  -e 's|{{67DEE444-3D04-4258-B92A-BC1F0FF2CAE4}|{{862E270D-1A66-4ADD-B1AC-AFA77F8F8CE4}|' \
  -e 's|{{0FD05EB4-651E-4E78-A062-515204B47A3A}|{{CBBD448C-27A2-4038-9DD9-B89FB021753E}|' \
  -e 's|{{2E1F05D1-C245-4562-81EE-28188DB6FD17}|{{BEEE05E2-43F5-49BB-95CF-B136F2FE3805}|' \
  -e 's|{{57FD70A5-1B8D-4875-9F40-C5553F094828}|{{719D4A80-0ACF-46BD-96F3-36452DB959BB}|' \
  -e 's|"tunnelApplicationName" "codium-tunnel"|"tunnelApplicationName" "classgrid-code-tunnel"|' \
  -e 's|"win32TunnelServiceMutex" "vscodium-tunnelservice"|"win32TunnelServiceMutex" "classgridcode-tunnelservice"|' \
  -e 's|"win32TunnelMutex" "vscodium-tunnel"|"win32TunnelMutex" "classgridcode-tunnel"|' \
  -e 's|D910D5E6-B277-4F4A-BDC5-759A34EEE25D|A5FE38ED-B1D9-45D1-8293-4699829F97F2|' \
  -e 's|4852FC55-4A84-4EA1-9C86-D53BE3DF83C0|C11332E3-1449-44A8-8948-1CD265AA1AD8|' \
  -e 's|^\( *\)setpath "product" "updateUrl".*|\1: # updates come with the Classgrid app|' \
  "$P"
grep -q '"nameShort" "Classgrid Code"' "$P" || { echo "brand: name not set" >&2; exit 1; }
grep -q '"applicationName" "classgrid-code"' "$P" || { echo "brand: application name not set" >&2; exit 1; }
grep -q '"dataFolderName" ".classgrid-code"' "$P" || { echo "brand: data folder not set" >&2; exit 1; }

# Our logo for the program, its window and its files
ICON="../icon.ico"
for f in src/stable/resources/win32/code.ico; do cp "$ICON" "$f"; done

# Our logo inside the editor too (title bar icon, the faded logo in empty editors, the window tiles), made from the
# website's own icon like the cloud editor's (infra/ide/build.sh)
PUB="../../client/public"
if [ -f "$PUB/android-chrome-512x512.png" ]; then
  B64=$(base64 -w0 "$PUB/android-chrome-512x512.png")
  svg() { echo "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 512 512\" width=\"512\" height=\"512\"><image width=\"512\" height=\"512\" opacity=\"$1\" xlink:href=\"data:image/png;base64,$B64\"/></svg>"; }
  svg 1 > src/stable/src/vs/workbench/browser/media/code-icon.svg
  for v in dark light hcDark hcLight; do svg 0.12 > "src/stable/src/vs/workbench/browser/parts/editor/media/letterpress-$v.svg"; done
  cp "$PUB/android-chrome-512x512.png" src/stable/resources/win32/code_150x150.png
  cp "$PUB/android-chrome-192x192.png" src/stable/resources/win32/code_70x70.png
  cp "$PUB/android-chrome-512x512.png" src/stable/resources/linux/code.png
  cp "$PUB/android-chrome-192x192.png" src/stable/resources/server/code-192.png
  cp "$PUB/android-chrome-512x512.png" src/stable/resources/server/code-512.png
  cp "$PUB/favicon.ico" src/stable/resources/server/favicon.ico
  grep -q "data:image/png;base64" src/stable/src/vs/workbench/browser/media/code-icon.svg || { echo "brand: logo not set" >&2; exit 1; }
else
  echo "brand: client/public isn't here, so only the program icon is ours" >&2
fi
# Our own small changes to VS Code's code (classgrid-editor/patches), applied after VSCodium's own
mkdir -p patches/user
for f in ../patches/*.patch; do [ -f "$f" ] && cp "$f" patches/user/; done

echo "Classgrid editor branding applied"
