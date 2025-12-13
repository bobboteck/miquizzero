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
const btnFeedback = document.getElementById("btnModeFeedback");
const btnExam = document.getElementById("btnModeExam");
const txtQuizMinute = document.getElementById("quizTimeInput");
const quizContainer = document.getElementById("quiz-container");
const nextBtn = document.getElementById("next-btn");
const resultBox = document.getElementById("result");
const timerBox = document.getElementById("timer");
const progressContainer = document.querySelector(".progress-container");
const progressBar = document.getElementById("progress-bar");
const backBtn = document.getElementById("back-btn");
const quizRandom = document.getElementById("quizRandom");
const fileUploadResult = document.getElementById("fileUploadResult");

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
            console.log("JSON load:", quizData);

            // Attivo i pulsanti
            btnFeedback.disabled = false;
            btnExam.disabled = false;

            //alert("File JSON caricato correttamente!");
            fileUploadResult.innerText = "Quiz file loaded";
        }
        catch (err)
        {
            //alert("Errore nel file JSON: " + err);
            fileUploadResult.innerText = "Error to load file: " + err;
        }
    };

    reader.readAsText(file);
});


/**
 * Run quiz in mode selected
 * @param {*} selectedMode 
 * @returns 
 */
function startQuiz(selectedMode)
{
    if (!quizData)
    {
        alert("Select a valid MiQuizZero file to start your Quiz!");
        return;
    }

    // Update the total time, on value selected by user
    totalTime = txtQuizMinute.value * 60;

    mode = selectedMode;

    document.getElementById("mode-selector").style.display = "none";
    nextBtn.style.display = "block";
    backBtn.style.display = "inline-block";
    progressContainer.style.display = "block";

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

function formatTime(sec)
{
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
}
  
// ------------ CARICA DOMANDA --------------
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
        <div class="questionBox">
            <div class="questionBookmark">
                <label>Question ${currentIndex + 1} of ${questions.length}</label>
                <button id="bookmark-btn" class="buttonBookmark">${bookmarkActive ? "★" : "☆"}</button>
            </div>

            <p>${q.question}</p>

            <p><i>
            ${isMultiple ? `(choose the best ${q.correct_answer.length} answers)` : `(choose the best answer)` }
            </i></p>

            ${q.options.map(opt => `
            <div class="questionItem">
                <div>
                    <input type="${inputType}" name="answer" value="${opt.id}">
                </div>
                <div>
                    <b>${opt.id}.</b> 
                </div>
                <div>
                    ${opt.text}
                </div>
            </div>
            `).join("")}

            <div id="feedback"></div>
        </div>
    `;

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
                //lockOptions();
                userAnswers[q.id] = [input.value];
                if (mode === "feedback") showFeedback();
                nextBtn.disabled = false;

            }
            else
            {
                const checked = [...document.querySelectorAll("input[name='answer']:checked")].map(i => i.value);

                userAnswers[q.id] = checked;

                nextBtn.disabled = checked.length === 0;

                if (mode === "feedback") showFeedback();
            }
        });
    });
}
  
function addBookmarkListener(qid)
{
    document.getElementById("bookmark-btn").addEventListener("click", () =>
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
  
// function lockOptions()
// {
//     document.querySelectorAll("input[name='answer']").forEach(inp => inp.disabled = true);
// }
  
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

    const correct = arraysEqual(user, q.correct_answer);

    if (correct)
    {
        score++;
        fb.innerHTML = `<div class="feedback correct">✓ Correct answer!</div>`;
    }
    else
    {
        fb.innerHTML = `
        <div class="feedback wrong">
            ✗ Wrong answer<br>
            Correct answer: <b>${q.correct_answer.join(", ")}</b>
        </div>`;
    }

    //lockOptions();
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
    const percent = (currentIndex / questions.length) * 100;
    progressBar.style.width = percent + "%";
}
  
/**
 * Show quiz result
 */
function endQuiz()
{
    clearInterval(totalTimer);

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
            Used mode: <strong>${mode === 'exam' ? 'Final feedback' : 'Direct feedback'}</strong><br><br>
            Score: <strong>${score}</strong> out of <strong>${questions.length}</strong>.
            <br><br>
            <h3>Domande segnate con ⭐:</h3>
            ${bookmarks.length === 0 ? "Nessuna" : bookmarks.join(", ")}
        </div>
    `;

    if (mode === "exam")
    {
        let reviewHtml = "<h3>Correzione dettagliata:</h3>";

        questions.forEach(q =>
        {
            const user = userAnswers[q.id] || [];

            reviewHtml += `
                <div class="reviewQuestion">
                    <p><b>${q.question}</b></p>
                    <ul>
            `;

            q.options.forEach(opt =>
            {
                const isUserAnswer = user.includes(opt.id);
                const isCorrect = q.correct_answer.includes(opt.id);

                let className = "";

                if (isUserAnswer && isCorrect)
                {
                    className = "correct";        // risposta data corretta
                }
                else if (isUserAnswer && !isCorrect)
                {
                    className = "wrong";          // risposta data sbagliata
                }
                else if (!isUserAnswer && isCorrect)
                {
                    className = "missed";         // risposta corretta non data
                }

                reviewHtml += `
                    <li class="${className}">
                        <b>${opt.id}.</b> ${opt.text}
                    </li>
                `;
            });

            reviewHtml += `
                    </ul>
                    <br>
                </div>
            `;
        });

        resultBox.innerHTML += reviewHtml;
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