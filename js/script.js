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
const WORD_API_URL = `https://random-word-api.herokuapp.com/word?length=${WORD_LENGTH}&lang=en`;
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
        ["Backspace", "&lArr;"],
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
        ["Enter", "&crarr;"],
    ],
    [
        ["Z", "Z"],
        ["X", "X"],
        ["C", "C"],
        ["V", "V"],
        ["B", "B"],
        ["N", "N"],
        ["M", "M"],
    ],
];

buildAttemptGrid();
buildInputGrid();
buildKeyboard();

const attemptOutputs = $qa(".grid-container .grid-item");
const inputOutputs = $qa(".input-container .grid-item");
const isAlpha = (input) => /^[a-zA-Z]$/.test(input);

const attempts = [];
let winner = false;
let input = "";

const checkAnswer = ((answerPromise) => {
    return async (attempts, newAttempt) => {
        const answer = await answerPromise;
        const counts = {};
        let result = WORD_UNUSED;
        [...answer].forEach((_, i) => {
            if (counts[_]) counts[_] += 1;
            else counts[_] = 1;
        });
        // console.log(counts);
        [...attempts[newAttempt]].forEach((_, i) => {
            if (answer[i] === attempts[newAttempt][i]) {
                result = result.slice(0, i) + LETTER_CORRECT + result.slice(i + 1);
                counts[attempts[newAttempt][i]] -= 1;
            }
        });
        [...attempts[newAttempt]].forEach((_, i) => {
            if (
                answer.includes(attempts[newAttempt][i]) &&
                counts[attempts[newAttempt][i]] > 0 &&
                result[i] !== LETTER_CORRECT
            ) {
                result = result.slice(0, i) + LETTER_WRONG + result.slice(i + 1);
                counts[attempts[newAttempt][i]] -= 1;
            }
        });
        if (result === WORD_CORRECT || newAttempt === LAST_ATTEMP) {
            winner = result === WORD_CORRECT;
            revealAnswer(answer);
        }
        return result;
    };
})(testWord()); // getWord()

// physical keyboard input listener
window.addEventListener("keydown", (evt) => {
    evt.preventDefault();
    if (attempts.length === MAX_ATTEMPTS || winner === true) return;
    processInput(evt.key);
});

// virtual keyboard input listener
$qa(".keyboard button.key").forEach((key) => {
    key.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (attempts.length === MAX_ATTEMPTS || winner === true) return;
        processInput(evt.target.value);
    });
});

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

function processInput(key) {
    // console.log(key)
    if (key === KEY_BACKSPACE) {
        if (input.length > 0) {
            input = input.slice(0, -1);
        }
    } else if (key === KEY_ENTER) {
        if (input.length === WORD_LENGTH) {
            attempts.push(input);
            input = "";
            inputOutputs.forEach((i) => {
                i.innerText = "";
            });
            displayAttempt(attempts);
        }
    } else if (isAlpha(key) && input.length < WORD_LENGTH) {
        input += key.toUpperCase();
    }

    displayInput(input);
}

function displayInput(input) {
    for (let i = 0; i < WORD_LENGTH; i++) {
        inputOutputs[i].innerText = input[i] || "";
    }
}

async function displayAttempt(attempts) {
    const newAttempt = attempts.length - 1;
    let itemIndex = newAttempt * WORD_LENGTH;
    let result = await checkAnswer(attempts, newAttempt);
    for (let i = 0; i < WORD_LENGTH; i++) {
        attemptOutputs[itemIndex].innerText = attempts[newAttempt][i];
        attemptOutputs[itemIndex].classList.add(result[i]);
        displayKeyboardHints(attempts[newAttempt][i], result[i]);
        itemIndex++;
    }
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
    const revealElement = $q(".reveal");
    revealElement.classList.add("padded");
    revealElement.classList.add(winner ? LETTER_CORRECT : LETTER_UNUSED);
    revealElement.innerHTML = `<h2>${answer}</h2>`;

    $q(".input-container").style.display = "none";
    $q(".keyboard").style.display = "none";
}

function buildAttemptGrid() {
    const gridItemTemplate = $q("#grid-item");
    const gridContainer = $q(".grid-container");

    const gridItemTotal = WORD_LENGTH * MAX_ATTEMPTS;
    for (let i = 0; i < gridItemTotal; i++) {
        const itemClone = gridItemTemplate.content.cloneNode(true);
        gridContainer.appendChild(itemClone);
    }
}

function buildInputGrid() {
    const gridItemTemplate = $q("#grid-item");
    const inputContainer = $q(".input-container");

    for (let i = 0; i < WORD_LENGTH; i++) {
        const itemClone = gridItemTemplate.content.cloneNode(true);
        inputContainer.appendChild(itemClone);
    }
}

function buildKeyboard() {
    const keyRowTemplate = $q("#key-row");
    const keyButtonTemplate = $q("#key-button");
    const keyboardContainer = $q(".keyboard");

    const rows = KEYBOARD_BUTTONS.length;
    for (let r = 0; r < rows; r++) {
        const rowClone = keyRowTemplate.content.cloneNode(true);
        const row = rowClone.querySelector(".row");
        const buttons = KEYBOARD_BUTTONS[r].length;
        for (let b = 0; b < buttons; b++) {
            const [val, txt] = KEYBOARD_BUTTONS[r][b];
            const buttonClone = keyButtonTemplate.content.cloneNode(true);
            const button = buttonClone.querySelector(".key");
            button.value = val;
            button.innerHTML = txt;
            row.appendChild(buttonClone);
        }
        keyboardContainer.appendChild(rowClone);
    }
}
