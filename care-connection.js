const roleDetails = {
  physician: {
    name: "Dr. T",
    label: "Geriatrician",
    initials: "DT",
    title: "Dr. T's open handoffs",
    subtitle: "Follow work across every facility without another status call.",
    stats: [
      ["Open handoffs", 7],
      ["Not acknowledged", 2],
      ["Due today", 3],
      ["Completed this week", 34],
    ],
  },
  nurse: {
    name: "Alison Johnson",
    label: "Clinical care coordinator",
    initials: "AJ",
    title: "Alison's facility work",
    subtitle: "Accept, assign, and close the requests that need action today.",
    stats: [
      ["New from Dr. T", 3],
      ["Needs assignment", 2],
      ["Due today", 2],
      ["Completed this week", 18],
    ],
  },
  admin: {
    name: "Renee Endicott",
    label: "Practice administrator",
    initials: "RE",
    title: "Facility handoff health",
    subtitle: "Monitor ownership, acknowledgement, and workload across the network.",
    stats: [
      ["Incoming requests", 34],
      ["In progress", 5],
      ["Overdue", 2],
      ["Unassigned", 1],
    ],
  },
};

let handoffs = [
  { id: "CR-1087", facility: "Oakwood Senior Living", patient: "Patient 0184", task: "Perform dressing change within 48 hours and record confirmation", owner: "Unassigned", due: "Today", status: "new", acceptedAt: "", completedAt: "", evidence: null },
  { id: "CR-1082", facility: "Lakeside Care Center", patient: "Patient 0062", task: "Complete care-team-defined follow-up and send confirmation", owner: "Sarah Miller, RN", due: "Today", status: "in-progress", acceptedAt: "Today, 9:18 AM", completedAt: "", evidence: null },
  { id: "CR-1079", facility: "Sunrise Rehabilitation", patient: "Patient 0141", task: "Record completion evidence for the assigned action", owner: "Facility nurse", due: "Yesterday", status: "overdue" },
  { id: "CR-1077", facility: "Oakwood Senior Living", patient: "Patient 0098", task: "Complete ordered follow-up within the defined timeframe", owner: "Nurse administrator", due: "Tomorrow", status: "accepted" },
  { id: "CR-1070", facility: "Lakeside Care Center", patient: "Patient 0217", task: "Return completion confirmation to Dr. T's team", owner: "Facility nurse", due: "Oct 8", status: "in-progress" },
  { id: "CR-1068", facility: "Meadowbrook Residence", patient: "Patient 0031", task: "Complete assigned monitoring action and document outcome", owner: "Sarah Miller, RN", due: "Oct 9", status: "accepted" },
  { id: "CR-1061", facility: "Cedar Grove Care", patient: "Patient 0115", task: "Upload confirmation for the completed care-team action", owner: "Facility nurse", due: "Oct 10", status: "accepted" },
  { id: "CR-1058", facility: "Prairie View Nursing Center", patient: "Patient 0274", task: "Confirm assigned follow-up was completed on time", owner: "Facility nurse", due: "Today", status: "in-progress" },
  { id: "CR-1055", facility: "Sunflower Senior Care", patient: "Patient 0306", task: "Accept and assign the care-team-defined action", owner: "Nurse administrator", due: "Tomorrow", status: "accepted" },
  { id: "CR-1051", facility: "Flint Hills Care Center", patient: "Patient 0168", task: "Assign named ownership for the required follow-up", owner: "Unassigned", due: "Today", status: "new" },
  { id: "CR-1047", facility: "Kaw River Nursing & Rehabilitation", patient: "Patient 0249", task: "Document completion and close the care episode", owner: "Sarah Miller, RN", due: "Oct 11", status: "accepted" },
  { id: "CR-1042", facility: "Blue Valley Senior Living", patient: "Patient 0341", task: "Send completed-action confirmation to Dr. T's team", owner: "Facility nurse", due: "Oct 12", status: "in-progress" },
];

let currentRole = "physician";

