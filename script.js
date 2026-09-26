// --- Sample Data Banks ---
const TEXT_BANKS = {
  words: [
    "algorithm",
    "variable",
    "function",
    "javascript",
    "developer",
    "frontend",
    "database",
    "computer",
    "keyboard",
    "practice",
    "application",
    "network",
    "software",
    "interface",
    "structure",
    "performance",
    "array",
    "object",
    "component",
    "asynchronous",
  ],
  sentences: [
    "The quick brown fox jumps over the lazy dog.",
    "Java is a popular programming language used to build apps.",
    "Practice makes a person perfect in speed typing and accuracy.",
    "Clean code always looks like it was written by someone who cares.",
    "Success in programming comes from continuous learning and problem solving.",
  ],
  code: [
    'public class Main { public static void main(String[] args) { System.out.println("Hello World"); } }',
    "const calculateWPM = (words, minutes) => Math.round(words / minutes);",
    'List<String> items = new ArrayList<>(); items.add("Java"); items.add("JS");',
    "function handleKeyPress(e) { if(e.key === 'Enter') resetGame(); }",
  ],
};

// --- App State ---
let selectedTime = 30;
let selectedMode = "words";
let timeLeft = selectedTime;
let timer = null;
let isPlaying = false;
let currentText = "";
let charIndex = 0;
let errors = 0;
let soundEnabled = true;

// --- DOM Elements ---
const textDisplay = document.getElementById("text-display");
const hiddenInput = document.getElementById("hidden-input");
const timerDisplay = document.getElementById("timer-display");
const wpmDisplay = document.getElementById("wpm-display");
const accuracyDisplay = document.getElementById("accuracy-display");
const errorsDisplay = document.getElementById("errors-display");
const resultsModal = document.getElementById("results-modal");
const finalWpm = document.getElementById("final-wpm");
const finalAccuracy = document.getElementById("final-accuracy");
const finalCpm = document.getElementById("final-cpm");
const finalErrors = document.getElementById("final-errors");
const restartBtn = document.getElementById("restart-btn");
const historyTbody = document.getElementById("history-tbody");
const soundToggleBtn = document.getElementById("sound-toggle");
const themeToggleBtn = document.getElementById("theme-toggle");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// --- Web Audio API for Sound Feedback ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, duration = 0.05) {
  if (!soundEnabled) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

// --- Dynamic Guided Key Highlighting ---
function updateNextKeyHighlight() {
  document
    .querySelectorAll(".key")
    .forEach((key) => key.classList.remove("next-target"));

  if (charIndex >= currentText.length) return;

  const nextChar = currentText[charIndex];
  if (!nextChar) return;

  const targetChar = nextChar.toLowerCase();

  document.querySelectorAll(".key").forEach((keyEl) => {
    const keyVal = keyEl.getAttribute("data-key");

    if (keyVal === targetChar || (nextChar === " " && keyVal === " ")) {
      keyEl.classList.add("next-target");
    }

    if (nextChar !== targetChar && keyVal === "Shift") {
      keyEl.classList.add("next-target");
    }
  });
}

// --- Text Generator ---
function generateText() {
  if (selectedMode === "words") {
    let list = [];
    for (let i = 0; i < 30; i++) {
      const randomIndex = Math.floor(Math.random() * TEXT_BANKS.words.length);
      list.push(TEXT_BANKS.words[randomIndex]);
    }
    currentText = list.join(" ");
  } else if (selectedMode === "sentences") {
    const randomIndex = Math.floor(Math.random() * TEXT_BANKS.sentences.length);
    currentText = TEXT_BANKS.sentences[randomIndex];
  } else if (selectedMode === "code") {
    const randomIndex = Math.floor(Math.random() * TEXT_BANKS.code.length);
    currentText = TEXT_BANKS.code[randomIndex];
  }

  textDisplay.innerHTML = "";
  currentText.split("").forEach((char, idx) => {
    const charSpan = document.createElement("span");
    charSpan.classList.add("char");
    if (idx === 0) charSpan.classList.add("current");
    charSpan.innerText = char;
    textDisplay.appendChild(charSpan);
  });

  updateNextKeyHighlight();
}

// --- Game Logic ---
function initGame() {
  clearInterval(timer);
  timeLeft = selectedTime;
  isPlaying = false;
  charIndex = 0;
  errors = 0;

  timerDisplay.innerText = timeLeft;
  wpmDisplay.innerText = "0";
  accuracyDisplay.innerText = "100%";
  errorsDisplay.innerText = "0";
  hiddenInput.value = "";

  generateText();
  resultsModal.classList.remove("active");
  hiddenInput.focus();
}

function startTimer() {
  isPlaying = true;
  timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      timerDisplay.innerText = timeLeft;
      calculateMetrics();
    } else {
      endGame();
    }
  }, 1000);
}

