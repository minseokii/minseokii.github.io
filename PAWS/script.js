const copyButton = document.getElementById("copyBibtex");
const bibtex = document.getElementById("bibtex");

if (copyButton && bibtex) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bibtex.textContent.trim());
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1800);
    } catch {
      copyButton.textContent = "Select text";
    }
  });
}

const demoRoot = "./demo_new/";
const demoVideoPicker = document.getElementById("demoVideos");
const demoMethodPicker = document.getElementById("demoMethods");
const demoVideo = document.getElementById("demoSourceVideo");
const demoPlay = document.getElementById("demoPlay");
const demoSeek = document.getElementById("demoSeek");
const demoCurrentTime = document.getElementById("demoCurrentTime");
const demoDuration = document.getElementById("demoDuration");
const demoStatus = document.getElementById("demoStatus");
const demoPanels = document.getElementById("demoPanels");

const demoMethods = [
  { id: "gt", label: "GT", detail: "All annotations" },
  { id: "sttran", label: "Fully Supervised", detail: "STTran" },
  { id: "pla", label: "Weakly Supervised", detail: "PLA" },
  { id: "paws_without_pa", label: "Ours w/o PA", detail: "Without pair affinity" },
  { id: "paws_with_pa", label: "Ours w/ PA", detail: "Pair-affinity ranking" },
];

const demoPalette = ["#f5b82e", "#46b96b", "#e76b75"];
const demoState = {
  manifest: null,
  video: null,
  selectedMethods: new Set(demoMethods.map((method) => method.id)),
  results: new Map(),
  panels: new Map(),
  renderScheduled: false,
};

