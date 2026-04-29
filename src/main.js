import { createApp, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import "./style.css";

function calculateChecksum(baseNineDigits) {
  let sum = 0;
  for (let i = 0; i < baseNineDigits.length; i += 1) {
    sum += Number(baseNineDigits[i]) * (9 - i);
  }

  if (sum < 100) return String(sum).padStart(2, "0");
  if (sum === 100 || sum === 101) return "00";
  const mod = sum % 101;
  return mod === 100 ? "00" : String(mod).padStart(2, "0");
}

function generateSnilsValue() {
  let body = "";
  while (body.length < 9) body += Math.floor(Math.random() * 10);
  body = body.slice(0, 9);
  return body + calculateChecksum(body);
}

createApp({
  setup() {
    const count = ref(12);
    const withSeparator = ref(true);
    const generatedSnils = ref([]);
    const copiedField = ref("");

    const formatSnils = (snils) => {
      if (!withSeparator.value) return snils;
      return snils.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1-$2-$3 $4");
    };

    const generateList = () => {
      const target = Math.max(1, Math.min(50, Number(count.value) || 1));
      const unique = new Set();
      while (unique.size < target) {
        unique.add(generateSnilsValue());
      }
      generatedSnils.value = Array.from(unique);
    };

    const copyText = async (field, text) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copiedField.value = field;
        setTimeout(() => {
          if (copiedField.value === field) copiedField.value = "";
        }, 1200);
      } catch (_e) {
        copiedField.value = "";
      }
    };

    const copyOne = (idx) => {
      const value = generatedSnils.value[idx] || "";
      copyText(`one-${idx}`, formatSnils(value));
    };

    const copyAll = () => {
      const values = generatedSnils.value.map((v) => formatSnils(v));
      copyText("all", values.join("\n"));
    };

    let resizeObserver = null;
    let mediaQuery = null;
    let mediaChangeHandler = null;
    let windowResizeHandler = null;

    const syncResultPanelHeight = () => {
      const settingsPanel = document.getElementById("settings-panel");
      const resultPanel = document.getElementById("result-panel");
      if (!settingsPanel || !resultPanel || !mediaQuery) return;

      if (mediaQuery.matches) {
        const targetHeight = Math.min(618, Math.round(settingsPanel.getBoundingClientRect().height));
        resultPanel.style.height = `${targetHeight}px`;
      } else {
        resultPanel.style.height = "";
      }
    };

    const yearNode = document.getElementById("year-node");
    if (yearNode) yearNode.textContent = String(new Date().getFullYear());

    onMounted(() => {
      mediaQuery = window.matchMedia("(min-width: 1024px)");
      mediaChangeHandler = () => syncResultPanelHeight();
      windowResizeHandler = () => syncResultPanelHeight();

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", mediaChangeHandler);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(mediaChangeHandler);
      }

      window.addEventListener("resize", windowResizeHandler);

      const settingsPanel = document.getElementById("settings-panel");
      if (settingsPanel && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => syncResultPanelHeight());
        resizeObserver.observe(settingsPanel);
      }

      syncResultPanelHeight();
    });

    onBeforeUnmount(() => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mediaQuery && mediaChangeHandler) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", mediaChangeHandler);
        } else if (typeof mediaQuery.removeListener === "function") {
          mediaQuery.removeListener(mediaChangeHandler);
        }
      }
      if (windowResizeHandler) window.removeEventListener("resize", windowResizeHandler);
    });

    generateList();

    return {
      count,
      withSeparator,
      generatedSnils,
      copiedField,
      formatSnils,
      generateList,
      copyOne,
      copyAll
    };
  }
}).mount("#snils-app");

