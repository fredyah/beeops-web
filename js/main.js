const CONTACT_EMAIL = "julia@beeops.com.tw";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initTabs() {
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  if (!tabs.length) return;

  function select(id) {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === id;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.toggleAttribute("hidden", panel.dataset.panel !== id);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab.dataset.tab));
  });

  const list = document.querySelector(".tablist");
  list?.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else return;
    event.preventDefault();
    tabs[next].focus();
    select(tabs[next].dataset.tab);
  });

  select("linux");
}

function initMenu() {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) return;

  function close() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "開啟選單");
    document.body.classList.remove("menu-open");
  }

  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
    document.body.classList.toggle("menu-open", open);
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function initReveal() {
  const nodes = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  nodes.forEach((node) => observer.observe(node));
}

function initTerminal() {
  const term = document.querySelector("#term");
  if (!term || reduced) return;
  const full = term.textContent.trim();
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      term.textContent = "";
      let index = 0;
      const step = () => {
        index += 1;
        term.textContent = full.slice(0, index);
        if (index < full.length) {
          window.setTimeout(step, full[index - 1] === "\n" ? 90 : 12);
        }
      };
      step();
    },
    { threshold: 0.4 }
  );
  observer.observe(term);
}

function initCards() {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

function initCursor() {
  if (!finePointer || reduced) return;
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring) return;
  document.documentElement.classList.add("has-cursor");
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rx = x;
  let ry = y;

  window.addEventListener("pointermove", (event) => {
    x = event.clientX;
    y = event.clientY;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const target = event.target.closest("a, button, .card, .tab, input, textarea, select");
    document.body.classList.toggle("cursor-hot", Boolean(target && !target.matches("input, textarea, select")));
    document.body.classList.toggle("cursor-text", Boolean(target && target.matches("input, textarea, select")));
  });

  const loop = () => {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
}

function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * 0.16}px, ${dy * 0.22}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

function initSound() {
  const button = document.querySelector("#sound");
  if (!button) return;
  let ctx;
  let master;

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);
    [92, 138, 184, 276].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 3 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = index * 3.5;
      const gain = ctx.createGain();
      gain.gain.value = index === 3 ? 0.08 : 0.22;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
  }

  button.addEventListener("click", async () => {
    const on = button.getAttribute("aria-pressed") === "true";
    if (!ctx) build();
    if (on) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "開啟環境音");
      window.setTimeout(() => ctx.suspend(), 280);
      return;
    }
    await ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.45);
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", "關閉環境音");
  });
}

function initForm() {
  const form = document.querySelector("#inquiry");
  const status = document.querySelector("#form-status");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const topic = String(data.get("topic") || "").trim();
    const message = String(data.get("message") || "").trim();
    const body = [`姓名：${name}`, `信箱：${email}`, `主題：${topic}`, "", message].join("\n");
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`BeeOps 洽詢｜${topic}`)}&body=${encodeURIComponent(body)}`;
    status.textContent = `已開啟郵件程式，收件人是 ${CONTACT_EMAIL}。若沒有跳出，請直接寫信到這個地址。`;
    window.location.href = href;
  });
}

function initScrollSpy() {
  const links = [...document.querySelectorAll(".nav-links a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const on = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-current", on);
        });
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((section) => observer.observe(section));
}

function animateCounter() {
  const node = document.querySelector(".boot-count");
  let value = 0;
  let timer = 0;
  if (node) {
    timer = window.setInterval(() => {
      value = Math.min(100, value + Math.random() * 6 + 1.5);
      node.textContent = String(Math.floor(value)).padStart(2, "0");
      if (value >= 100) window.clearInterval(timer);
    }, 36);
  }
  return {
    finish() {
      window.clearInterval(timer);
      if (node) node.textContent = "100";
    },
  };
}

async function bootHive() {
  const canvas = document.querySelector("#hive");
  try {
    const mod = await Promise.race([
      import("./hive.js").catch(() => null),
      delay(7000).then(() => null),
    ]);
    if (!mod || !canvas) {
      document.body.classList.add("no-webgl");
      return null;
    }
    const hive = mod.createHive(canvas);
    document.body.classList.add("has-webgl");
    return hive;
  } catch (error) {
    console.warn(error);
    document.body.classList.add("no-webgl");
    return null;
  }
}

function bindHive(hive) {
  const canvas = document.querySelector("#hive");
  const bar = document.querySelector(".progress > span");
  if (!hive) return;

  const onScroll = () => {
    const heroSpan = Math.max(1, window.innerHeight * 0.92);
    const fade = Math.max(0, 1 - window.scrollY / heroSpan);
    if (canvas) canvas.style.opacity = String(fade);
    hive.setScroll(Math.min(1, window.scrollY / heroSpan));
    hive.setActive(fade > 0.04);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", (event) => {
    hive.setPointer(event.clientX, event.clientY);
  });
  onScroll();
}

function initFilm() {
  const film = document.querySelector(".hero-film");
  if (!film) return;

  film.muted = true;
  film.playsInline = true;

  if (reduced) {
    film.removeAttribute("autoplay");
    film.pause();
    film.controls = true;
    return;
  }

  const play = () => {
    if (!film.paused) return;
    film.play().then(() => {
      film.controls = false;
    }).catch(() => {
      film.controls = true;
    });
  };

  play();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) play();
    }, { threshold: 0.2 });
    observer.observe(film);
  }

  window.addEventListener("pointerdown", play, { once: true });
}

function bindProgressWithoutHive() {
  const bar = document.querySelector(".progress > span");
  if (!bar) return;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

async function main() {
  initFilm();
  initTabs();
  initMenu();
  initForm();
  initCursor();
  initReveal();
  initTerminal();
  initCards();
  initMagnetic();
  initSound();
  initScrollSpy();

  const counter = animateCounter();
  const started = performance.now();
  const hivePromise = bootHive();
  const hive = await hivePromise;
  const elapsed = performance.now() - started;
  if (elapsed < 1200) await delay(1200 - elapsed);
  counter.finish();
  await delay(160);

  document.body.classList.remove("is-booting");
  document.querySelector(".boot")?.classList.add("is-done");
  if (hive) bindHive(hive);
  else bindProgressWithoutHive();
}

main();
