/**
 * Contrarian Market Intelligence - Dark trading terminal color scheme
 */

const tintColorLight = '#00C853';
const tintColorDark = '#00E676';

export const Colors = {
  light: {
    text: '#0D1117',
    background: '#F6F8FA',
    tint: tintColorLight,
    icon: '#586069',
    tabIconDefault: '#586069',
    tabIconSelected: tintColorLight,
    // Custom colors for market data
    bullish: '#00C853',
    bearish: '#FF1744',
    warning: '#FF9100',
    cardBg: '#FFFFFF',
    cardBorder: '#E1E4E8',
    muted: '#8B949E',
  },
  dark: {
    text: '#E6EDF3',
    background: '#0D1117',
    tint: tintColorDark,
    icon: '#8B949E',
    tabIconDefault: '#8B949E',
    tabIconSelected: tintColorDark,
    // Custom colors for market data
    bullish: '#00E676',
    bearish: '#FF5252',
    warning: '#FFB74D',
    cardBg: '#161B22',
    cardBorder: '#30363D',
    muted: '#8B949E',
  },
};
