// Enter your firebase config below
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    databaseURL: "SUA_DATABASE_URL",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const questionsList = document.getElementById("questions-list");
const questionForm = document.getElementById("question-form");
const questionInput = document.getElementById("question-input");

let sessionUUID = localStorage.getItem("sessionUUID");
if (!sessionUUID) {
    sessionUUID = crypto.randomUUID();
    localStorage.setItem("sessionUUID", sessionUUID);
}

questionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const questionText = questionInput.value.trim();
    if (questionText) {
        const questionRef = db.ref("questions").push();
        questionRef.set({
            text: questionText,
            responses: {},
            timestamp: Date.now(),
            uuid: sessionUUID
        }).then(() => {
            questionInput.value = "";
        }).catch((error) => {
            console.error("Error saving question:", error);
        });
    }
});

function createResponseElement(response, timestamp) {
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response-item");
    
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString();
    
    responseDiv.innerHTML = `
        <p class="response-text">${response}</p>
        <small class="response-time">Answered on: ${formattedDate}</small>
    `;
    
    return responseDiv;
}

function createQuestionElement(key, question, currentUserId) {
    const li = document.createElement("li");
    li.classList.add("question-item");
    
    const date = new Date(question.timestamp);
    const formattedDate = date.toLocaleString();

    li.innerHTML = `
        <div class="question-header">
            <p><strong>Question:</strong> ${question.text}</p>
            ${question.uuid === sessionUUID ? `<button class="edit-button" data-key="${key}">Edit your question</button>` : ''}
        </div>
        <small class="question-time">Asked on: ${formattedDate}</small>
        <div class="responses-container"></div>
        <div class="response-form">
            <textarea class="response-input" placeholder="Enter your answer..." data-key="${key}"></textarea>
            <button class="response-button" data-key="${key}">Reply</button>
        </div>
    `;
    
    const responsesContainer = li.querySelector('.responses-container');
    
    if (question.responses) {
        Object.entries(question.responses)
            .sort(([, a], [, b]) => b.timestamp - a.timestamp)
            .forEach(([, responseData]) => {
                const responseElement = createResponseElement(responseData.text, responseData.timestamp);
                responsesContainer.appendChild(responseElement);
            });
    }
    
    return li;
}

function sortQuestionsByTimestamp(questions) {
    return Object.entries(questions)
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
        }), {});
}

function updateQuestionsList(snapshot) {
    const data = snapshot.val();
    if (!data) {
        questionsList.innerHTML = "<p>No questions yet...</p>";
        return;
    }

    const sortedQuestions = sortQuestionsByTimestamp(data);
    questionsList.innerHTML = "";
    
    Object.entries(sortedQuestions).forEach(([key, question]) => {
        const questionElement = createQuestionElement(key, question);
        questionsList.appendChild(questionElement);
    });
}

db.ref("questions").on("value", updateQuestionsList);

questionsList.addEventListener("click", (event) => {
    if (event.target.classList.contains("response-button")) {
        const questionKey = event.target.getAttribute("data-key");
        const responseInput = event.target.parentElement.querySelector(".response-input");
        const responseText = responseInput.value.trim();

        if (responseText) {
            const newResponseRef = db.ref(`questions/${questionKey}/responses`).push();
            
            newResponseRef.set({
                text: responseText,
                timestamp: Date.now()
            }).then(() => {
                responseInput.value = "";
            }).catch((error) => {
                console.error("Error saving answer:", error);
            });
        }
    }
});

questionsList.addEventListener("click", (event) => {
    if (event.target.classList.contains("edit-button")) {
        const questionKey = event.target.getAttribute("data-key");
        const questionElement = event.target.closest(".question-item");
        const questionText = questionElement.querySelector("p strong").nextSibling.textContent.trim();

        const newQuestionText = prompt("Edit your question:", questionText);
        if (newQuestionText && newQuestionText !== questionText) {
            db.ref(`questions/${questionKey}`)
                .update({ text: newQuestionText })
                .then(() => {
                    console.log("Question updated successfully.");
                })
                .catch((error) => {
                    console.error("Error updating question:", error);
                });
        }
    }
});