function formatDemoTime(value) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = (safe % 60).toFixed(2).padStart(5, "0");
  return `${minutes}:${seconds}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampBox(box, width, height) {
  return [
    clamp(box[0], 0, width),
    clamp(box[1], 0, height),
    clamp(box[2], 0, width),
    clamp(box[3], 0, height),
  ];
}

function findDemoFrame(frames, time) {
  let low = 0;
  let high = frames.length - 1;
  let match = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].time <= time + 0.0001) {
      match = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return frames[match];
}

function drawBox(ctx, box, color, label, width, height) {
  const [x1, y1, x2, y2] = clampBox(box, width, height);
  const boxWidth = Math.max(0, x2 - x1);
  const boxHeight = Math.max(0, y2 - y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, width / 240);
  ctx.strokeRect(x1, y1, boxWidth, boxHeight);

  ctx.font = `700 ${Math.max(11, width / 38)}px DM Sans, sans-serif`;
  const padding = 4;
  const textWidth = ctx.measureText(label).width;
  const labelHeight = Math.max(17, width / 26);
  const labelY = Math.max(0, y1 - labelHeight);
  ctx.fillStyle = color;
  ctx.fillRect(x1, labelY, textWidth + padding * 2, labelHeight);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x1 + padding, labelY + labelHeight / 2);
}

function drawArrow(ctx, subjectBox, objectBox, color, number, width, height) {
  const subject = clampBox(subjectBox, width, height);
  const object = clampBox(objectBox, width, height);
  const startX = (subject[0] + subject[2]) / 2;
  const startY = (subject[1] + subject[3]) / 2;
  const endX = (object[0] + object[2]) / 2;
  const endY = (object[1] + object[3]) / 2;
  const angle = Math.atan2(endY - startY, endX - startX);
  const head = Math.max(8, width / 42);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, width / 180);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  const numberX = clamp((startX + endX) / 2, 14, width - 14);
  const numberY = clamp((startY + endY) / 2, 14, height - 14);
  const radius = Math.max(10, width / 34);
  ctx.beginPath();
  ctx.arc(numberX, numberY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.max(11, width / 34)}px DM Sans, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), numberX, numberY + 0.5);
  ctx.textAlign = "left";
}

function renderDemoPanel(methodId, time) {
  const panel = demoState.panels.get(methodId);
  const result = demoState.results.get(`${demoState.video.id}:${methodId}`);
  if (!panel || !result || !demoVideo.videoWidth) return;

  const width = demoState.video.source_width;
  const height = demoState.video.source_height;
  if (panel.canvas.width !== width || panel.canvas.height !== height) {
    panel.canvas.width = width;
    panel.canvas.height = height;
  }

  const ctx = panel.canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(demoVideo, 0, 0, width, height);
  const frame = findDemoFrame(result.frames, time);
  const legendItems = [];

  frame.relations.forEach((relation, index) => {
    const color = demoPalette[index % demoPalette.length];
    drawBox(ctx, relation.subject.box, "#4e9fee", relation.subject.class, width, height);
    drawBox(ctx, relation.object.box, color, relation.object.class, width, height);
    drawArrow(ctx, relation.subject.box, relation.object.box, color, relation.number, width, height);
    legendItems.push(`${relation.subject.class} → ${relation.object.class}: ${relation.predicates.join(", ")}`);
  });

  panel.legend.replaceChildren();
  if (legendItems.length) {
    legendItems.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      panel.legend.appendChild(item);
    });
  } else {
    const empty = document.createElement("div");
    empty.className = "demo-empty";
    empty.textContent = "No relations at this timestamp.";
    panel.legend.appendChild(empty);
  }
  panel.frameLabel.textContent = `${frame.time.toFixed(2)}s · frame ${frame.source_frame}`;
}

function renderDemoFrame() {
  if (!demoState.video || demoVideo.readyState < 2) return;
  const time = demoVideo.currentTime;
  demoSeek.value = String(time);
  demoCurrentTime.textContent = formatDemoTime(time);
  demoState.selectedMethods.forEach((methodId) => renderDemoPanel(methodId, time));
}

function scheduleDemoRender() {
  if (demoState.renderScheduled) return;
  demoState.renderScheduled = true;
  const callback = () => {
    demoState.renderScheduled = false;
    renderDemoFrame();
    if (!demoVideo.paused && !demoVideo.ended) scheduleDemoRender();
  };

  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
    demoVideo.requestVideoFrameCallback(callback);
  } else {
    requestAnimationFrame(callback);
  }
}

function buildDemoPanels() {
  demoPanels.replaceChildren();
  demoState.panels.clear();

  demoMethods
    .filter((method) => demoState.selectedMethods.has(method.id))
    .forEach((method) => {
      const panel = document.createElement("article");
      panel.className = "demo-panel";
      panel.innerHTML = `
        <header class="demo-panel-heading">
          <h3>${method.label}</h3>
          <span>${method.detail}</span>
        </header>
        <div class="demo-panel-body">
          <div class="demo-canvas-wrap"><canvas class="demo-canvas"></canvas></div>
          <ol class="demo-legend"></ol>
        </div>`;
      const frameLabel = document.createElement("span");
      frameLabel.textContent = "Waiting for frame";
      panel.querySelector(".demo-panel-heading").appendChild(frameLabel);
      demoPanels.appendChild(panel);
      demoState.panels.set(method.id, {
        canvas: panel.querySelector("canvas"),
        legend: panel.querySelector(".demo-legend"),
        frameLabel,
      });
    });

  if (!demoState.selectedMethods.size) {
    demoPanels.innerHTML = '<div class="demo-empty">Select at least one method to display a panel.</div>';
  }
}

async function loadDemoResults() {
  const jobs = [...demoState.selectedMethods].map(async (methodId) => {
    const key = `${demoState.video.id}:${methodId}`;
    if (demoState.results.has(key)) return;
    const path = demoState.video.results[methodId];
    const response = await fetch(`${demoRoot}${path}`);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    demoState.results.set(key, await response.json());
  });
  await Promise.all(jobs);
}

async function selectDemoVideo(videoId) {
  const selected = demoState.manifest.videos.find((video) => video.id === videoId);
  if (!selected) return;
  demoVideo.pause();
  demoPlay.textContent = "Play";
  demoState.video = selected;
  demoStatus.textContent = `Loading ${selected.id}…`;
  demoVideoPicker.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.video === selected.id));
  });
  demoVideo.src = `${demoRoot}${selected.file}`;
  demoVideo.load();
  await loadDemoResults();
  await new Promise((resolve) => demoVideo.addEventListener("loadeddata", resolve, { once: true }));
  demoSeek.max = String(demoVideo.duration || selected.duration);
  demoDuration.textContent = formatDemoTime(demoVideo.duration || selected.duration);
  demoVideo.currentTime = 0;
  demoStatus.textContent = "";
  renderDemoFrame();
}

async function initializeInteractiveDemo() {
  if (!demoVideoPicker || !demoVideo) return;
  try {
    const response = await fetch(`${demoRoot}manifest.json`);
    if (!response.ok) throw new Error("Unable to load the demo manifest.");
    demoState.manifest = await response.json();

    demoState.manifest.videos.forEach((video, index) => {
      const button = document.createElement("button");
      button.className = "demo-chip";
      button.type = "button";
      button.dataset.video = video.id;
      button.setAttribute("aria-pressed", "false");
      button.textContent = `Video ${index + 1}`;
      button.setAttribute("aria-label", `Select demo video ${index + 1}`);
      button.addEventListener("click", () => selectDemoVideo(video.id));
      demoVideoPicker.appendChild(button);
    });

    demoMethods.forEach((method) => {
      const button = document.createElement("button");
      button.className = "demo-chip demo-method-chip";
      button.type = "button";
      button.dataset.method = method.id;
      button.setAttribute("aria-pressed", "true");
      button.textContent = method.label;
      button.addEventListener("click", async () => {
        if (demoState.selectedMethods.has(method.id)) demoState.selectedMethods.delete(method.id);
        else demoState.selectedMethods.add(method.id);
        button.setAttribute("aria-pressed", String(demoState.selectedMethods.has(method.id)));
        buildDemoPanels();
        demoStatus.textContent = "Loading selected comparisons…";
        await loadDemoResults();
        demoStatus.textContent = "";
        renderDemoFrame();
      });
      demoMethodPicker.appendChild(button);
    });

    buildDemoPanels();
    await selectDemoVideo(demoState.manifest.videos[0].id);
  } catch (error) {
    demoStatus.textContent = `Interactive demo could not be loaded: ${error.message}`;
  }
}

if (demoPlay && demoSeek) {
  demoPlay.addEventListener("click", async () => {
    if (demoVideo.paused) {
      if (demoVideo.ended || demoVideo.currentTime >= demoVideo.duration - 0.05) demoVideo.currentTime = 0;
      await demoVideo.play();
      demoPlay.textContent = "Pause";
      scheduleDemoRender();
    } else {
      demoVideo.pause();
      demoPlay.textContent = "Play";
      renderDemoFrame();
    }
  });

  demoSeek.addEventListener("input", () => {
    demoVideo.currentTime = Number(demoSeek.value);
    renderDemoFrame();
  });

  demoVideo.addEventListener("seeked", renderDemoFrame);
  demoVideo.addEventListener("ended", () => {
    demoPlay.textContent = "Play";
    renderDemoFrame();
  });
}

initializeInteractiveDemo();
