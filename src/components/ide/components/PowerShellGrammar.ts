// Enhanced PowerShell Grammar with specific highlighting for PSADT commands

export const PowerShellGrammar = {
  defaultToken: 'text',
  ignoreCase: true,
  tokenPostfix: '.ps1',

  // Common regular expressions
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  // PowerShell specific keywords
  keywords: [
    'begin', 'break', 'catch', 'class', 'continue', 'data', 'define', 'do', 'dynamicparam', 'else', 'elseif',
    'end', 'enum', 'exit', 'filter', 'finally', 'for', 'foreach', 'from', 'function', 'if', 'in',
    'param', 'process', 'return', 'switch', 'throw', 'trap', 'try', 'until', 'using', 'var', 'while', 'workflow',
  ],

  // Common PowerShell cmdlets (verb-noun pattern) - prioritized list
  verbs: [
    // Priority verbs (from the image)
    'Add', 'Block', 'Close', 'Complete', 'Convert', 'ConvertTo', 'Copy', 'Disable', 'Dismount',
    'Enable', 'Export', 'Get', 'Initialize', 'Install', 'Invoke', 'Mount', 'New', 'Open',
    'Out', 'Register', 'Remove', 'Reset', 'Resolve', 'Send', 'Set', 'Show', 'Start',
    'Stop', 'Test', 'Unblock', 'Uninstall',
    
    // Other common verbs
    'Clear', 'Enter', 'Exit', 'Find', 'Format', 'Hide', 'Join', 'Lock', 'Move',
    'Optimize', 'Pop', 'Push', 'Redo', 'Rename', 'Resize', 'Search', 'Select',
    'Skip', 'Split', 'Step', 'Switch', 'Sync', 'Trace', 'Undo', 'Unlock',
    'Watch', 'Write', 'Wait', 'Use', 'Import', 'Export',
  ],

  // PSADT specific commands with high visibility
  psadtCommands: [
    // Show and display commands
    'Show-ADTInstallationWelcome', 'Show-ADTInstallationProgress', 'Show-ADTInstallationPrompt', 
    'Show-DialogBox',
    
    // Process management commands
    'Start-ADTMsiProcess', 'Execute-Process', 'Execute-ProcessAsUser', 'Execute-MSI',
    'Start-Process', 'Start-ServiceAndDependencies', 'Stop-ServiceAndDependencies',
    
    // File and registry operations
    'Remove-File', 'Copy-File', 'Get-ChildItems', 'Get-SpecialFolder',
    'Set-RegistryKey', 'Set-ActiveSetup', 'Copy-Item', 'Remove-Item',
    'New-Item', 'New-Shortcut', 'Get-UserProfiles',
    
    // Flow control and utility commands
    'Write-Log', 'Exit-Script', 'Start-Sleep', 'Close-ADTInstallationProgress',
    
    // Test commands from the image
    'Test-ADTBattery', 'Test-ADTCallersAdmin', 'Test-ADTMicrophoneInUse', 
    'Test-ADTModuleInitialized', 'Test-ADTMSUpdates', 'Test-ADTMutexAvailability',
    'Test-ADTNetworkConnection', 'Test-ADTOobeCompleted', 'Test-ADTPowerPoint',
    'Test-ADTRegistryValue', 'Test-ADTServiceExists', 'Test-ADTSessionActive',
    'Test-ADTUserIsBusy', 'Test-Path', 'Test-ServiceExists'
  ],

  // PSADT-specific parameters to highlight
  psadtParameters: [
    'CloseApps', 'CloseAppsCountdown', 'CloseSelf', 'CloseProcess', 'CloseProcesses',
    'CloseProcessesCountdown', 'CheckDiskSpace', 'CustomText', 'DeploymentType',
    'DeferTimes', 'DisableLogging', 'EnableLogging', 'FilePath', 'FileName',
    'iexplore', 'InstallationWelcomePrompt', 'LogName', 'MinimizeWindows',
    'NoCloseApps', 'NoWait', 'PersistPrompt', 'Silent', 'SyncAppvClientPackages',
    'TerminalServerMode', 'TopMost', 'UseDefaultMsi', 'Timeout', 'Wait',
    'WorkingDirectory'
  ],

  // Common operators in PowerShell
  operators: [
    '-eq', '-ne', '-gt', '-ge', '-lt', '-le', '-like', '-notlike', '-match', '-notmatch',
    '-contains', '-notcontains', '-in', '-notin', '-is', '-as', '-replace', '-creplace',
    '-ireplace', '-and', '-or', '-not', '-xor', '-band', '-bor', '-bnot', '-bxor',
    '-f', '-join', '-split', '+', '-', '*', '/', '%', '++', '--'
  ],

  // Tokenizer rules
  tokenizer: {
    root: [
      // PSADT Commands with highest priority
      [/\b(Show-ADT|Start-ADT|Close-ADT|Execute-|Set-ADT|Get-ADT)[\w]+\b/, 'psadt.command'],
      
      // PowerShell variable with $ prefix
      [/\$[\w]+\b/, 'variable'],
      
      // PSADT Parameters with dash prefix (like -CheckDiskSpace, -PersistPrompt)
      [/\s-([A-Za-z][\w]+)\b/, {
        cases: {
          '(CloseProcesses|PersistPrompt|CloseAppsCountdown|TerminalServerMode|CheckDiskSpace|iexplore|InstallationWelcomePrompt)': 'psadt.parameter',
          '@default': 'parameter'
        }
      }],
      
      // Special case for PSADT parameter values (numbers after parameters)
      [/\s-([A-Za-z][\w]+)(\s+)(\d+)\b/, ['parameter', '', 'psadt.number']],
      
      // Comments - single line and block
      [/#.*$/, 'comment'],
      [/<#/, { token: 'comment', next: '@commentBlock' }],
      
      // Type declarations with brackets
      [/\[.*?\]/, 'type'],
      
      // Control keywords
      [/\b(if|else|elseif|switch|while|for|foreach|do|until|break|continue|return|try|catch|finally|throw)\b/i, 'keyword.control'],
      
      // Declaration keywords
      [/\b(function|param|begin|process|end|class|enum|filter)\b/i, 'keyword.declaration'],
      
      // PowerShell cmdlets (verb-noun pattern)
      [/\b(Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|Search|Select|Set|Show|Skip|Split|Step|Switch|Sync|Test|Trace|Unblock|Undo|Unlock|Watch|Write|Start|Stop|Out|Wait|Use|Install|Uninstall|Import|Export)-[\w]+\b/i, 'function'],
      
      // PowerShell specific keywords
      [/\b(begin|break|catch|class|continue|data|define|do|dynamicparam|else|elseif|end|enum|exit|filter|finally|for|foreach|from|function|if|in|param|process|return|switch|throw|trap|try|until|using|var|while|workflow)\b/i, 'keyword'],
      
      // Strings with variables in them
      [/"(?:[^"$]|\$[^{]|\${\w+})*"/, 'string'],
      [/'[^']*'/, 'string'],
      
      // Numeric literals
      [/\b\d+\b/, 'number'],
      
      // Special operators
      [/\|>|>>|\|/, 'operator'],
      
      // Parentheses/Brackets
      [/[{}()\[\]]/, '@brackets'],
      
      // Special markers like ## MARK
      [/##\s+MARK:.*$/, 'markup.heading'],
      [/##=+$/, 'markup.heading']
    ],
    
    commentBlock: [
      [/#>/, { token: 'comment', next: '@pop' }],
      [/./, 'comment']
    ]
  }
};
