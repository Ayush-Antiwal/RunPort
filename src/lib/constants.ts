import { FrameworkType } from '../../electron/types';

export const FRAMEWORK_OPTIONS: { value: FrameworkType; label: string }[] = [
  { value: 'angular', label: 'Angular' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'vite', label: 'React / Vite' },
  { value: 'react', label: 'React (CRA)' },
  { value: 'vue', label: 'Vue / Nuxt' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'nestjs', label: 'NestJS' },
  { value: 'express', label: 'Express / Node' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'generic', label: 'Generic / Other' },
];