function calculateMetrics() {
  const timePassed = selectedTime - timeLeft;
  if (timePassed === 0) return;

  const wpm = Math.round((charIndex - errors) / 5 / (timePassed / 60));
  const accuracy = Math.round(((charIndex - errors) / (charIndex || 1)) * 100);

  wpmDisplay.innerText = wpm < 0 || !wpm ? 0 : wpm;
  accuracyDisplay.innerText = `${accuracy < 0 || !accuracy ? 100 : accuracy}%`;
  errorsDisplay.innerText = errors;
}

function handleTyping(e) {
  const characters = textDisplay.querySelectorAll(".char");
  const typedChar = e.data;

  if (!isPlaying && hiddenInput.value.length > 0) {
    startTimer();
  }

  if (e.inputType === "deleteContentBackward") {
    if (charIndex > 0) {
      characters[charIndex].classList.remove("current");
      charIndex--;
      characters[charIndex].classList.remove("correct", "incorrect");
      characters[charIndex].classList.add("current");
    }
    updateNextKeyHighlight();
    return;
  }

  if (charIndex < characters.length) {
    const expectedChar = currentText[charIndex];

    if (typedChar === expectedChar) {
      characters[charIndex].classList.add("correct");
      playSound(600);
    } else {
      characters[charIndex].classList.add("incorrect");
      errors++;
      playSound(200, 0.1);
    }

    characters[charIndex].classList.remove("current");
    charIndex++;

    if (charIndex < characters.length) {
      characters[charIndex].classList.add("current");
    } else {
      endGame();
    }
  }

  updateNextKeyHighlight();
  calculateMetrics();
}

function endGame() {
  clearInterval(timer);
  isPlaying = false;
  playSound(800, 0.2);

  const timePassed = selectedTime - timeLeft || 1;
  const finalWpmVal =
    Math.round((charIndex - errors) / 5 / (timePassed / 60)) || 0;
  const finalAccVal =
    Math.round(((charIndex - errors) / (charIndex || 1)) * 100) || 100;
  const cpmVal = Math.round((charIndex / timePassed) * 60) || 0;

  finalWpm.innerText = finalWpmVal;
  finalAccuracy.innerText = `${finalAccVal}%`;
  finalCpm.innerText = cpmVal;
  finalErrors.innerText = errors;

  saveHistory({
    mode: selectedMode,
    wpm: finalWpmVal,
    accuracy: `${finalAccVal}%`,
    errors: errors,
    date: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  resultsModal.classList.add("active");
}

// --- History Storage Functions ---
function saveHistory(entry) {
  let history = JSON.parse(localStorage.getItem("typing_history")) || [];
  history.unshift(entry);
  if (history.length > 5) history.pop();
  localStorage.setItem("typing_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  let history = JSON.parse(localStorage.getItem("typing_history")) || [];

  if (history.length === 0) {
    historyTbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-history">No performance history found.</td>
            </tr>
        `;
    return;
  }

  historyTbody.innerHTML = history
    .map(
      (item) => `
        <tr>
            <td><strong style="text-transform: capitalize;">${item.mode}</strong></td>
            <td>${item.wpm}</td>
            <td>${item.accuracy}</td>
            <td>${item.errors}</td>
            <td>${item.date}</td>
        </tr>
    `,
    )
    .join("");
}

function clearHistory() {
  let history = JSON.parse(localStorage.getItem("typing_history")) || [];
  if (history.length === 0) return;

  if (
    confirm("Are you sure you want to delete your Recent Performance history?")
  ) {
    localStorage.removeItem("typing_history");
    renderHistory();
  }
}

// --- Virtual Keyboard Press Effect ---
function highlightKeyPress(key) {
  const keyElement = Array.from(document.querySelectorAll(".key")).find(
    (k) =>
      k.getAttribute("data-key") === key.toLowerCase() ||
      k.getAttribute("data-key") === key,
  );
  if (keyElement) {
    keyElement.classList.add("active");
    setTimeout(() => keyElement.classList.remove("active"), 150);
  }
}

// --- Event Listeners ---
document.addEventListener("click", () => hiddenInput.focus());

hiddenInput.addEventListener("input", handleTyping);

document.addEventListener("keydown", (e) => {
  highlightKeyPress(e.key);

  if (e.key === "Enter" && document.activeElement === restartBtn) {
    initGame();
  }
});

document.querySelectorAll("#time-options .btn-option").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document
      .querySelectorAll("#time-options .btn-option")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    selectedTime = parseInt(e.target.dataset.time);
    initGame();
  });
});

document.querySelectorAll("#mode-options .btn-option").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document
      .querySelectorAll("#mode-options .btn-option")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    selectedMode = e.target.dataset.mode;
    initGame();
  });
});

restartBtn.addEventListener("click", initGame);
clearHistoryBtn.addEventListener("click", clearHistory);

soundToggleBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.innerHTML = soundEnabled
    ? '<i class="fa-solid fa-volume-high"></i>'
    : '<i class="fa-solid fa-volume-xmark"></i>';
});

themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.getAttribute("data-theme") === "light";
  if (isLight) {
    document.body.removeAttribute("data-theme");
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    document.body.setAttribute("data-theme", "light");
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
});

// Initial Load
initGame();
renderHistory();
