// helper functions to shorten syntax
const $q = (singleSelector) => document.querySelector(singleSelector);
const $qa = (multiSelector) => document.querySelectorAll(multiSelector);

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const LAST_ATTEMP = MAX_ATTEMPTS - 1;
const KEY_BACKSPACE = "Backspace";
const KEY_ENTER = "Enter";
const LETTER_UNUSED = "b";
const LETTER_WRONG = "y";
const LETTER_CORRECT = "g";
const WORD_UNUSED = Array(WORD_LENGTH).fill(LETTER_UNUSED).join("");
const WORD_CORRECT = Array(WORD_LENGTH).fill(LETTER_CORRECT).join("");
const WORD_API_URL = `https://random-word-api.vercel.app/api?words=1&length=${WORD_LENGTH}&type=uppercase`;
const DICTIONARY_API_URL = `https://api.dictionaryapi.dev/api/v2/entries/en/`;
const KEYBOARD_BUTTONS = [
    [
        ["Q", "Q"],
        ["W", "W"],
        ["E", "E"],
        ["R", "R"],
        ["T", "T"],
        ["Y", "Y"],
        ["U", "U"],
        ["I", "I"],
        ["O", "O"],
        ["P", "P"],
    ],
    [
        ["A", "A"],
        ["S", "S"],
        ["D", "D"],
        ["F", "F"],
        ["G", "G"],
        ["H", "H"],
        ["J", "J"],
        ["K", "K"],
        ["L", "L"],
    ],
    [
        ["Enter", "&crarr;"],
        ["Z", "Z"],
        ["X", "X"],
        ["C", "C"],
        ["V", "V"],
        ["B", "B"],
        ["N", "N"],
        ["M", "M"],
        ["Backspace", "&lArr;"],
    ],
];
const INPUT_HINTS = false; // future setting

const isAlpha = (input) => /^[a-zA-Z]$/.test(input);
const attemptContainer = $q("#attempt-container");
const revealContainer = $q("#reveal");
const keyboardContainer = $q("#keyboard");

buildAttemptGrid();
buildKeyboard();

const attempts = [];
let winner = false;
let input = "";
let isRealWord = false;

const checkAnswer = ((answerPromise) => {
    return async (attempt) => {
        const answer = await answerPromise;
        const counts = {};
        let result = WORD_UNUSED;
        [...answer].forEach((letter) => {
            if (counts[letter]) counts[letter] += 1;
            else counts[letter] = 1;
        });
        [...attempt].forEach((_, i) => {
            if (answer[i] === attempt[i]) {
                result = result.slice(0, i) + LETTER_CORRECT + result.slice(i + 1);
                counts[attempt[i]] -= 1;
            }
        });
        [...attempt].forEach((_, i) => {
            if (answer.includes(attempt[i]) && counts[attempt[i]] > 0 && result[i] !== LETTER_CORRECT) {
                result = result.slice(0, i) + LETTER_WRONG + result.slice(i + 1);
                counts[attempt[i]] -= 1;
            }
        });

        const inputRow = attemptContainer.querySelector(".input-row");
        const attemptLetters = inputRow.querySelectorAll(".attempt-letter");
        attemptLetters.forEach((attemptLetter, i) => {
            attemptLetter.classList.add(result[i]);
        });

        const nextRow = inputRow.nextElementSibling;

        if (result !== WORD_CORRECT && !nextRow) {
            revealAnswer(answer);
        }

        return result;
    };
})(getWord()); // testWord()

async function getWord() {
    const res = await fetch(WORD_API_URL);
    const json = await res.json();
    return json[0].toUpperCase();
}

function testWord() {
    const word = "ERASE";
    return new Promise((res, rej) => {
        res(word);
    });
}

// physical keyboard input listener
window.addEventListener("keydown", (evt) => {
    evt.preventDefault();
    if (attempts.length === MAX_ATTEMPTS || winner === true) return;
    processInput(evt.key);
});

// virtual keyboard input listener
keyboardContainer.querySelectorAll("button.key").forEach((key) => {
    key.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (attempts.length === MAX_ATTEMPTS || winner === true) return;
        processInput(evt.target.value);
    });
});

