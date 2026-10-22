// Định nghĩa bảng màu Design System NKDD Report
export const colors = {
  // Nền
  bg: {
    app: '#EDEEF5', // nền toàn app, xám-lavender rất nhạt
    card: '#FFFFFF', // card, panel
    subtle: '#F6F7FB', // header bảng, group row
    hover: '#F0F1F9', // row hover
    sidebar: '#FFFFFF'
  },

  // Brand (tím chủ đạo)
  primary: {
    50: '#F2F2FD',
    100: '#E8E8FB',
    200: '#D1D2F7',
    300: '#A9A9EE',
    400: '#8785E6',
    500: '#6B63DE', // main — button, link, active
    600: '#534CC9',
    700: '#403AA6',
    800: '#2E2A7A',
    900: '#1F1D55'
  },

  // Text
  text: {
    primary: '#1F2050', // tiêu đề, số chính
    secondary: '#5A5B7C', // mô tả
    muted: '#8A8BA0', // placeholder, label phụ
    inverse: '#FFFFFF'
  },

  // Border
  border: {
    base: '#E8E8F2',
    strong: '#D4D5E4',
    focus: '#6B63DE'
  },

  // Semantic
  success: { bg: '#E6F9EE', fg: '#1E9E52', solid: '#34C759' },
  danger: { bg: '#FDECEC', fg: '#C53030', solid: '#F04444' },
  warning: { bg: '#FFF6E0', fg: '#B7791F', solid: '#FFB020' },
  info: { bg: '#E6F4FD', fg: '#1D6FB8', solid: '#3EA9F5' },

  // Accent (KPI card backgrounds — lấy từ design gốc)
  accent: {
    purple: { bg: '#EDECFB', fg: '#6B63DE' },
    blue: { bg: '#E1F0FB', fg: '#3EA9F5' },
    yellow: { bg: '#FFF3DA', fg: '#F0A93B' },
    pink: { bg: '#FCE7EC', fg: '#E56B8A' }
  }
}
