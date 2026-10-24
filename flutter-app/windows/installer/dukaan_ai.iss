; Dukaan AI — Windows installer (Phase F design Q3: Inno Setup,
; per-user install, no admin required, unsigned initially).
; Build: ISCC.exe dukaan_ai.iss  (run from this folder after
; `flutter build windows --release`)
#define MyAppName "Dukaan AI"
#define MyAppVersion "6.0.0"
#define MyAppPublisher "CodeHubb & MindCrafts AI"
#define MyAppExeName "dukaan_ai.exe"
#define BuildDir "..\..\build\windows\x64\runner\Release"

[Setup]
AppId={{8F3D2C41-9A5B-4E77-B1C2-DUKAANAI0001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Dukaan AI
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
OutputDir=..\..\build\windows-installer
OutputBaseFilename=DukaanAI-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#BuildDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
