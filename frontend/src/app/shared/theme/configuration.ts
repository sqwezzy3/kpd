import { THEME_PRESET } from './preset';
import type { OptimusConfigType } from '@openng/optimus-ui/config';

export const THEME_CONFIGURATION: OptimusConfigType = {
  ripple: true,
  inputVariant: 'filled',
  theme: {
    preset: THEME_PRESET,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
  zIndex: {
    modal: 1100,
    overlay: 1000,
    menu: 1000,
    tooltip: 1100,
  },
};
