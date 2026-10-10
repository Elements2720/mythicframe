import { PoseJoint } from '../types';

/**
 * Biomechanical Pose Constraints & Motional Range Solver
 * Ensures character joints move smoothly within logical human anatomical limits:
 * - Fixed/flexible bone length clamping (prevents infinite stretching or collapse)
 * - Natural joint angles (prevents hyperextension of knees and elbows)
 * - Canvas boundary limits (prevents joints from flying into negative/off-screen space)
 * - 2-Bone Analytical IK reach for distal extremities (wrists, ankles)
 */

interface BoneDefinition {
  jointId: string;
  parentId: string;
  baseLength: number;
  minLength: number;
  maxLength: number;
}

// Proportional bone length limits based on DEFAULT_POSE_DATA (normalized 0-100 canvas coords)
const BONE_DEFINITIONS: Record<string, BoneDefinition> = {
  neck: { jointId: 'neck', parentId: 'head', baseLength: 7, minLength: 4, maxLength: 12 },
  shoulder_l: { jointId: 'shoulder_l', parentId: 'neck', baseLength: 10.4, minLength: 6, maxLength: 15 },
  shoulder_r: { jointId: 'shoulder_r', parentId: 'neck', baseLength: 10.4, minLength: 6, maxLength: 15 },
  elbow_l: { jointId: 'elbow_l', parentId: 'shoulder_l', baseLength: 15.8, minLength: 9, maxLength: 22 },
  elbow_r: { jointId: 'elbow_r', parentId: 'shoulder_r', baseLength: 15.8, minLength: 9, maxLength: 22 },
  wrist_l: { jointId: 'wrist_l', parentId: 'elbow_l', baseLength: 15.8, minLength: 8, maxLength: 22 },
  wrist_r: { jointId: 'wrist_r', parentId: 'elbow_r', baseLength: 15.8, minLength: 8, maxLength: 22 },
  spine: { jointId: 'spine', parentId: 'neck', baseLength: 18, minLength: 10, maxLength: 25 },
  hip_l: { jointId: 'hip_l', parentId: 'spine', baseLength: 15.8, minLength: 8, maxLength: 22 },
  hip_r: { jointId: 'hip_r', parentId: 'spine', baseLength: 15.8, minLength: 8, maxLength: 22 },
  knee_l: { jointId: 'knee_l', parentId: 'hip_l', baseLength: 20.1, minLength: 11, maxLength: 27 },
  knee_r: { jointId: 'knee_r', parentId: 'hip_r', baseLength: 20.1, minLength: 11, maxLength: 27 },
  ankle_l: { jointId: 'ankle_l', parentId: 'knee_l', baseLength: 15.3, minLength: 8, maxLength: 22 },
  ankle_r: { jointId: 'ankle_r', parentId: 'knee_r', baseLength: 15.3, minLength: 8, maxLength: 22 },
};

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

const dist = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Clamps coordinates to stay safely inside visible canvas [3%, 97%]
 */
export const clampToCanvas = (val: number): number => clamp(val, 3, 97);

/**
 * 2-Bone Analytical IK solver
 * Given root joint (Shoulder/Hip), mid joint (Elbow/Knee), end target (Wrist/Ankle)
 * Calculates biologically plausible mid-joint position without hyperextension.
 */
function solveTwoBoneIK(
  root: { x: number; y: number },
  mid: { x: number; y: number },
  target: { x: number; y: number },
  l1: number,
  l2: number,
  isLeft: boolean,
  isLeg: boolean
): { mid: { x: number; y: number }; end: { x: number; y: number } } {
  const maxReach = (l1 + l2) * 0.98;
  const minReach = Math.abs(l1 - l2) * 1.1;

  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let d = Math.sqrt(dx * dx + dy * dy);

  // Prevent division by zero
  if (d < 0.001) {
    dy = 0.001;
    d = 0.001;
  }

  // Clamp target reach within maximum and minimum reachable distance
  let endX = target.x;
  let endY = target.y;

  if (d > maxReach) {
    const scale = maxReach / d;
    endX = root.x + dx * scale;
    endY = root.y + dy * scale;
    d = maxReach;
  } else if (d < minReach) {
    const scale = minReach / d;
    endX = root.x + dx * scale;
    endY = root.y + dy * scale;
    d = minReach;
  }

  // Law of Cosines to calculate internal angles
  // a = l2, b = l1, c = d
  const cosAlpha = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const alpha = Math.acos(cosAlpha);

  // Base angle from root to target
  const baseAngle = Math.atan2(endY - root.y, endX - root.x);

  // Direction of bend:
  // - Arms naturally bend outward/away from torso (or match previous bend)
  // - Legs: knees naturally bend backwards/forwards in flexion
  let bendSign = isLeft ? -1 : 1;
  if (isLeg) {
    // Legs: knee points forward/downward in natural stance
    bendSign = isLeft ? 1 : -1;
  }

  const elbowAngle = baseAngle + bendSign * alpha;
  const midX = clampToCanvas(root.x + Math.cos(elbowAngle) * l1);
  const midY = clampToCanvas(root.y + Math.sin(elbowAngle) * l1);

  return {
    mid: { x: midX, y: midY },
    end: { x: clampToCanvas(endX), y: clampToCanvas(endY) }
  };
}

/**
 * Apply constraints when moving an active joint
 */
