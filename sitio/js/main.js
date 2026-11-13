/* =========================================================
   Yatay Piscinas (marca ficticia) — interacción
   Sin innerHTML, sin eval, sin datos guardados en el navegador.
   ========================================================= */
"use strict";

(() => {
  /* ---------- Configuración ---------- */
  /* [COMPLETAR] Número de demostración en formato 549XXXXXXXXXX.
     Vacío: WhatsApp se abre con el mensaje armado y la persona elige el contacto. */
  const WA_NUMERO = "";

  /* Precios de ejemplo (proyecto conceptual, marca ficticia).
     Mientras "ejemplo" sea true, la página muestra la etiqueta
     "Valores de ejemplo, a confirmar" y el precio NO se incluye
     en el mensaje de WhatsApp. Con los valores reales: ejemplo:false. */
  const PRECIOS = {
    ejemplo: true,
    m2Espejo: 650000,   // $ por m² de espejo de agua, a la profundidad de referencia
    profRef: 1.4,       // profundidad de referencia (m)
    ajuste10cm: 0.04,   // +/- 4 % por cada 10 cm de diferencia con la referencia
    margen: 0.1,        // el rango mostrado es ±10 %
    redondeo: 50000,
    extras: {
      escalones: { nombre: "escalones de obra", tipo: "fijo", valor: 450000 },
      playa:     { nombre: "playa húmeda", tipo: "fijo", valor: 700000 },
      luces:     { nombre: "luces LED", tipo: "fijo", valor: 350000 },
      cascada:   { nombre: "cascada", tipo: "fijo", valor: 600000 },
      venecitas: { nombre: "revestimiento de venecitas", tipo: "m2interior", valor: 45000 }
    }
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmtNum = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const fmtDec = (n, d) => n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const waUrl = (texto) => "https://wa.me/" + WA_NUMERO + "?text=" + encodeURIComponent(texto);
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const set = (el, attrs) => { Object.keys(attrs).forEach((k) => el.setAttribute(k, String(attrs[k]))); };

  /* ---------- Enlaces de WhatsApp con mensaje prellenado ---------- */
  $$("[data-wa]").forEach((a) => { a.href = waUrl(a.getAttribute("data-wa")); });

  /* ---------- Año del footer ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Header sólido al bajar ---------- */
  const header = $("[data-header]");
  const flotante = $("[data-flotante]");
  const hero = $(".hero");
  const cierre = $(".site-footer");
  const calcSec = $("#calculadora");
  let ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-solida", y > 30);
    if (flotante && hero) {
      const heroFin = hero.getBoundingClientRect().bottom;
      let enCalc = false;
      if (calcSec) {
        const rc = calcSec.getBoundingClientRect();
        enCalc = rc.top < window.innerHeight * 0.6 && rc.bottom > window.innerHeight * 0.4;
      }
      /* oculto en la calculadora, que ya tiene su propio botón de WhatsApp */
      flotante.classList.toggle("is-visible", heroFin < 0 && !enCalc);
      if (cierre) {
        const solape = window.innerHeight - cierre.getBoundingClientRect().top;
        flotante.style.setProperty("--sube", (solape > 0 ? -Math.round(solape) : 0) + "px");
      }
    }
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- Calculadora ---------- */
  const form = $("[data-calc]");
  if (form) {
    const S = 40;                 // px del dibujo por metro
    const BORDE = 0.4;            // coronamiento (m)
    const VB = { w: 600, h: 330 };
    const planta = $("[data-planta]");
    const corte = $("[data-corte]");
    const plano = $(".plano-planta");
    const grid = $(".calc-grid");
    const el = {
      largo: $("#largo", form), ancho: $("#ancho", form), prof: $("#prof", form),
      grilla: $("[data-grilla]"), borde: $("[data-borde]"), agua: $("[data-agua]"), reflejo: $("[data-reflejo]"),
      esc1: $("[data-escalon]"), esc2: $("[data-escalon2]"), playa: $("[data-playa]"),
      cascMuro: $("[data-cascada-muro]"), cascAgua: $("[data-cascada-agua]"), luces: $("[data-luces]"),
      cotaL: $("[data-cota-largo-linea]"), cotaLt: $("[data-cota-largo-txt]"),
      cotaA: $("[data-cota-ancho-linea]"), cotaAt: $("[data-cota-ancho-txt]"),
      hueco: $("[data-corte-hueco]"), aguaC: $("[data-corte-agua]"), aguaG: $("[data-corte-agua-g]"),
      escC: $("[data-corte-escalones]"), persona: $("[data-persona]"), frase: $("[data-corte-frase]"),
      espejo: $('[data-res="espejo"]'), litros: $('[data-res="litros"]'), precio: $('[data-res="precio"]'), tag: $('[data-res="tag"]'),
      error: $("[data-error]")
    };
    const outs = { largo: $('[data-out="largo"]'), ancho: $('[data-out="ancho"]'), prof: $('[data-out="prof"]') };
    const SVGNS = "http://www.w3.org/2000/svg";
    let profAnterior = parseFloat(el.prof.value);
    const cargada = Date.now();

    const extrasElegidos = () => $$('input[name="extra"]:checked', form).map((i) => i.value).filter((v) => v in PRECIOS.extras);

    const calcular = () => {
      const L = parseFloat(el.largo.value);
      const A = parseFloat(el.ancho.value);
      const P = parseFloat(el.prof.value);
      const area = L * A;
      const litros = Math.round(area * Math.max(P - 0.1, 0) * 1000 / 100) * 100;
      const extras = extrasElegidos();
      let precio = null;
      if (PRECIOS.m2Espejo) {
        let total = area * PRECIOS.m2Espejo * (1 + ((P - PRECIOS.profRef) / 0.1) * PRECIOS.ajuste10cm);
        extras.forEach((k) => {
          const e = PRECIOS.extras[k];
          if (e.tipo === "fijo") total += e.valor;
          if (e.tipo === "m2interior") total += (area + 2 * (L + A) * P) * e.valor;
        });
        const r = PRECIOS.redondeo;
        precio = { min: Math.round(total * (1 - PRECIOS.margen) / r) * r, max: Math.round(total * (1 + PRECIOS.margen) / r) * r };
      }
      return { L, A, P, area, litros, extras, precio };
    };

    const dibujar = (c) => {
      const w = c.L * S, h = c.A * S, b = BORDE * S;
      const x0 = Math.round((VB.w - w) / 2 + 12);
      const y0 = Math.round((VB.h - h) / 2 + 12);
      set(el.grilla, { x: x0 % S, y: y0 % S });
      set(el.borde, { x: x0 - b, y: y0 - b, width: w + 2 * b, height: h + 2 * b });
      set(el.agua, { x: x0, y: y0, width: w, height: h });
      set(el.reflejo, { x: x0, y: y0, width: w, height: h });
      set(el.esc1, { x: x0, y: y0, width: 0.5 * S, height: h });
      set(el.esc2, { x: x0 + 0.5 * S, y: y0, width: 0.5 * S, height: h });
      const pl = Math.min(1.2, c.L * 0.25) * S;
      set(el.playa, { x: x0 + w - pl, y: y0, width: pl, height: h });
      set(el.cascMuro, { x: x0 + w / 2 - 0.5 * S, y: y0 - b - 6, width: S, height: b + 6 });
      set(el.cascAgua, { x: x0 + w / 2 - 0.4 * S, y: y0, width: 0.8 * S, height: 0.3 * S });

      while (el.luces.firstChild) el.luces.removeChild(el.luces.firstChild);
      const n = Math.max(2, Math.floor(c.L / 2.5));
      for (let i = 1; i <= n; i += 1) {
        [y0 + 6, y0 + h - 6].forEach((cy) => {
          const luz = document.createElementNS(SVGNS, "circle");
          set(luz, { cx: x0 + (w * i) / (n + 1), cy, r: 4.5, class: "luz" });
          el.luces.appendChild(luz);
        });
      }

      const yL = y0 - b - 12;
      el.cotaL.setAttribute("d", `M${x0} ${yL - 6}v12M${x0 + w} ${yL - 6}v12M${x0} ${yL}H${x0 + w}`);
      set(el.cotaLt, { x: x0 + w / 2, y: yL - 9 });
      el.cotaLt.textContent = fmtDec(c.L, 1) + " m";
      const xA = x0 - b - 12;
      el.cotaA.setAttribute("d", `M${xA - 6} ${y0}h12M${xA - 6} ${y0 + h}h12M${xA} ${y0}V${y0 + h}`);
      set(el.cotaAt, { x: xA - 9, y: y0 + h / 2, transform: `rotate(-90 ${xA - 9} ${y0 + h / 2})` });
      el.cotaAt.textContent = fmtDec(c.A, 1) + " m";

      planta.classList.toggle("is-escalones", c.extras.includes("escalones"));
      planta.classList.toggle("is-playa", c.extras.includes("playa"));
      planta.classList.toggle("is-luces", c.extras.includes("luces"));
      planta.classList.toggle("is-cascada", c.extras.includes("cascada"));
      planta.classList.toggle("is-venecitas", c.extras.includes("venecitas"));

      /* Corte: misma escala horizontal y vertical */
      const suelo = 40, d = c.P * S, xc = Math.round((VB.w - w) / 2);
      set(el.hueco, { x: xc, y: suelo, width: w, height: d });
      set(el.aguaC, { x: xc, y: suelo + 0.1 * S, width: w, height: d - 0.1 * S });
      el.escC.setAttribute("d", `M${xc} ${suelo + 0.4 * S}H${xc + 0.5 * S}V${suelo + 0.8 * S}H${xc + S}V${suelo + d}H${xc}Z`);
      corte.classList.toggle("is-escalones", c.extras.includes("escalones"));
      const k = (1.7 * S) / 75;
      el.persona.setAttribute("transform", `translate(${xc + w * 0.62} ${suelo + d}) scale(${k.toFixed(3)})`);

      const nivel = c.P - 0.1;
      const parte = nivel <= 1.05 ? "a la cintura" : nivel <= 1.3 ? "al pecho" : nivel <= 1.45 ? "a los hombros" : "al cuello";
      el.frase.textContent = `Con ${fmtDec(c.P, 2)} m de profundidad, el agua le llega ${parte} a una persona de 1,70 m.`;

      if (c.P !== profAnterior && !reduceMotion) {
        el.aguaG.classList.remove("is-llenando");
        void el.aguaG.getBoundingClientRect();
        el.aguaG.classList.add("is-llenando");
      }
      profAnterior = c.P;
    };

    const mostrar = (c) => {
      outs.largo.textContent = fmtDec(c.L, 1) + " m";
      outs.ancho.textContent = fmtDec(c.A, 1) + " m";
      outs.prof.textContent = fmtDec(c.P, 2) + " m";
      [el.largo, el.ancho, el.prof].forEach((r) => {
        const p = ((r.value - r.min) / (r.max - r.min)) * 100;
        r.style.setProperty("--p", p + "%");
      });
      el.espejo.textContent = fmtDec(c.area, Number.isInteger(c.area) ? 0 : 1) + " m²";
      el.litros.textContent = fmtNum.format(c.litros) + " l";
      if (c.precio) {
        el.precio.textContent = fmtPesos.format(c.precio.min) + " a " + fmtPesos.format(c.precio.max);
      } else {
        el.precio.textContent = "Te lo pasamos por WhatsApp";
      }
      el.tag.hidden = !(c.precio && PRECIOS.ejemplo);
    };

    const actualizar = () => { const c = calcular(); mostrar(c); dibujar(c); };
    form.addEventListener("input", actualizar);
    form.addEventListener("change", actualizar);
    actualizar();

    /* Reflejo del agua: solo mientras el dibujo está en pantalla */
    if ("IntersectionObserver" in window && plano) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => plano.classList.toggle("is-visible", e.isIntersecting));
      }, { threshold: 0.1 }).observe(plano);
    }

    /* Celular: al escribir el nombre o la localidad, el dibujo deja de estar fijo */
    const envio = $(".envio", form);
    if (envio && grid) {
      envio.addEventListener("focusin", () => grid.classList.add("is-escribiendo"));
      envio.addEventListener("focusout", () => grid.classList.remove("is-escribiendo"));
    }

    /* Envío a WhatsApp (no se envía nada a ningún servidor) */
    const limpiar = (v) => v.replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const hp = $("#website", form).value;
      if (hp || Date.now() - cargada < 3000) return;    // honeypot + trampa de tiempo

      const nombre = $("#nombre", form);
      const loc = $("#localidad", form);
      const vNombre = limpiar(nombre.value);
      const vLoc = limpiar(loc.value);
      nombre.setAttribute("aria-invalid", vNombre ? "false" : "true");
      loc.setAttribute("aria-invalid", vLoc ? "false" : "true");
      if (!vNombre || !vLoc) {
        el.error.textContent = !vNombre ? "Escribí tu nombre para seguir." : "Escribí tu localidad para seguir.";
        el.error.hidden = false;
        (!vNombre ? nombre : loc).focus();
        return;
      }
      el.error.hidden = true;

      const c = calcular();
      const lineas = [
        `Hola Yatay Piscinas, soy ${vNombre}, de ${vLoc}. Armé mi piscina en la web:`,
        `- Medidas: ${fmtDec(c.L, 1)} x ${fmtDec(c.A, 1)} m, ${fmtDec(c.P, 2)} m de profundidad`,
        `- Espejo de agua: ${fmtDec(c.area, Number.isInteger(c.area) ? 0 : 1)} m² (unos ${fmtNum.format(c.litros)} litros)`,
        `- Extras: ${c.extras.length ? c.extras.map((k) => PRECIOS.extras[k].nombre).join(", ") : "ninguno"}`
      ];
      if (c.precio && !PRECIOS.ejemplo) {
        lineas.push(`- Estimado de la web: ${fmtPesos.format(c.precio.min)} a ${fmtPesos.format(c.precio.max)}`);
      }
      lineas.push("¿Me pasan el presupuesto final y las fechas disponibles?");
      window.open(waUrl(lineas.join("\n")), "_blank", "noopener,noreferrer");
    });
  }

  /* ---------- Pasos del proceso: se destacan de a uno ---------- */
  const pasos = $$("[data-pasos] .paso");
  if (pasos.length && !reduceMotion && "IntersectionObserver" in window) {
    let i = 0, timer = null;
    const marcar = () => { pasos.forEach((p, k) => p.classList.toggle("is-activo", k === i)); i = (i + 1) % pasos.length; };
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !timer) { marcar(); timer = setInterval(marcar, 2200); }
        if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
      });
    }, { threshold: 0.35 }).observe($("[data-pasos]"));
  }
})();
