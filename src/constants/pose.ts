
import { PoseData } from "../types";

export const DEFAULT_POSE_DATA: PoseData = {
  joints: [
    { id: 'head', name: 'Head', x: 50, y: 15 },
    { id: 'neck', name: 'Neck', x: 50, y: 22, parent: 'head' },
    { id: 'shoulder_l', name: 'L Shoulder', x: 40, y: 25, parent: 'neck' },
    { id: 'shoulder_r', name: 'R Shoulder', x: 60, y: 25, parent: 'neck' },
    { id: 'elbow_l', name: 'L Elbow', x: 35, y: 40, parent: 'shoulder_l' },
    { id: 'elbow_r', name: 'R Elbow', x: 65, y: 40, parent: 'shoulder_r' },
    { id: 'wrist_l', name: 'L Wrist', x: 30, y: 55, parent: 'elbow_l' },
    { id: 'wrist_r', name: 'R Wrist', x: 70, y: 55, parent: 'elbow_r' },
    { id: 'spine', name: 'Spine', x: 50, y: 40, parent: 'neck' },
    { id: 'hip_l', name: 'L Hip', x: 45, y: 55, parent: 'spine' },
    { id: 'hip_r', name: 'R Hip', x: 55, y: 55, parent: 'spine' },
    { id: 'knee_l', name: 'L Knee', x: 43, y: 75, parent: 'hip_l' },
    { id: 'knee_r', name: 'R Knee', x: 57, y: 75, parent: 'hip_r' },
    { id: 'ankle_l', name: 'L Ankle', x: 40, y: 90, parent: 'knee_l' },
    { id: 'ankle_r', name: 'R Ankle', x: 60, y: 90, parent: 'knee_r' }
  ],
  showSkeleton: true
};
