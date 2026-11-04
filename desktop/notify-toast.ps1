param(
  [string]$Title = "",
  [string]$Body = "",
  # The app the notification comes from (its name and logo in Windows): Classgrid Code's Start menu entry, which the
  # Classgrid app adds (desktop/codeeditor.js). PowerShell's own id is used only if that entry isn't there.
  [string]$AppId = "Classgrid.ClassgridCode",
  # Play Windows' notification sound with it
  [switch]$Sound,
  # Only Windows' notification sound, no notification (the window is already in front)
  [switch]$SoundOnly
)
$ErrorActionPreference = "SilentlyContinue"
if ($SoundOnly) {
  (New-Object System.Media.SoundPlayer "$env:WINDIR\Media\Windows Notify System Generic.wav").PlaySync()
  exit 0
}
$powershellId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $known = Test-Path "Registry::HKEY_CURRENT_USER\Software\Classes\AppUserModelId\$AppId"
  if (-not $known) { $known = [bool](Get-StartApps | Where-Object { $_.AppID -eq $AppId }) }
  if (-not $known) { $AppId = $powershellId }
  $t = [System.Security.SecurityElement]::Escape($Title)
  $b = [System.Security.SecurityElement]::Escape($Body)
  $audio = if ($Sound) { "<audio src='ms-winsoundevent:Notification.Default'/>" } else { "<audio silent='true'/>" }
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual>$audio</toast>")
  $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
} catch { }
