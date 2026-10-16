#!/bin/sh
# Turns the stock OpenVSCode Server (pinned version, see Dockerfile) into "Classgrid Code".
# Every change is checked; the build stops if one no longer applies (e.g. after changing the base version).
set -e
ROOT="$1"; COMMIT="$2"; A=/tmp/cg/assets
W="$ROOT/out/vs/code/browser/workbench/workbench.js"
OLD_COMMIT=$(grep -o '"commit": *"[a-f0-9]*"' "$ROOT/product.json" | grep -o '[a-f0-9]\{40\}')

must() { grep -q -- "$2" "$1" || { echo "PATCH FAILED: $3" >&2; exit 1; }; }

# 1. Defaults: no VS Code AI chat, chat panel hidden, no welcome page, theme follows light/dark, no account icon,
#    no chat button in the title bar, auto-save on.
perl -0pi -e 's/("chat\.disableAIFeatures":\{type:"boolean",description:d\(\d+,null\),default:)!1/$1!0/' "$W"
perl -0pi -e 's/(qLs=\{type:"boolean",markdownDescription:d\(\d+,null,CD\(An\.PREFERRED_DARK_THEME\),CD\(An\.PREFERRED_LIGHT_THEME\)\),default:)!1/$1!0/' "$W"
perl -0pi -e 's/("workbench\.secondarySideBar\.defaultVisibility":\{type:"string",enum:\[[^\]]*\],default:)"visibleInWorkspace"/$1"hidden"/' "$W"
perl -0pi -e 's/("workbench\.startupEditor":\{scope:5,type:"string",enum:\[[^\]]*\],enumDescriptions:\[[^\]]*\],default:)"welcomePage"/$1"none"/' "$W"
perl -0pi -e 's/(getBoolean\(N\$\.ACCOUNTS_VISIBILITY_PREFERENCE_KEY,0,)!0\)/$1!1)/' "$W"
perl -0pi -e 's/("chat\.commandCenter\.enabled":\{type:"boolean",markdownDescription:d\(\d+,null,"`#window\.commandCenter#`"\),default:)!0/$1!1/' "$W"
perl -0pi -e 's/("files\.autoSave":\{type:"string",enum:\[[^\]]*\],markdownEnumDescriptions:\[[^\]]*\],default:)Lt\?bu\.AFTER_DELAY:bu\.OFF/$1bu.AFTER_DELAY/' "$W"
# 2. Remove the VS Code chat panel completely (our own Classgrid AI is next to the editor)
perl -0pi -e 's/ae\.as\(xs\.ViewsRegistry\)\.registerViews\(Z9s,cse\)/ae.as(xs.ViewsRegistry).registerViews([],cse)/' "$W"
must "$W" '"chat.disableAIFeatures":{type:"boolean",description:d([0-9]*,null),default:!0' "chat off by default"
must "$W" 'registerViews(\[\],cse)' "chat panel removed"
must "$W" 'ACCOUNTS_VISIBILITY_PREFERENCE_KEY,0,!1)' "account icon hidden"
must "$W" 'default:bu.AFTER_DELAY' "auto-save on"

# 3. No extension store (disk, RAM and safety; our own safe extensions are installed per box by ide-user.sh),
#    and no Extensions icon in the left bar
"$ROOT/node" -e 'const fs=require("fs");const f=process.argv[1];const p=JSON.parse(fs.readFileSync(f,"utf8"));for(const k of ["extensionsGallery","extensionRecommendations","keymapExtensionTips","languageExtensionTips","configBasedExtensionTips"])delete p[k];fs.writeFileSync(f,JSON.stringify(p,null,"\t"))' "$ROOT/product.json"
printf '\n/* classgrid-no-extensions: no extension store in Classgrid Code */\n.monaco-workbench .activitybar li.action-item:has(.codicon-extensions-view-icon){display:none!important}\n' >> "$ROOT/out/vs/code/browser/workbench/workbench.css"
# No Copilot icon or "Set up Copilot" card in the status bar (not our brand)
printf '\n/* classgrid-no-copilot: no Copilot icon or setup card in Classgrid Code */\n.monaco-workbench .statusbar-item[id="chat.statusBarEntry"]{display:none!important}\n' >> "$ROOT/out/vs/code/browser/workbench/workbench.css"
# The same store address is also built into the program files; rename it there so it is never used
F=$(grep -l 'extensionsGallery:{serviceUrl:"https://open-vsx.org' -r "$ROOT/out")
sed -i 's#extensionsGallery:{serviceUrl:"https://open-vsx.org#extensionsGalleryOff:{serviceUrl:"https://open-vsx.org#g' $F
if grep -q extensionsGallery "$ROOT/product.json" || grep -rq 'extensionsGallery:{serviceUrl' "$ROOT/out"; then echo "PATCH FAILED: extension store still on" >&2; exit 1; fi

