; Inno Setup script for PixelMimic (Windows).
; Compile from the project root after PyInstaller has produced dist\PixelMimic:
;   ISCC packaging\pixelmimic.iss
; Output: dist\installer\PixelMimicSetup-<version>.exe

#define MyAppName "PixelMimic"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "PixelMimic"
#define MyAppExeName "PixelMimic.exe"

[Setup]
AppId={{7C0E4F3A-9B2D-4E61-A5C8-1F2D3B4E5F60}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist\installer
OutputBaseFilename=PixelMimicSetup-{#MyAppVersion}
SetupIconFile=pixelmimic.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMANumBlockThreads=4
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
MinVersion=10.0

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\PixelMimic\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
const
  WebView2Guid = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function IsWebView2Installed: Boolean;
var
  Ver: String;
begin
  Result :=
    RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Ver) or
    RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Ver) or
    RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Ver);
  if Result then
    Result := (Ver <> '') and (Ver <> '0.0.0.0');
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    if not IsWebView2Installed then
    begin
      if MsgBox(
           'Microsoft WebView2 Runtime was not found on this system.' #13#10 +
           'PixelMimic needs it to display its interface.' #13#10#13#10 +
           'Install it now? (requires an internet connection, ~2 MB download)',
           mbConfirmation, MB_YESNO) = IDYES then
      begin
        Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'),
             '/install', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
      end;
    end;
  end;
end;
