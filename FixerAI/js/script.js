console.log("script loaded");

const supabaseUrl = "https://qoiefpivdhmrsatfpwwm.supabase.co";
const supabaseKey = "sb_publishable_J8w9lkhDrxFBv-3jQx95BA_BHmEgA5A";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// ---------- SHARED UTILS ----------
function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerText = msg;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2500);
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    });
}


// ---------- SIGNUP ----------
document.getElementById("signupBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    const { error: profileError } = await supabaseClient
        .from("profiles")
        .upsert({
            id: data.user.id,
            role: role
        });

    if (profileError) {
        console.error("Profile save error:", profileError);
    }

    alert("Account created! Please verify email.");
    window.location.href = "login.html";
});


// ---------- LOGIN ----------
document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const roleInput = document.querySelector('input[name="role"]:checked');
    const selectedRole = roleInput ? roleInput.value : null;

    if (!selectedRole) {
        alert("Please select a role (User or Worker)");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    const userId = data.user.id;
    const { error: updateError } = await supabaseClient
        .from("profiles")
        .upsert({
            id: userId,
            email: data.user.email,
            role: selectedRole,
            name: email.split("@")[0]
        });

    // Redirect based on SELECTION
    if (selectedRole === "worker") {
        window.location.href = "worker_dashboard.html";
    } else {
        window.location.href = "user_dashboard.html";
    }
});


// ---------- USER DASHBOARD ----------

// 1. Submit Service Request
const submitRequestBtn = document.getElementById("submitRequest");

if (submitRequestBtn) {
    submitRequestBtn.addEventListener("click", async () => {
        const service = document.getElementById("serviceType").value;
        const description = document.getElementById("description").value;
        const location = document.getElementById("location").value;
        const msg = document.getElementById("msg");

        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            msg.style.color = "red";
            msg.innerText = "You must be logged in.";
            return;
        }

        if (!description || !location) {
            msg.style.color = "red";
            msg.innerText = "Please fill in all fields.";
            return;
        }

        const { error } = await supabaseClient.from("service_requests").insert({
            user_id: user.id,
            service_type: service,
            description: description,
            location: location,
            status: 'open'
        });

        if (error) {
            console.error("Service Request Error:", error);
            msg.style.color = "red";
            msg.innerText = error.message;
        } else {
            msg.style.color = "green";
            msg.innerText = "Request submitted successfully!";

            // Clear inputs
            document.getElementById("description").value = "";
            document.getElementById("location").value = "";

            // Refresh list
            loadUserRequests(user.id);

            // Show toast
            showToast("Request submitted successfully!");
        }
    });
}

// 2. Load User Requests
async function initUserDashboard() {
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData.user) {
        window.location.href = "login.html";
        return;
    }
    loadUserRequests(authData.user.id);
}

async function loadUserRequests(userId) {
    const userRequestsList = document.getElementById("userRequestsList");
    if (!userRequestsList) return;

    // Show loading state
    userRequestsList.innerHTML = `
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
    `;

    const { data: requests, error } = await supabaseClient
        .from("service_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        userRequestsList.innerHTML = "<li>Error loading requests</li>";
        console.error(error);
        return;
    }

    if (!requests || requests.length === 0) {
        userRequestsList.innerHTML = "<li style='text-align:center; padding: 20px; color: #64748b;'>No requests yet. Create one!</li>";
        return;
    }

    userRequestsList.innerHTML = "";
    requests.forEach(req => {
        let statusClass = "status-pending";
        if (req.status === "accepted") statusClass = "status-accepted";
        if (req.status === "completed") statusClass = "status-completed";

        const li = document.createElement("li");
        li.innerHTML = `
            <b>${req.service_type}</b>
            <span class="status ${statusClass}">${req.status}</span>
            <br>
            <span style="color:#475569; font-size: 0.9em;">
                ${req.description}
            </span>
            <br>
            <small style="color:#94a3b8;">📍 ${req.location}</small>
        `;
        userRequestsList.appendChild(li);
    });
}

// 3. Toggle Sidebar
const toggleBtn = document.getElementById("toggleRequests");
const requestsContainer = document.getElementById("myRequestsContainer");
const arrowBtn = document.getElementById("arrowBtn");

if (toggleBtn && requestsContainer) {
    toggleBtn.addEventListener("click", () => {
        requestsContainer.classList.toggle("hidden");

        // Rotate arrow
        if (arrowBtn) {
            arrowBtn.style.transform = requestsContainer.classList.contains("hidden")
                ? "rotate(180deg)"
                : "rotate(0deg)";
        }
    });
}

// Initialize User Dashboard if on that page
if (document.getElementById("userRequestsList")) {
    initUserDashboard();
}


// ---------- WORKER DASHBOARD ----------
const requestsList = document.getElementById("requestsList");
if (requestsList) {
    initWorkerDashboard();
}

async function initWorkerDashboard() {
    const { data: authData } = await supabaseClient.auth.getUser();

    if (!authData.user) {
        window.location.href = "login.html";
        return;
    }

    loadWorkerRequests();
    loadWorkerAcceptedJobs(authData.user.id);
}

