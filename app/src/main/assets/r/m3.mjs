
export function locateFrame(sequence, elapsed, loop) {
  const total = sequence.reduce((sum, frame) => sum + frame.duration, 0);
  if (!total) throw new Error('Empty motion');
  const time = loop ? ((elapsed % total) + total) % total : Math.min(Math.max(elapsed, 0), total);
  let start = 0;
  for (let index = 0; index < sequence.length; index++) {
    const end = start + sequence[index].duration;
    if (time < end || index === sequence.length - 1) {
      return {index, local: time - start, start, total, time, ended: !loop && elapsed >= total};
    }
    start = end;
  }
}

export function wallPresentation(mode, direction, baseFacing='left') {
  const side = mode === 'wall-left' ? 'left' : mode === 'wall-right' ? 'right' : null;
  
  
  
  if (side) return {mirror: side === 'right', side, exitSign: side === 'left' ? 1 : -1};
  return {mirror: direction !== baseFacing, side: mode === 'wall-top' ? 'top' : mode === 'wall-bottom' ? 'bottom' : null, exitSign: 0};
}
