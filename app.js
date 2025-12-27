/*
 * This file is part of the MiQuizZero Application (https://github.com/bobboteck/miquizzero).
 * Copyright (c) 2025 Roberto D'Amico (Bobboteck).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

let quizData = null;
let questions = [];
let mode = "feedback";
let currentIndex = 0;
let score = 0;
let totalTime = 300;
let totalTimer;
let userAnswers = {};
let bookmarks = [];

const fileInput = document.getElementById("quizFileInput");
const fileHelp = document.getElementById("fileHelp");
const txtQuizMinute = document.getElementById("quizTimeInput");
const quizContainer = document.getElementById("quiz-container");
const nextBtn = document.getElementById("next-btn");
const resultBox = document.getElementById("result");
const timerBox = document.getElementById("timer");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("quizProgressBar");
const backBtn = document.getElementById("back-btn");
const quizRandom = document.getElementById("quizRandom");
const selectQuizMode = document.getElementById("selectQuizMode");
const btnStartQuiz = document.getElementById("btnStartQuiz");
const questionToUse = document.getElementById("questionToUse");
const totalQuestions = document.getElementById("totalQuestions");

const emptyBookmark = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/></svg>`;
const filledBookmark = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark-fill" viewBox="0 0 16 16"><path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2"/></svg>`;
const version = "3.2.0";

/**
 * Load quiz data file
 */
fileInput.addEventListener("change",() =>
{
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) =>
    {
        try
        {
            quizData = JSON.parse(e.target.result);

            // Validation
            const error = validateQuizJSON(quizData);
            if (error)
            {
                fileHelp.style.color = "var(--bs-danger)";
                fileHelp.innerText = `Error in Quiz file loaded: ${error}`;
            }
            else
            {
                fileHelp.style.color = "var(--bs-success)";
                fileHelp.innerText = "Quiz file loaded";
                // Activate mode selector
                selectQuizMode.disabled = false;

                questionToUse.value = quizData.questions.length;
                totalQuestions.innerText = `of ${quizData.questions.length}`;
            }
        }
        catch (err)
        {
            fileHelp.style.color = "var(--bs-danger)";
            fileHelp.innerText = `Error in Quiz file loaded: ${err}`;
        }
    };

    reader.readAsText(file);
});

selectQuizMode.addEventListener("change", () =>
{
    if(selectQuizMode.value !== "")
    {
        mode = selectQuizMode.value;
        btnStartQuiz.disabled = false;
    }
    else
    {
        mode = "";
        btnStartQuiz.disabled = true;
    }
});

/**
 * Run quiz in mode selected
 * @returns 
 */
function startQuiz()
{
    if (!quizData)
    {
        alert("Select a valid MiQuizZero file to start your Quiz!");
        return;
    }

    // Update the total time, on value selected by user
    totalTime = txtQuizMinute.value * 60;

    document.getElementById("mode-selector").style.display = "none";
    nextBtn.style.display = "block";
    backBtn.style.display = "inline-block";
    progressContainer.style.display = "";

    // Check if request to randomize the order of questions
    if(quizRandom.checked)
    {
        questions = shuffle([...quizData.questions]);
    }
    else
    {
        questions = quizData.questions;
    }

    startTotalTimer();
    loadQuestion();
}
  
  // ------------ TIMER --------------
function startTotalTimer()
{
    timerBox.textContent = formatTime(totalTime);

    totalTimer = setInterval(() =>
    {
        totalTime--;
        timerBox.textContent = formatTime(totalTime);

        if (totalTime <= 0)
        {
            clearInterval(totalTimer);
            endQuiz();
        }
    }, 1000);
}


