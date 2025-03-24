"use client";

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { editorThemes } from './MonacoEditor';

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
  currentTheme, 
  onThemeChange 
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-muted-foreground/20">
          {currentTheme === 'light' && <Sun className="h-[1.2rem] w-[1.2rem]" />}
          {currentTheme === 'vs-dark' && <Moon className="h-[1.2rem] w-[1.2rem]" />}
          {(currentTheme === 'github-dark' || currentTheme === 'hc-black') && (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="ml-2">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editorThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            className={`${currentTheme === theme.value ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => onThemeChange(theme.value)}
          >
            {theme.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 