import { ThemeName } from '../types/floorplan';

export interface ThemeColors {
  name: ThemeName;
  paper: string;
  grid: string;
  gridMajor: string;
  wall: string;
  wallFill: string;
  wallSel: string;
  wallFillSel: string;
  accent: string;
  accentText: string;
  accentFaint: string;
  symbol: string;
  symbolStroke: string;
  symbolFill: string;
  muted: string;
  roomText: string;
  dimension: string;
  doorSwing: string;
  windowGlass: string;
  uiBg: string;
  uiBorder: string;
  uiText: string;
  uiMuted: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  light: {
    name: 'light',
    paper: '#ffffff',
    grid: '#e5e9f0',
    gridMajor: '#cbd5e1',
    wall: '#1e293b',
    wallFill: '#cbd5e1',
    wallSel: '#2563eb',
    wallFillSel: '#bfdbfe',
    accent: '#2563eb',
    accentText: '#1e40af',
    accentFaint: 'rgba(37,99,235,0.15)',
    symbol: '#475569',
    symbolStroke: '#334155',
    symbolFill: '#ffffff',
    muted: '#64748b',
    roomText: '#475569',
    dimension: '#2563eb',
    doorSwing: '#3b82f6',
    windowGlass: '#93c5fd',
    uiBg: '#ffffff',
    uiBorder: '#e2e8f0',
    uiText: '#0f172a',
    uiMuted: '#64748b'
  },
  paper: {
    name: 'paper',
    paper: '#f4f2ec',
    grid: '#e8e6e0',
    gridMajor: '#d6d8d8',
    wall: '#1b2430',
    wallFill: '#c9c3b5',
    wallSel: '#2c5e91',
    wallFillSel: '#c9d3de',
    accent: '#2c5e91',
    accentText: '#1e3b5c',
    accentFaint: 'rgba(44,94,145,0.18)',
    symbol: '#4a4c52',
    symbolStroke: '#2b2b2b',
    symbolFill: '#fdfcf9',
    muted: '#6b6a64',
    roomText: '#55544e',
    dimension: '#2c5e91',
    doorSwing: '#2c5e91',
    windowGlass: '#8faec7',
    uiBg: '#faf9f5',
    uiBorder: '#e3dfd3',
    uiText: '#1c1b18',
    uiMuted: '#6b6a64'
  },
  dark: {
    name: 'dark',
    paper: '#101b27',
    grid: '#192634',
    gridMajor: '#243447',
    wall: '#e6e2d8',
    wallFill: '#465569',
    wallSel: '#8fb3da',
    wallFillSel: '#22405f',
    accent: '#8fb3da',
    accentText: '#b9cfe8',
    accentFaint: 'rgba(143,179,218,0.26)',
    symbol: '#b4bcc6',
    symbolStroke: '#e2e8f0',
    symbolFill: '#1e293b',
    muted: '#939cab',
    roomText: '#b0b7c1',
    dimension: '#8fb3da',
    doorSwing: '#60a5fa',
    windowGlass: '#3b82f6',
    uiBg: '#0b131c',
    uiBorder: '#1e2d3d',
    uiText: '#f1f5f9',
    uiMuted: '#94a3b8'
  }
};