// ------------ Load question --------------
function loadQuestion()
{
    nextBtn.disabled = true;
    backBtn.disabled = currentIndex === 0;
    updateProgressBar();

    const q = questions[currentIndex];
    const isMultiple = q.correct_answer.length > 1;
    const inputType = isMultiple ? "checkbox" : "radio";
    const bookmarkActive = bookmarks.includes(q.id);

    quizContainer.innerHTML = `
<div class="card">
    <div class="card-body">
        <div class="d-flex justify-content-between">
            <h6 class="card-subtitle text-body-secondary">Question ${currentIndex + 1} of ${questions.length}</h6>
            <button type="button" class="btn"  id="btnBookmark">
            ${bookmarkActive ? filledBookmark : emptyBookmark}
            </button>
        </div>
        <p class="card-text">
            ${q.question}<br />
            <i>${isMultiple ? `(choose the best ${q.correct_answer.length} answers)` : `(choose the best answer)` }</i>
        </p>

        ${q.options.map(opt => `
        <div class="form-check mb-2">
            <input class="form-check-input" type="${inputType}" name="answer" value="${opt.id}" id="answer${opt.id}">
            <label class="form-check-label" for="answer${opt.id}">
                <b>${opt.id}.</b> ${opt.text}
            </label>
        </div>
        `).join("")}

        <div id="feedback"></div>
    </div>
</div>`;

    // Precarica eventuali risposte già date
    if (userAnswers[q.id])
    {
        document.querySelectorAll("input[name='answer']").forEach(inp =>
        {
            if (userAnswers[q.id].includes(inp.value))
            {
                inp.checked = true;
            }
        });
        // Re-enable the next button
        nextBtn.disabled = false;
    }

    addAnswerListeners(isMultiple, q);
    addBookmarkListener(q.id);
}
  
function addAnswerListeners(isMultiple, q)
{
    document.querySelectorAll("input[name='answer']").forEach(input =>
    {
        input.addEventListener("change", () =>
        {
            if (!isMultiple)
            {
                userAnswers[q.id] = [input.value];
                
                if (mode === "feedback")
                {
                    showFeedback();
                }

                nextBtn.disabled = false;
            }
            else
            {
                const checked = [...document.querySelectorAll("input[name='answer']:checked")].map(i => i.value);

                userAnswers[q.id] = checked;

                nextBtn.disabled = checked.length === 0;

                if (mode === "feedback")
                {
                    showFeedback();
                }
            }
        });
    });
}
  
function addBookmarkListener(qid)
{
    document.getElementById("btnBookmark").addEventListener("click", () =>
    {
        if (bookmarks.includes(qid))
        {
            bookmarks = bookmarks.filter(id => id !== qid);
        }
        else
        {
            bookmarks.push(qid);
        }

        loadQuestion();
    });
}


// ------------ FEEDBACK --------------
function arraysEqual(a, b)
{
    if (a.length !== b.length) return false;
    return a.slice().sort().join(",") === b.slice().sort().join(",");
}
  
