/* ═══════════════════════════════════════════════════════════════════════
   Player — a single rAF clock that drives the preview from the interpolator.
   play / pause / seek / loop. Emits `tick(t)` so the timeline playhead and
   scrubber stay in sync with playback.
   ═══════════════════════════════════════════════════════════════════════ */

export function createPlayer({ getScene, apply, onTick }) {
  let playing = false;
  let t = 0;
  let raf = 0;
  let last = 0;

  function duration() {
    const s = getScene();
    let max = s.settings.duration || 0;
    for (const trk of s.tracks) for (const k of trk.keyframes) if (k.time > max) max = k.time;
    return Math.max(max, 200);
  }

  function renderAt(time) {
    t = time;
    apply(time);
    onTick?.(time, playing);
  }

  function frame(now) {
    if (!playing) return;
    const dt = now - last;
    last = now;
    let nt = t + dt;
    const dur = duration();
    if (nt >= dur) {
      if (getScene().settings.loop) nt = nt % dur;
      else { nt = dur; playing = false; }
    }
    renderAt(nt);
    if (playing) raf = requestAnimationFrame(frame);
  }

  return {
    play() {
      if (playing) return;
      if (t >= duration() - 1) t = 0;
      playing = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
      onTick?.(t, true);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
      onTick?.(t, false);
    },
    toggle() { playing ? this.pause() : this.play(); },
    seek(time) {
      const dur = duration();
      renderAt(Math.max(0, Math.min(time, dur)));
    },
    refresh() { renderAt(Math.min(t, duration())); },
    isPlaying: () => playing,
    time: () => t,
    duration,
  };
}
