export interface ThemePreview {
  bg: string
  deeper: string
  surface: string
  border: string
  accent: string
  text: string
}

export interface Theme {
  id: string
  name: string
  mode: 'dark' | 'light'
  description: string
  preview: ThemePreview
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    description: 'Cool blue-gray with coral',
    preview: {
      bg: '#1f1f26',
      deeper: '#1a1a20',
      surface: '#2c2c35',
      border: '#3d3d48',
      accent: '#d97040',
      text: '#f0f0f2',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    mode: 'dark',
    description: 'Deep navy with teal',
    preview: {
      bg: '#182028',
      deeper: '#141a22',
      surface: '#243038',
      border: '#344050',
      accent: '#40b0a8',
      text: '#e8eef4',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    description: 'Dark green-gray with gold',
    preview: {
      bg: '#1c221e',
      deeper: '#181e1a',
      surface: '#283028',
      border: '#384838',
      accent: '#b0a830',
      text: '#eaeeea',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    mode: 'dark',
    description: 'Warm charcoal with amber',
    preview: {
      bg: '#241f1a',
      deeper: '#201b16',
      surface: '#322a22',
      border: '#4a3e34',
      accent: '#d4a030',
      text: '#f2ece4',
    },
  },
  {
    id: 'orchid',
    name: 'Orchid',
    mode: 'dark',
    description: 'Purple-gray with rose',
    preview: {
      bg: '#221e28',
      deeper: '#1e1a22',
      surface: '#2e2a36',
      border: '#403a4c',
      accent: '#d05888',
      text: '#ece8f2',
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    mode: 'light',
    description: 'Clean white with blue',
    preview: {
      bg: '#f4f4f8',
      deeper: '#ecedf2',
      surface: '#fcfcfe',
      border: '#d6d6e0',
      accent: '#3868cc',
      text: '#1a1a24',
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    mode: 'light',
    description: 'Warm cream with terracotta',
    preview: {
      bg: '#f2efe8',
      deeper: '#e8e4dc',
      surface: '#faf8f4',
      border: '#d4cec4',
      accent: '#a05530',
      text: '#2a2420',
    },
  },
]

export const DEFAULT_THEME = 'midnight'
export const THEME_STORAGE_KEY = 'preroll-theme'