# 3b. Nothing from Microsoft, GitHub or Copilot: no "Ask @vscode", no VS Code sign-in / tunnel / chat add-ons
#     (Classgrid has its own GitHub plugin), no "Do you trust this folder?" popup (each user's box is already walled off)
perl -0pi -e 's/(title:D\(\d+,"Ask \@vscode"\),category:Ie\.Help,f1:)!0,precondition:C\.equals\("chatSetupHidden",!1\)/$1!1,precondition:C.equals("classgridNever",!0)/' "$W"
perl -0pi -e 's/(command:\{id:jei\.ID,title:D\(\d+,"Ask \@vscode"\)\},order:7,group:"1_welcome",when:)C\.equals\("chatSetupHidden",!1\)/$1C.equals("classgridNever",!0)/' "$W"
perl -0pi -e 's/(\[jfe\]:\{type:"boolean",default:)!0/$1!1/' "$W"
must "$W" 'classgridNever' "Ask @vscode hidden"
must "$W" '\[jfe\]:{type:"boolean",default:!1' "folder trust popup off"
rm -rf "$ROOT/extensions/github" "$ROOT/extensions/github-authentication" "$ROOT/extensions/microsoft-authentication" "$ROOT/extensions/tunnel-forwarding" "$ROOT/extensions/mermaid-chat-features"
"$ROOT/node" /tmp/cg/rm-builtin.js "$W" github-authentication microsoft-authentication github tunnel-forwarding mermaid-chat-features
grep -rl "VSCode" "$ROOT/extensions" --include=package.nls.json | xargs -r sed -i "s/VSCode/Classgrid Code/g"
sed -i "s/Grunt support for VS Code/Grunt support/" "$ROOT/extensions/grunt/package.json"

# 4. Classgrid theme as the default light/dark theme, Classgrid logos
cp /tmp/cg/default-dark-modern.json "$ROOT/extensions/theme-defaults/themes/dark_modern.json"
cp /tmp/cg/default-light-modern.json "$ROOT/extensions/theme-defaults/themes/light_modern.json"
cp "$A/favicon.ico" "$ROOT/resources/server/favicon.ico"
cp "$A/code-192.png" "$ROOT/resources/server/code-192.png"
cp "$A/code-512.png" "$ROOT/resources/server/code-512.png"
for v in dark light hcDark hcLight; do cp "$A/letterpress.svg" "$ROOT/out/media/letterpress-$v.svg"; done
cp "$A/code-icon.svg" "$ROOT/out/media/code-icon.svg"

# 5. Our name instead of Microsoft's (trademark). The MIT license notice files stay as they are.
F=$(grep -rl "VS Code\|Visual Studio Code" "$ROOT/out/nls.messages.js" "$ROOT/out/nls.messages.json" "$W" $(grep -rl "VS Code\|Visual Studio Code" "$ROOT/extensions" --include=package.nls.json))
sed -i -e "s/Visual Studio Code/Classgrid Code/g" -e "s/VS Code/Classgrid Code/g" $F
F=$(grep -rl "OpenVSCode Server\|OpenVSC&ode Server" "$ROOT/out" "$ROOT/product.json" "$ROOT/package.json")
sed -i -e "s/OpenVSC&ode Server/Classgrid C\&ode/g" -e "s/OpenVSCode Server/Classgrid Code/g" $F

# 6. New build id, so browsers load our changed files instead of old saved copies
grep -rl "$OLD_COMMIT" "$ROOT" --include=*.js --include=*.json --include=*.html | xargs sed -i "s/$OLD_COMMIT/$COMMIT/g"
must "$ROOT/product.json" "\"commit\": \"$COMMIT\"" "build id"
echo "Classgrid Code patched (build $COMMIT)"
