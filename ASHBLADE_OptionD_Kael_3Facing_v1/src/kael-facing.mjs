/**
 * ASHBLADE - Option D: visual orientation only.
 * Physics, movement, aim angles, projectiles and hitboxes stay 360 degrees.
 * The user-facing view is CENTER for vertical vectors, RIGHT/LEFT for horizontal.
 */
const SIDE_ENTER = 0.55;   // horizontal alignment required to leave center
const SIDE_EXIT = 0.34;    // hysteresis: return to center only on strong vertical travel

export function facingFromAngle(angle, previous = 'center') {
  if (!Number.isFinite(angle)) return 'center';
  const x = Math.cos(angle);
  const mag = Math.abs(x);
  const enter = previous === 'center' ? SIDE_ENTER : SIDE_EXIT;
  return mag < enter ? 'center' : (x >= 0 ? 'right' : 'left');
}

/**
 * Current attacking and skill actions follow the aim, movement follows velocity;
 * otherwise return to center after a short stop, not immediately when releasing WASD.
 * Intentional game animation states do not affect aim or damage direction.
 */
export function selectKaelFacing(player, moving, now) {
  const previous = player._kaelFacing || 'center';
  const attacking = ['attack', 'charge', 'chg', 'skill'].includes(player.state) || !!player.kaelCue;
  let angle = null;
  if (attacking) angle = player.state === 'attack' ? player.atkAng : player.aim;
  else if (player.state === 'dash') angle = Number.isFinite(player.moveAng) ? player.moveAng : player.aim;
  else if (moving) angle = Math.atan2(player.vy, player.vx);

  if (angle === null) {
    if (player._kaelLastMoveAt !== undefined && now - player._kaelLastMoveAt < 0.18) {
      return { direction: previous === 'center' ? 'center' : 'right', flip: previous === 'left', facing: previous };
    }
    player._kaelFacing = 'center';
    return { direction: 'center', flip: false, facing: 'center' };
  }

  // Don't carry a previous RIGHT state into the opposite LEFT, or vice versa.
  const candidate = facingFromAngle(angle, previous);
  player._kaelFacing = candidate;
  player._kaelLastMoveAt = now;
  return { direction: candidate === 'center' ? 'center' : 'right', flip: candidate === 'left', facing: candidate };
}
