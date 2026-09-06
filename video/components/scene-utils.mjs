export function createScene({ className, title, time }) {
  const scene = element("main", `${className} scene`);
  scene.dataset.time = time.toFixed(3);
  scene.append(createBackdrop());

  const heading = element("header", "scene-title");
  heading.textContent = title;
  scene.append(heading);
  return scene;
}

export function createContentStage(className = "") {
  return element("section", `scene-content${className ? ` ${className}` : ""}`);
}

export function createSceneTimeline(context, sceneId, fallbackDuration) {
  const beats = context?.beats?.filter((beat) => beat.scene === sceneId) ?? [];
  if (beats.length === 0) {
    return {
      duration: fallbackDuration,
      beat: () => undefined,
      start: (_id, fallback = 0) => fallback,
      end: (_id, fallback = fallbackDuration) => fallback,
    };
  }
  const sceneStart = beats[0].start;
  const byId = new Map(beats.map((beat) => [beat.id, beat]));
  return {
    duration: beats.at(-1).end + beats.at(-1).pauseAfter - sceneStart,
    beat(id) {
      const beat = byId.get(id);
      if (!beat) return undefined;
      return {
        start: beat.start - sceneStart,
        end: beat.end - sceneStart,
        duration: beat.duration,
        pauseAfter: beat.pauseAfter,
      };
    },
    start(id, fallback = 0) {
      return this.beat(id)?.start ?? fallback;
    },
    end(id, fallback = fallbackDuration) {
      return this.beat(id)?.end ?? fallback;
    },
  };
}

export function createBackdrop() {
  const backdrop = element("div", "scene__backdrop");
  backdrop.innerHTML = '<div class="scene__grid"></div><div class="scene__glow"></div>';
  return backdrop;
}

export function element(tag, className, text) {
  const value = document.createElement(tag);
  value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

export function setStyle(target, styles) {
  Object.assign(target.style, styles);
  return target;
}

export function fade(time, start, end) {
  return clamp((time - start) / (end - start), 0, 1);
}

export function windowOpacity(time, enterStart, enterEnd, leaveStart, leaveEnd) {
  return fade(time, enterStart, enterEnd) * (1 - fade(time, leaveStart, leaveEnd));
}

export function ease(value) {
  return 1 - Math.pow(1 - value, 3);
}

export function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
}

export function createArrow(className = "concept-arrow") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 120 40");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<path d="M 5 20 H 105 M 92 7 L 107 20 L 92 33" />';
  return svg;
}

export function createBadge(text, modifier = "") {
  return element("div", `concept-badge${modifier ? ` concept-badge--${modifier}` : ""}`, text);
}