const list = document.querySelector("#handoff-list");
const search = document.querySelector("#handoff-search");
const filter = document.querySelector("#status-filter");
const dialog = document.querySelector("#handoff-dialog");
const handoffForm = document.querySelector("#handoff-form");
const completionDialog = document.querySelector("#completion-dialog");
const completionForm = document.querySelector("#completion-form");
const detailDialog = document.querySelector("#detail-dialog");
const toast = document.querySelector("#toast");
const aiNote = document.querySelector("#ai-note");
const aiResult = document.querySelector("#ai-result");
let aiDraft = null;
let selectedHandoffId = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  return {
    new: "New",
    accepted: "Accepted",
    "in-progress": "In progress",
    overdue: "Overdue",
    completed: "Completed",
  }[status] || status;
}

function statusClass(status) {
  return status === "in-progress" ? "progress" : status;
}

function initials(name) {
  if (name === "Unassigned") return "!";
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function actionFor(handoff) {
  if (handoff.status === "new") return currentRole === "physician" ? "Remind" : "Accept";
  if (handoff.owner === "Unassigned") return "Assign";
  if (handoff.status === "completed") return "View";
  return currentRole === "physician" ? "Details" : "Complete";
}

function filteredHandoffs() {
  const query = search.value.trim().toLowerCase();
  const selectedStatus = filter.value;
  return handoffs.filter((handoff) => {
    const matchesQuery = !query || [
      handoff.id, handoff.facility, handoff.patient, handoff.task, handoff.owner,
    ].join(" ").toLowerCase().includes(query);
    return matchesQuery && (selectedStatus === "all" || handoff.status === selectedStatus);
  });
}

function renderHandoffs() {
  const visible = filteredHandoffs();
  list.innerHTML = visible.length ? visible.map((handoff) => `
    <article class="handoff-row">
      <div><b>${escapeHtml(handoff.facility)}</b><small>${escapeHtml(handoff.id)} · ${escapeHtml(handoff.patient)}</small></div>
      <div><b>${escapeHtml(handoff.task)}</b><small>Closed when: action documented and confirmation returned</small></div>
      <div class="owner-chip ${handoff.owner === "Unassigned" ? "orphan" : ""}">
        <i>${initials(handoff.owner)}</i><span>${escapeHtml(handoff.owner)}</span>
      </div>
      <div><span class="status status-${statusClass(handoff.status)}">${statusLabel(handoff.status)}</span><small>Due ${escapeHtml(handoff.due)}</small></div>
      <button class="row-action" data-action="${actionFor(handoff).toLowerCase()}" data-id="${handoff.id}">${actionFor(handoff)}</button>
    </article>`).join("") : `<div class="empty-state">No handoffs match this view.</div>`;
  document.querySelector("#nav-count").textContent = handoffs.filter((item) => item.status !== "completed").length;
}

function renderRole(role) {
  currentRole = role;
  const details = roleDetails[role];
  document.querySelector("#workspace-title").textContent = details.title;
  document.querySelector("#workspace-subtitle").textContent = details.subtitle;
  document.querySelector("#role-name").textContent = details.name;
  document.querySelector("#role-label").textContent = details.label;
  document.querySelector("#role-initials").textContent = details.initials;
  document.querySelector("#stats").innerHTML = details.stats.map(([label, value]) => `
    <article class="stat-card"><small>${label}</small><strong>${value}</strong></article>`).join("");
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === role);
  });
  document.querySelector("#new-handoff").hidden = role === "nurse";
  renderHandoffs();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function inferFacility(note) {
  const facilities = [
    "Oakwood Senior Living",
    "Lakeside Care Center",
    "Green Valley Nursing",
    "Sunrise Rehabilitation",
    "Prairie View Nursing Center",
    "Sunflower Senior Care",
    "Flint Hills Care Center",
    "Kaw River Nursing & Rehabilitation",
    "Meadowlark Skilled Nursing",
    "Heartland Care Center",
    "Blue Valley Senior Living",
    "Prairie Winds Nursing Home",
  ];
  return facilities.find((facility) => note.includes(facility.split(" ")[0].toLowerCase()))
    || "Oakwood Senior Living";
}

function inferOwner(note) {
  if (/(family|appointment|transport|schedule|logistics)/.test(note)) return "Facility coordinator";
  if (/(administrator|admin|documentation|paperwork|form)/.test(note)) return "Nurse administrator";
  if (/(dressing|wound|nurse|send|confirm|monitor|follow up|information)/.test(note)) return "Sarah Miller, RN";
  return "Unassigned";
}

