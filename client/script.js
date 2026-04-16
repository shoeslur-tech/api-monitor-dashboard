document.addEventListener("submit", (event) => {
  event.preventDefault();
  console.log("Blocked a submit event from:", event.target);
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a");
  if (target) {
    console.log("Clicked:", target.outerHTML);
  }
});

const monitorForm = document.getElementById("monitorForm");
const monitorList = document.getElementById("monitorList");
const refreshButton = document.getElementById("refreshButton");

const API_BASE_URL = "https://api-monitor-dashboard-backend.onrender.com/api/monitors";

const previousStatuses = {};
const alertContainer = document.getElementById("alertContainer");

function showAlert(message) {
  console.log("showAlert called:", message);

  const alertBox = document.createElement("div");
  alertBox.className = "alert";
  alertBox.textContent = message;

  alertBox.style.position = "fixed";
  alertBox.style.top = "20px";
  alertBox.style.right = "20px";
  alertBox.style.zIndex = "9999";

  document.body.appendChild(alertBox);
}
async function fetchMonitors() {
  try {
    const response = await fetch(API_BASE_URL);
    const monitors = await response.json();

    monitors.forEach((monitor) => {
  const previousStatus = previousStatuses[monitor.id];
  const currentStatus = monitor.status;

  if (previousStatus && previousStatus !== "DOWN" && currentStatus === "DOWN") {
    showAlert(`⚠️ Monitor "${monitor.name}" is DOWN`);
  }

  previousStatuses[monitor.id] = currentStatus;
});

    monitorList.innerHTML = "";

    if (monitors.length === 0) {
      monitorList.innerHTML = "<p>No monitors yet.</p>";
      return;
    }

    monitors.forEach((monitor) => {
      const card = document.createElement("div");
card.className = "monitor-card";

const latestHistory = monitor.history[monitor.history.length - 1];

const totalChecks = monitor.history.length;

const upChecks = monitor.history.filter(
  (check) => check.status === "UP"
).length;

const uptime =
  totalChecks > 0
    ? ((upChecks / totalChecks) * 100).toFixed(0)
    : 0;

const historyChart = monitor.history
  .slice()
  .reverse()
  .map((item) => {
    const date = new Date(item.checkedAt).toLocaleString();

    return `<span class="chart-bar ${item.status.toLowerCase()}" title="${item.status} - ${date}"></span>`;
  })
  .join("");

card.innerHTML = `
  <h3>${monitor.name}</h3>
  <p><strong>URL:</strong> ${monitor.url}</p>
  <p>
    <strong>Status:</strong>
    <span class="status ${monitor.status.toLowerCase()}">${monitor.status}</span>
  </p>
  <p><strong>Uptime:</strong> ${uptime}%</p>
  <p><strong>Recent checks:</strong></p>
    <div class="history-chart">${historyChart}</div>
  <p><strong>Latest response time:</strong> ${
    latestHistory ? latestHistory.responseTimeMs + " ms" : "N/A"
  }</p>
  <p><strong>Latest error:</strong> ${
    latestHistory && latestHistory.errorMessage
      ? latestHistory.errorMessage
      : "None"
  }</p>
  <p><strong>Recent history:</strong></p>
  <div>
    ${
      monitor.history.length > 0
        ? monitor.history
            .slice()
            .reverse()
            .map(
              (item) => `
                <div class="history-item">
                  ${item.checkedAt} - ${item.status} - ${item.responseTimeMs} ms
                  ${item.errorMessage ? `- ${item.errorMessage}` : ""}
                </div>
              `
            )
            .join("")
        : "<div class='history-item'>No history yet</div>"
    }
  </div>
    <button type="button" class="edit-btn" data-id="${monitor.id}">Edit</button>
    <button type="button" class="delete-btn" data-id="${monitor.id}">Delete</button>
`;

const editButton = card.querySelector(".edit-btn");
editButton.addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const newName = prompt("Enter new name:", monitor.name);
  const newUrl = prompt("Enter new URL:", monitor.url);

  if (!newName || !newUrl) return;

  try {
    await fetch(`${API_BASE_URL}/${monitor.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: newName,
        url: newUrl
      })
    });

    await fetchMonitors();
  } catch (error) {
    alert("Failed to update monitor");
  }
});

const deleteButton = card.querySelector(".delete-btn");
deleteButton.addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const confirmed = confirm("Are you sure you want to delete this monitor?");
  if (!confirmed) return;

  try {
    await fetch(`${API_BASE_URL}/${monitor.id}`, {
      method: "DELETE"
    });

    delete previousStatuses[monitor.id];
    await fetchMonitors();
  } catch (error) {
    alert("Failed to delete monitor");
  }
});

monitorList.appendChild(card);
    }
  );
    
  } catch (error) {
    monitorList.innerHTML = `<p>Error loading monitors: ${error.message}</p>`;
  }
}

monitorForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nameInput = document.getElementById("name");
  const urlInput = document.getElementById("url");

  const newMonitor = {
    name: nameInput.value,
    url: urlInput.value
  };

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newMonitor)
    });

    if (!response.ok) {
      throw new Error("Failed to add monitor");
    }

    nameInput.value = "";
    urlInput.value = "";

    await fetchMonitors();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

refreshButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  fetchMonitors();
});

fetchMonitors();
setInterval(fetchMonitors, 5000);