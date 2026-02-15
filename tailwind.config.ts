import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#BF0413',
        'primary-foreground': '#ffffff',
        secondary: '#1C58A6',
        'secondary-foreground': '#ffffff',
        accent: '#F2B705',
        muted: '#f3f4f6',
        'muted-foreground': '#6b7280',
        background: '#ffffff',
        foreground: '#171717',
        border: '#e5e7eb',
        input: '#ffffff',
        destructive: '#dc2626',
        'destructive-foreground': '#ffffff',
      },
    },
  },
  plugins: [],
}

export default config
