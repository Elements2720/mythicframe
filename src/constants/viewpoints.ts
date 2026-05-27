
import { Viewpoint } from "../types";

export const VIEWPOINTS: { id: Viewpoint; name: string; icon: string; description: string }[] = [
  { id: 'none', name: 'Default', icon: 'fa-camera', description: 'Standard eye-level perspective.' },
  { id: 'front', name: 'Front View', icon: 'fa-user', description: 'Subject facing the camera directly.' },
  { id: 'back', name: 'Back View', icon: 'fa-user-slash', description: 'Subject facing away from the camera.' },
  { id: 'side', name: 'Side Profile', icon: 'fa-user-group', description: 'Subject seen from the side.' },
  { id: 'three-quarter', name: '3/4 View', icon: 'fa-user-tie', description: 'Classic three-quarter portrait angle.' },
  { id: 'top-down', name: 'Top Down', icon: 'fa-arrow-down', description: 'Bird\'s eye view from directly above.' },
  { id: 'high-angle', name: 'High Angle', icon: 'fa-chevron-down', description: 'Looking down at the subject from an angle.' },
  { id: 'low-angle', name: 'Low Angle', icon: 'fa-chevron-up', description: 'Looking up at the subject from below.' },
  { id: 'isometric', name: 'Isometric', icon: 'fa-cube', description: '3/4 perspective with no vanishing point.' },
  { id: 'cinematic', name: 'Cinematic', icon: 'fa-clapperboard', description: 'Dramatic, wide-angle cinematic framing.' },
];
