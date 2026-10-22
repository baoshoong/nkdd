// Design tokens: bo góc, đổ bóng, chuyển động
export const tokens = {
  radius: {
    sm: '6px', // input nhỏ, badge
    md: '10px', // button, input
    lg: '14px', // card nhỏ
    xl: '20px', // card chính
    full: '9999px' // pill, avatar
  },
  shadow: {
    card: '0 4px 20px rgba(100, 100, 180, 0.06)',
    cardHover: '0 8px 28px rgba(100, 100, 180, 0.10)',
    pop: '0 12px 32px rgba(31, 32, 80, 0.12)',
    focus: '0 0 0 3px rgba(107, 99, 222, 0.20)'
  },
  motion: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
}
