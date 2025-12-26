
import { CardLayout } from "../types";

export const DEFAULT_CARD_LAYOUT: CardLayout = {
  art: { x: 5, y: 15, width: 90, height: 50, zIndex: 'behind' },
  name: { x: 10, y: 5, width: 80, fontSize: 24, color: '#ffffff', textAlign: 'center', fontFamily: 'serif' },
  type: { x: 10, y: 67, width: 80, fontSize: 16, color: '#dddddd', textAlign: 'center' },
  description: { x: 10, y: 72, width: 80, fontSize: 14, color: '#ffffff', textAlign: 'center', fontFamily: 'sans-serif' },
  mana: { x: 85, y: 5, width: 10, fontSize: 24, color: '#00ffff', textAlign: 'center' }
};