async function loadWorkerRequests() {
    const requestsList = document.getElementById("requestsList");
    if (!requestsList) return;

    const { data: requests, error } = await supabaseClient
        .from("service_requests")
        .select("*")
        .eq("status", "open");

    if (error) {
        requestsList.innerHTML = "<li>Error loading requests</li>";
        return;
    }

    if (!requests.length) {
        requestsList.innerHTML = "<li>No open requests available</li>";
        return;
    }

    requestsList.innerHTML = "";
    requests.forEach((req) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <b>${req.service_type}</b> - ${req.location}
            <br>${req.description}
            <br>
            <button onclick="acceptJob('${req.id}')">Accept</button>
            <hr>
        `;
        requestsList.appendChild(li);
    });
}

// Make accessible globally
window.acceptJob = async function (requestId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("You must be logged in to accept a job");
        return;
    }

    const { error } = await supabaseClient
        .from("service_requests")
        .update({
            status: "accepted",
            worker_id: user.id
        })
        .eq("id", requestId);

    if (error) {
        console.error("Error accepting job:", error);
        alert("Error accepting job: " + error.message);
    } else {
        alert("Job accepted!");
        location.reload();
    }
};

async function loadWorkerAcceptedJobs(workerId) {
    const myJobsList = document.getElementById("myJobsList");
    if (!myJobsList) return;

    const { data: jobs, error } = await supabaseClient
        .from("service_requests")
        .select("*")
        .eq("worker_id", workerId)
        .eq("status", "accepted");

    if (error) {
        myJobsList.innerHTML = "<li>Error loading accepted jobs</li>";
        return;
    }

    if (!jobs || jobs.length === 0) {
        myJobsList.innerHTML = "<li>No accepted jobs yet</li>";
        return;
    }

    myJobsList.innerHTML = "";
    jobs.forEach(job => {
        const li = document.createElement("li");
        li.innerHTML = `
            <b>${job.service_type}</b><br>
            ${job.description}<br>
            📍 ${job.location}<br><br>
            <button onclick="completeJob('${job.id}')">Mark as Completed</button>
            <hr>
        `;
        myJobsList.appendChild(li);
    });
}

window.completeJob = async function (jobId) {
    const { error } = await supabaseClient
        .from("service_requests")
        .update({
            status: "completed",
            completed_at: new Date()
        })
        .eq("id", jobId);

    if (error) {
        alert("Error completing job");
        console.error(error);
    } else {
        alert("Job marked as completed");
        location.reload();
    }
};


// ---------- THEME TOGGLE ----------
const themeBtn = document.getElementById("themeToggle");
if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");

        // Update Icon
        if (isDark) {
            themeBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>`; // Sun Icon
        } else {
            themeBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>`; // Moon Icon
        }
    });
}

// ---------- NAV LINKS (WORKER TABS) ----------
const navLinks = document.querySelectorAll('.nav-links a');
const views = {
    'Jobs': document.getElementById('view-jobs'),
    'Earnings': document.getElementById('view-earnings'),
    'Profile': document.getElementById('view-profile'),
    'Services': document.getElementById('view-services'),
    'Native': document.getElementById('view-native')
};

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const text = link.innerText;

        // If it's a known tab, switch view
        if (views[text]) {
            // Hide all
            Object.values(views).forEach(view => {
                if (view) view.classList.add('hidden');
            });
            // Show selected
            views[text].classList.remove('hidden');
        } else {
            // Fallback for User Dashboard links (Services, Native, Beauty)
            showToast(`Navigating to ${text}... (Demo)`);
        }
    });
});

// ---------- PROFILE ACTIONS ----------
const changePhotoBtn = document.getElementById('changePhotoBtn');
const photoInput = document.getElementById('photoInput');
const profileImage = document.getElementById('profileImage');
const saveProfileBtn = document.getElementById('saveProfileBtn');

if (changePhotoBtn && photoInput && profileImage) {
    // 1. Trigger File Input
    changePhotoBtn.addEventListener('click', () => {
        photoInput.click();
    });

    // 2. Handle File Selection & Preview
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                profileImage.style.backgroundImage = `url('${event.target.result}')`;
                profileImage.innerHTML = ''; // Remove emoji
            };
            reader.readAsDataURL(file);
        }
    });

    // 3. Save Changes (Demo)
    saveProfileBtn.addEventListener('click', () => {
        // Here you would typically send data to Supabase
        showToast('Profile updated successfully!');
    });
}

// ---------- ADD SKILL ACTION ----------
const addSkillBtn = document.getElementById('addSkillBtn');
const skillsContainer = document.getElementById('skillsContainer');

if (addSkillBtn && skillsContainer) {
    addSkillBtn.addEventListener('click', () => {
        const newSkill = prompt("Enter a new skill (e.g., Electrician):");
        if (newSkill && newSkill.trim() !== "") {
            // Create new skill tag
            const span = document.createElement('span');
            span.className = 'status status-accepted';
            span.innerText = newSkill.trim();

            // Insert before the Add button
            skillsContainer.insertBefore(span, addSkillBtn);
        }
    });
}