async function processInput(key) {
    if (key === KEY_BACKSPACE) {
        if (input.length > 0) {
            input = input.slice(0, -1);
        }
    } else if (key === KEY_ENTER) {
        if (input.length === WORD_LENGTH && isRealWord) {
            const inputRow = attemptContainer.querySelector(".input-row");
            const nextRow = inputRow.nextElementSibling;
            const result = await checkAnswer(input);
            displayResult(inputRow, result);
            input = "";
            inputRow.classList.remove("input-row");
            if (result === WORD_CORRECT) {
                const inputLetters = inputRow.querySelectorAll(".attempt-letter");
                inputLetters.forEach((letter) => {
                    letter.classList.add("bounce");
                });
                gameOver(true);
            } else {
                if (nextRow) {
                    nextRow.classList.add("input-row");
                } else {
                    gameOver(false);
                }
            }
        }
    } else if (isAlpha(key) && input.length < WORD_LENGTH) {
        input += key.toUpperCase();
    }

    const enterKey = keyboardContainer.querySelector("button[value='Enter']");
    if (input.length === WORD_LENGTH) {
        isRealWord = await checkWord(input);
        if (isRealWord) {
            enterKey.removeAttribute("disabled");
        } else {
            const inputRow = attemptContainer.querySelector(".input-row");
            inputRow.classList.add("shake");
            setTimeout(() => inputRow.classList.remove("shake"), 1000);
            enterKey.setAttribute("disabled", true);
        }
    } else {
        isRealWord = false;
        enterKey.setAttribute("disabled", true);
    }

    displayInput(input);
}

function checkWord(word) {
    return fetch(`${DICTIONARY_API_URL}${word}`)
        .then((resp) => resp.json())
        .then(({ title }) => !(title && title === "No Definitions Found"));
}

function displayInput(input) {
    const inputLetters = attemptContainer.querySelectorAll(".input-row .attempt-letter");
    inputLetters.forEach((inputLetter, i) => {
        inputLetter.innerHTML = input[i] || "";
    });
}

function displayResult(inputRow, result) {
    const attemptLetters = inputRow.querySelectorAll(".attempt-letter");
    attemptLetters.forEach((attemptLetter, i) => {
        attemptLetter.classList.add(result[i]);
        displayKeyboardHints(input[i], result[i]);
    });
}

function displayKeyboardHints(letter, result) {
    const button = $q(`button[value="${letter}"]`);
    if (button.classList.contains(LETTER_CORRECT)) {
    } else if (button.classList.contains(LETTER_WRONG) && result === LETTER_CORRECT) {
        button.classList.remove(LETTER_WRONG);
        button.classList.add(LETTER_CORRECT);
    } else {
        button.classList.remove(LETTER_UNUSED);
        button.classList.add(result);
    }
}

function revealAnswer(answer) {
    revealContainer.classList.add("padded");
    revealContainer.classList.add(winner ? LETTER_CORRECT : LETTER_UNUSED);
    revealContainer.innerHTML = `<h2>${answer}</h2>`;
}

function buildAttemptGrid() {
    let grid = "";
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
        grid += `<div class="attempt-row ${r === 0 ? "input-row" : ""}">`;
        for (let l = 0; l < WORD_LENGTH; l++) {
            grid += `<div class="attempt-letter"></div>`;
        }
        grid += `</div>`;
    }
    attemptContainer.innerHTML = grid;
}

function buildKeyboard() {
    const keyRowTemplate = (buttons) => `<div class="row">${buttons}</div>`;
    const keyButtonTemplate = ([value, text]) => `<button class="key" value="${value}">${text}</button>`;

    keyboardContainer.innerHTML = KEYBOARD_BUTTONS.reduce((rows, row) => (rows += keyRowTemplate(row.reduce((buttons, button) => (buttons += keyButtonTemplate(button)), ""))), "");

    keyboardContainer.querySelector("button[value='Enter']").setAttribute("disabled", "disabled");
}

function gameOver(winner = false) {
    keyboardContainer.remove();
    if (winner) revealContainer.remove();
}