function buildAiDraft(rawNote) {
  const normalized = rawNote.trim().replace(/\s+/g, " ");
  const note = normalized.toLowerCase();
  const due = note.includes("today") ? "Today" : note.includes("tomorrow") ? "Tomorrow" : "Within 2 days";
  const urgency = /(urgent|today|overdue|immediately)/.test(note) ? "High operational priority" : "Routine";
  const owner = inferOwner(note);
  const action = normalized
    .replace(/^please\s+/i, "")
    .replace(/\s+by\s+(today|tomorrow).*$/i, "")
    .replace(/\.$/, "");

  return {
    facility: inferFacility(note),
    owner,
    due,
    urgency,
    task: action.charAt(0).toUpperCase() + action.slice(1),
    done: "The care-team-defined action is documented and confirmation is sent to Dr. T's team",
  };
}

function renderAiDraft() {
  document.querySelector("#ai-facility").textContent = aiDraft.facility;
  document.querySelector("#ai-owner").textContent = aiDraft.owner;
  document.querySelector("#ai-due").textContent = aiDraft.due;
  document.querySelector("#ai-urgency").textContent = aiDraft.urgency;
  document.querySelector("#ai-task").textContent = aiDraft.task;
  document.querySelector("#ai-done").textContent = aiDraft.done;

  const checks = [
    ["Sender identified", false],
    ["Receiver identified", false],
    [aiDraft.owner === "Unassigned" ? "Owner missing" : "Owner suggested", aiDraft.owner === "Unassigned"],
    ["Due date suggested", false],
    ["Completion defined", false],
  ];
  document.querySelector("#ai-checks").innerHTML = checks.map(([label, warning]) =>
    `<span class="ai-check ${warning ? "warning" : ""}">${warning ? "⚠" : "✓"} ${label}</span>`,
  ).join("");
  aiResult.hidden = false;
  aiResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateHandoff(id, action) {
  const handoff = handoffs.find((item) => item.id === id);
  if (!handoff) return;

  if (action === "accept") {
    handoff.status = "accepted";
    handoff.acceptedAt = new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date());
    showToast(`${handoff.facility} accepted responsibility.`);
  } else if (action === "assign") {
    handoff.owner = "Sarah Miller, RN";
    handoff.status = "in-progress";
    handoff.acceptedAt ||= "Accepted before assignment";
    showToast("Assigned to Sarah Miller, RN.");
  } else if (action === "complete") {
    openCompletion(handoff);
  } else if (action === "remind") {
    showToast(`Reminder sent to ${handoff.facility}.`);
  } else if (action === "details" || action === "view") {
    openDetails(handoff);
  } else {
    showToast(`${handoff.id}: ${handoff.task}`);
  }
  renderHandoffs();
}

function lifecycleFor(handoff) {
  const completed = handoff.status === "completed";
  const accepted = handoff.status !== "new";
  const assigned = accepted && handoff.owner !== "Unassigned";
  return [
    ["Sent", true],
    ["Accepted", accepted],
    ["Owner assigned", assigned],
    ["Confirmed", completed],
  ];
}

function openCompletion(handoff) {
  selectedHandoffId = handoff.id;
  document.querySelector("#completion-id").textContent = handoff.id;
  document.querySelector("#completion-facility").textContent = handoff.facility;
  document.querySelector("#completion-owner").textContent = handoff.owner;
  document.querySelector("#completion-due").textContent = handoff.due;
  completionForm.elements.completedBy.value = handoff.owner === "Unassigned" ? "" : handoff.owner;
  document.querySelector("#completion-lifecycle").innerHTML = lifecycleFor(handoff)
    .map(([label, done]) => `<span class="${done ? "done" : ""}">${label}</span>`)
    .join("");
  completionDialog.showModal();
}

