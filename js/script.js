// helper functions to shorten syntax
const $q = (singleSelector) => document.querySelector(singleSelector);
const $qa = (multiSelector) => document.querySelectorAll(multiSelector);

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const LAST_ATTEMP = MAX_ATTEMPTS - 1;
const KEY_BACKSPACE = `Backspace`;
const KEY_ENTER = `Enter`;
const LETTER_UNUSED = `b`;
const LETTER_WRONG = `y`;
const LETTER_CORRECT = `g`;
const WORD_UNUSED = Array(WORD_LENGTH).fill(LETTER_UNUSED).join(``);
const WORD_CORRECT = Array(WORD_LENGTH).fill(LETTER_CORRECT).join(``);
const URL_GUESSES = `./assets/valid_guesses.json`;
const URL_SOLUTIONS = `./assets/valid_solutions.json`;

const KEYBOARD_BUTTONS = [
    [
        [`Q`, `Q`],
        [`W`, `W`],
        [`E`, `E`],
        [`R`, `R`],
        [`T`, `T`],
        [`Y`, `Y`],
        [`U`, `U`],
        [`I`, `I`],
        [`O`, `O`],
        [`P`, `P`],
    ],
    [
        [`A`, `A`],
        [`S`, `S`],
        [`D`, `D`],
        [`F`, `F`],
        [`G`, `G`],
        [`H`, `H`],
        [`J`, `J`],
        [`K`, `K`],
        [`L`, `L`],
    ],
    [
        [`Enter`, `&crarr;`],
        [`Z`, `Z`],
        [`X`, `X`],
        [`C`, `C`],
        [`V`, `V`],
        [`B`, `B`],
        [`N`, `N`],
        [`M`, `M`],
        [`Backspace`, `&lArr;`],
    ],
];
const INPUT_HINTS = false; // future setting

const isAlpha = (input) => /^[a-zA-Z]$/.test(input);
const attemptContainer = $q(`#attempt-container`);
const revealContainer = $q(`#reveal`);
const keyboardContainer = $q(`#keyboard`);
const words = {};
const attempts = [];
let winner = false;
let input = ``;
let isRealWord = false;

Promise.all([getGuesses(), getSolutions()])
    .then(([guesses, solutions]) => {
        const answer = getAnswer(solutions);
        const wordList = [...solutions, ...guesses];
        words.answer = answer;
        words.wordList = wordList;
    })
    .finally(() => {
        buildAttemptGrid();
        inputListeners();
    });

function inputListeners() {
    // physical keyboard input listener
    window.addEventListener(`keydown`, (evt) => {
        evt.preventDefault();
        if (attempts.length === MAX_ATTEMPTS || winner === true) return;
        processInput(evt.key);
    });

    // mobile keyboard
    if ("virtualKeyboard" in navigator && navigator?.userAgentData?.mobile) {
        const body = document.querySelector("body");
        body.setAttribute("contenteditable", "true");
        body.setAttribute("virtualkeyboardpolicy","manual");
        navigator.virtualKeyboard.overlaysContent = true;
        document.querySelector("main").addEventListener("click", () => {
            navigator.virtualKeyboard.show();
        })
    } else {
        buildKeyboard();

        // virtual keyboard input listener
        keyboardContainer.querySelectorAll(`button.key`).forEach((key) => {
            key.addEventListener(`click`, (evt) => {
                evt.preventDefault();
                if (attempts.length === MAX_ATTEMPTS || winner === true) return;
                processInput(evt.target.value);
            });
        });
    }
}