export function applyPoseConstraints(
  currentJoints: PoseJoint[],
  activeJointId: string,
  targetX: number,
  targetY: number
): PoseJoint[] {
  const jointMap = new Map<string, PoseJoint>(currentJoints.map(j => [j.id, { ...j }]));
  const active = jointMap.get(activeJointId);
  if (!active) return currentJoints;

  const boundedTargetX = clampToCanvas(targetX);
  const boundedTargetY = clampToCanvas(targetY);

  // Handle Extremities with 2-bone IK: Wrists & Ankles
  if (activeJointId === 'wrist_l' || activeJointId === 'wrist_r') {
    const isLeft = activeJointId === 'wrist_l';
    const shoulderId = isLeft ? 'shoulder_l' : 'shoulder_r';
    const elbowId = isLeft ? 'elbow_l' : 'elbow_r';

    const shoulder = jointMap.get(shoulderId);
    const elbow = jointMap.get(elbowId);

    if (shoulder && elbow) {
      const ik = solveTwoBoneIK(
        shoulder,
        elbow,
        { x: boundedTargetX, y: boundedTargetY },
        15.8, // upper arm
        15.8, // forearm
        isLeft,
        false
      );

      elbow.x = ik.mid.x;
      elbow.y = ik.mid.y;
      active.x = ik.end.x;
      active.y = ik.end.y;
      return Array.from(jointMap.values());
    }
  }

  if (activeJointId === 'ankle_l' || activeJointId === 'ankle_r') {
    const isLeft = activeJointId === 'ankle_l';
    const hipId = isLeft ? 'hip_l' : 'hip_r';
    const kneeId = isLeft ? 'knee_l' : 'knee_r';

    const hip = jointMap.get(hipId);
    const knee = jointMap.get(kneeId);

    if (hip && knee) {
      const ik = solveTwoBoneIK(
        hip,
        knee,
        { x: boundedTargetX, y: boundedTargetY },
        20.1, // thigh
        15.3, // shin
        isLeft,
        true
      );

      knee.x = ik.mid.x;
      knee.y = ik.mid.y;
      active.x = ik.end.x;
      active.y = ik.end.y;
      return Array.from(jointMap.values());
    }
  }

  // Handle Mid-Joints: Elbows & Knees (orbit root and carry child extremity)
  if (activeJointId === 'elbow_l' || activeJointId === 'elbow_r') {
    const isLeft = activeJointId === 'elbow_l';
    const shoulder = jointMap.get(isLeft ? 'shoulder_l' : 'shoulder_r');
    const wrist = jointMap.get(isLeft ? 'wrist_l' : 'wrist_r');

    if (shoulder && wrist) {
      // Clamp distance to shoulder
      const maxL = 20;
      const minL = 9;
      let d = dist(shoulder.x, shoulder.y, boundedTargetX, boundedTargetY);
      d = clamp(d, minL, maxL);

      const angle = Math.atan2(boundedTargetY - shoulder.y, boundedTargetX - shoulder.x);
      const newElbowX = clampToCanvas(shoulder.x + Math.cos(angle) * d);
      const newElbowY = clampToCanvas(shoulder.y + Math.sin(angle) * d);

      const dx = newElbowX - active.x;
      const dy = newElbowY - active.y;

      active.x = newElbowX;
      active.y = newElbowY;

      // Carry wrist smoothly
      wrist.x = clampToCanvas(wrist.x + dx);
      wrist.y = clampToCanvas(wrist.y + dy);
      return Array.from(jointMap.values());
    }
  }

  if (activeJointId === 'knee_l' || activeJointId === 'knee_r') {
    const isLeft = activeJointId === 'knee_l';
    const hip = jointMap.get(isLeft ? 'hip_l' : 'hip_r');
    const ankle = jointMap.get(isLeft ? 'ankle_l' : 'ankle_r');

    if (hip && ankle) {
      const maxL = 25;
      const minL = 11;
      let d = dist(hip.x, hip.y, boundedTargetX, boundedTargetY);
      d = clamp(d, minL, maxL);

      const angle = Math.atan2(boundedTargetY - hip.y, boundedTargetX - hip.x);
      const newKneeX = clampToCanvas(hip.x + Math.cos(angle) * d);
      const newKneeY = clampToCanvas(hip.y + Math.sin(angle) * d);

      const dx = newKneeX - active.x;
      const dy = newKneeY - active.y;

      active.x = newKneeX;
      active.y = newKneeY;

      // Carry ankle smoothly
      ankle.x = clampToCanvas(ankle.x + dx);
      ankle.y = clampToCanvas(ankle.y + dy);
      return Array.from(jointMap.values());
    }
  }

  // Handle Direct Bone Distance Constraints for all other parent-child relationships
  const boneDef = BONE_DEFINITIONS[activeJointId];
  if (boneDef && boneDef.parentId) {
    const parent = jointMap.get(boneDef.parentId);
    if (parent) {
      let d = dist(parent.x, parent.y, boundedTargetX, boundedTargetY);
      d = clamp(d, boneDef.minLength, boneDef.maxLength);

      const angle = Math.atan2(boundedTargetY - parent.y, boundedTargetX - parent.x);
      active.x = clampToCanvas(parent.x + Math.cos(angle) * d);
      active.y = clampToCanvas(parent.y + Math.sin(angle) * d);
      return Array.from(jointMap.values());
    }
  }

  // Root or unconstrained joint (e.g. Head or Spine moving torso)
  const dx = boundedTargetX - active.x;
  const dy = boundedTargetY - active.y;
  active.x = boundedTargetX;
  active.y = boundedTargetY;

  // If moving the Head or Spine, move children slightly to preserve natural pose posture
  if (activeJointId === 'head') {
    const neck = jointMap.get('neck');
    if (neck) {
      neck.x = clampToCanvas(neck.x + dx * 0.8);
      neck.y = clampToCanvas(neck.y + dy * 0.8);
    }
  }

  return Array.from(jointMap.values());
}
