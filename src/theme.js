export const theme = {
  colors: {
    background: '#0A0A0B',
    panel: '#141416',
    panelBorder: 'rgba(255,255,255,0.08)',
    accentPrimary: '#8B5CF6', 
    accentSecondary: '#22D3EE', 
    textMuted: '#9CA3AF',
    botBubble: '#1E1E20',
    brandPurple: '#5d3fd3',
    accentPink: '#EC4899',
    accentGreen: '#10B981'
  },
  animations: {
    // Elastic genie effect spring
    genieSpring: {
      type: "spring",
      damping: 15,
      stiffness: 150,
      mass: 1,
      ease: [0.16, 1, 0.3, 1]
    },
    // Smooth fast transition for micro-interactions
    micro: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};