function showFeedback()
{
    const q = questions[currentIndex];
    const fb = document.getElementById("feedback");
    const user = userAnswers[q.id] || [];

    // only if you have selected the expected number of responses does it show feedback
    if(q.correct_answer.length == user.length)
    {
        const correct = arraysEqual(user, q.correct_answer);

        if (correct)
        {
            score++;
            fb.innerHTML = `<div class="alert alert-success" role="alert"><b>✓</b> Correct answer!</div>`;
        }
        else
        {
            fb.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <b>✗</b> Wrong answer<br>
                Correct answer: <b>${q.correct_answer.join(", ")}</b>
            </div>`;

            navigator.vibrate?.(200);
            soundError();
        }
    }
}
  
// ------------ BUTTON NAVIGATION --------------
nextBtn.addEventListener("click", () =>
{
    currentIndex++;
    if (currentIndex < questions.length)
    {
        loadQuestion();
    }
    else
    {
        endQuiz();
    }
});
  
backBtn.addEventListener("click", () =>
{
    if (currentIndex > 0)
    {
        currentIndex--;
        loadQuestion();
    }
});
  
function updateProgressBar()
{
    const percent = ((currentIndex + 1) / questions.length) * 100;
    progressBar.style.width = percent + "%";
}
  
/**
 * Show quiz result
 */
function endQuiz()
{
    clearInterval(totalTimer);

    resultBox.classList.remove("d-none");

    quizContainer.innerHTML = "";
    timerBox.innerHTML = "";
    nextBtn.style.display = "none";
    backBtn.style.display = "none";
    progressBar.style.width = "100%";

    if (mode === "exam")
    {
        score = 0;
        questions.forEach(q =>
        {
            const user = userAnswers[q.id] || [];
            if (arraysEqual(user, q.correct_answer))
            {
                score++;
            }
        });
    }

    resultBox.innerHTML = `
        <div class="result">
            <div class="row">
                <div class="col text-start">
                    Used mode: <strong>${mode === 'exam' ? 'Final feedback' : 'Direct feedback'}</strong>
                </div>
                <div class="col text-end">
                    Score: <strong>${score}</strong> out of <strong>${questions.length}</strong>
                </div>
            </div>
        </div>
    `;

    if (mode === "exam")
    {
        let reviewHtmlNew = "<h3 class='mt-2'>Results Details</h3>";
        let currentQuestion = 1;

        questions.forEach(q =>
        {
            const user = userAnswers[q.id] || [];
            const isMultiple = q.correct_answer.length > 1;
            const bookmarkActive = bookmarks.includes(q.id);

            reviewHtmlNew += `
<div class="card mb-2">
    <div class="card-body">
        <div class="d-flex justify-content-between">
            <h6 class="card-subtitle text-body-secondary">Question ${currentQuestion} of ${questions.length}</h6>
            <button type="button" class="btn"  id="btnBookmark">
            ${bookmarkActive ? filledBookmark : emptyBookmark}
            </button>
        </div>
        <p class="card-text">
            ${q.question}<br />
            <i>${isMultiple ? `(best ${q.correct_answer.length} answers)` : `(best answer)` }</i>
        </p>
        <ul>`;

        q.options.map(opt =>
        {
            const isUserAnswer = user.includes(opt.id);
            const isCorrect = q.correct_answer.includes(opt.id);

            let className = "";

            if (isUserAnswer && isCorrect)
            {
                // Correct answer given
                className = "correct";
            }
            else if (isUserAnswer && !isCorrect)
            {
                // Wrong answer given
                className = "wrong";
            }
            else if (!isUserAnswer && isCorrect)
            {
                // Correct answer not given
                className = "missed";
            }

            reviewHtmlNew += `
                <li class="${className}">
                    <b>${opt.id}.</b> ${opt.text}
                </li>`
            }
        ).join("");

        reviewHtmlNew += `
        </ul>
    </div>
</div>`;

        currentQuestion++;
        });

        resultBox.innerHTML += reviewHtmlNew;
    }
}


// ------------------------------------------------
// Utility
// ------------------------------------------------
function shuffle(arr)
{
    for (let i = arr.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

function formatTime(sec)
{
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
}

function playTone(frequency, duration, type, volume)
{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);

    osc.onended = () => ctx.close();
}

function soundError()
{
    playTone(350, 180, "square", 180, 0.5);
    
    setTimeout(() =>
    {
        playTone(300, 220, "square", 0.6);
    }, 220);
}

function validateQuizJSON(json)
{
    let validationResult = null;

    if (!json || typeof json !== "object")
    {
        validationResult = "The JSON file is not valid.";
    }

    if (!Array.isArray(json.questions))
    {
        validationResult = "The file not contains questions.";
    }

    for (const q of json.questions)
    {
        if (typeof q.id === "undefined")
        {
            validationResult = "A question is without 'id'.";
        }

        if (!q.question)
        {
            validationResult = `Question ${q.id} is missing 'question'.`;
        }

        if (!Array.isArray(q.options))
        {
            validationResult = `Question ${q.id} has invalid 'options'.`;
        }

        if (!Array.isArray(q.correct_answer))
        {
             validationResult = `Question ${q.id} has an invalid 'correct_answer'.`;
        }

        for (const opt of q.options)
        {
            if (!opt.id || !opt.text)
            {
                validationResult = `An option in question ${q.id} is incomplete.`;
            }
        }
    }

    return validationResult;
}