function processInput(key) {
    if (key === KEY_BACKSPACE) {
        if (input.length > 0) {
            input = input.slice(0, -1);
        }
    } else if (key === KEY_ENTER) {
        if (input.length === WORD_LENGTH && isRealWord) {
            const inputRow = attemptContainer.querySelector(`.input-row`);
            const nextRow = inputRow.nextElementSibling;
            const result = checkAnswer(input);
            displayResult(inputRow, result);
            input = ``;
            inputRow.classList.remove(`input-row`);
            if (result === WORD_CORRECT) {
                const inputLetters = inputRow.querySelectorAll(`.attempt-letter`);
                inputLetters.forEach((letter) => {
                    letter.classList.add(`bounce`);
                });
                gameOver(true);
            } else {
                if (nextRow) {
                    nextRow.classList.add(`input-row`);
                } else {
                    gameOver(false);
                }
            }
        }
    } else if (isAlpha(key) && input.length < WORD_LENGTH) {
        input += key.toUpperCase();
    }

    const enterKey = keyboardContainer.querySelector(`button[value="Enter"]`);
    if (input.length === WORD_LENGTH) {
        isRealWord = checkWord(input);
        if (isRealWord) {
            enterKey.removeAttribute(`disabled`);
        } else {
            const inputRow = attemptContainer.querySelector(`.input-row`);
            inputRow.classList.add(`shake`);
            setTimeout(() => inputRow.classList.remove(`shake`), 1000);
            enterKey.setAttribute(`disabled`, true);
        }
    } else {
        isRealWord = false;
        enterKey.setAttribute(`disabled`, true);
    }

    displayInput(input);
}

function checkAnswer(attempt) {
    const answer = words.answer;
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

    const inputRow = attemptContainer.querySelector(`.input-row`);
    const attemptLetters = inputRow.querySelectorAll(`.attempt-letter`);
    attemptLetters.forEach((attemptLetter, i) => {
        attemptLetter.classList.add(result[i]);
    });

    const nextRow = inputRow.nextElementSibling;

    if (result !== WORD_CORRECT && !nextRow) {
        revealAnswer(answer);
    }

    return result;
}

function checkWord(word) {
    return words.wordList.includes(word);
}

function displayInput(input) {
    const inputLetters = attemptContainer.querySelectorAll(`.input-row .attempt-letter`);
    inputLetters.forEach((inputLetter, i) => {
        inputLetter.innerHTML = input[i] || ``;
    });
}

function displayResult(inputRow, result) {
    const attemptLetters = inputRow.querySelectorAll(`.attempt-letter`);
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
    revealContainer.classList.add(`padded`);
    revealContainer.classList.add(winner ? LETTER_CORRECT : LETTER_UNUSED);
    revealContainer.innerHTML = `<h2>${answer}</h2>`;
}

function buildAttemptGrid() {
    let grid = ``;
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
        grid += `<div class="attempt-row ${r === 0 ? `input-row` : ``}">`;
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

    keyboardContainer.innerHTML = KEYBOARD_BUTTONS.reduce((rows, row) => (rows += keyRowTemplate(row.reduce((buttons, button) => (buttons += keyButtonTemplate(button)), ``))), ``);

    keyboardContainer.querySelector(`button[value="Enter"]`).setAttribute(`disabled`, `disabled`);
}

function gameOver(winner = false) {
    keyboardContainer.remove();
    if (winner) revealContainer.remove();
}

function getAnswer(solutions) {
    const rand = random(0, solutions.length - 1);
    return solutions[rand];
}

async function getGuesses() {
    return await fetch(URL_GUESSES)
        .then((res) => res.json())
        .then((words) => words.map((word) => word.toUpperCase()));
}

async function getSolutions() {
    return await fetch(URL_SOLUTIONS)
        .then((res) => res.json())
        .then((words) => words.map((word) => word.toUpperCase()));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// function getIsoDate() {
//     const date = new Date()
//     const offset = date.getTimezoneOffset()
//     const trueDate = new Date(date.getTime() - (offset*60*1000))
//     return trueDate.toISOString().split(`T`)[0]
// }

// getNYTimesAnswer();
// async function getNYTimesAnswer() {
//     const URL_NY_TIMES = `https://www.nytimes.com/svc/wordle/v2/${getIsoDate()}.json`;
//     return await fetch(URL_NY_TIMES, { mode: "no-cors" })
//     .then((res) => res.json())
//     .then((json) => console.warn(json))
//     .catch((err) => console.error(err));
// }