function openDetails(handoff) {
  document.querySelector("#detail-title").textContent = `${handoff.id} · ${handoff.facility}`;
  document.querySelector("#detail-task").textContent = handoff.task;
  document.querySelector("#detail-meta").innerHTML = [
    ["Patient", handoff.patient],
    ["Owner", handoff.owner],
    ["Due", handoff.due],
    ["Status", statusLabel(handoff.status)],
    ["Accepted", handoff.acceptedAt || "Not yet accepted"],
    ["Completed", handoff.completedAt || "Not yet completed"],
  ].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const evidence = document.querySelector("#detail-evidence");
  if (handoff.evidence) {
    evidence.classList.remove("empty");
    evidence.innerHTML = `<b>${escapeHtml(handoff.evidence.type)}</b><br>${escapeHtml(handoff.evidence.confirmation)}<br><small>Attested by ${escapeHtml(handoff.evidence.completedBy)}</small>`;
  } else {
    evidence.classList.add("empty");
    evidence.textContent = "Completion evidence has not been recorded. This handoff cannot be closed yet.";
  }
  detailDialog.showModal();
}

document.addEventListener("click", (event) => {
  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) document.querySelector(scrollButton.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });

  const roleButton = event.target.closest("[data-role]");
  if (roleButton) renderRole(roleButton.dataset.role);

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) updateHandoff(actionButton.dataset.id, actionButton.dataset.action);

  if (event.target.closest("[data-preview-accept]")) {
    event.target.closest("[data-preview-accept]").textContent = "Accepted ✓";
    event.target.closest("[data-preview-accept]").disabled = true;
    showToast("Oakwood accepted the handoff. Responsibility is now explicit.");
  }
});

completionForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!completionForm.reportValidity()) return;
  const handoff = handoffs.find((item) => item.id === selectedHandoffId);
  if (!handoff) return;
  const data = new FormData(completionForm);
  handoff.status = "completed";
  handoff.completedAt = new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date());
  handoff.evidence = {
    type: data.get("evidenceType"),
    completedBy: data.get("completedBy"),
    confirmation: data.get("confirmation"),
  };
  completionDialog.close();
  completionForm.reset();
  renderHandoffs();
  showToast(`Evidence recorded. ${handoff.id} is closed and visible to Dr. T's team.`);
});

search.addEventListener("input", renderHandoffs);
filter.addEventListener("change", renderHandoffs);

document.querySelector("#ai-example").addEventListener("click", () => {
  aiNote.value = "Oakwood should perform the dressing change within 48 hours and send confirmation to Dr. T's team.";
  aiNote.focus();
});

document.querySelector("#generate-handoff").addEventListener("click", () => {
  if (!aiNote.value.trim()) {
    aiNote.focus();
    showToast("Enter an action already defined by the care team.");
    return;
  }
  aiDraft = buildAiDraft(aiNote.value);
  renderAiDraft();
});

document.querySelector("#edit-ai-draft").addEventListener("click", () => {
  aiNote.focus();
  aiResult.hidden = true;
});

document.querySelector("#create-ai-handoff").addEventListener("click", () => {
  if (!aiDraft) return;
  handoffForm.elements.facility.value = aiDraft.facility;
  handoffForm.elements.patient.value = "Patient 0201";
  handoffForm.elements.task.value = aiDraft.task;
  handoffForm.elements.owner.value = aiDraft.owner;
  handoffForm.elements.done.value = aiDraft.done;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (aiDraft.due === "Today" ? 0 : aiDraft.due === "Tomorrow" ? 1 : 2));
  handoffForm.elements.due.value = dueDate.toISOString().slice(0, 10);
  dialog.showModal();
});

document.querySelector("#new-handoff").addEventListener("click", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  handoffForm.elements.due.value = tomorrow.toISOString().slice(0, 10);
  dialog.showModal();
});

handoffForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!handoffForm.reportValidity()) return;

  const data = new FormData(handoffForm);
  handoffs.unshift({
    id: `CR-${1088 + handoffs.length}`,
    facility: data.get("facility"),
    patient: data.get("patient"),
    task: data.get("task"),
    owner: data.get("owner"),
    due: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
      .format(new Date(`${data.get("due")}T12:00:00`)),
    status: data.get("owner") === "Unassigned" ? "new" : "accepted",
    acceptedAt: data.get("owner") === "Unassigned" ? "" : "Assigned when created",
    completedAt: "",
    evidence: null,
  });
  dialog.close();
  handoffForm.reset();
  filter.value = "all";
  search.value = "";
  renderHandoffs();
  showToast("Handoff created and sent to the facility.");
});

renderRole("physician");
