document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === "undefined") return;

  // Initialize Map
  const fishersCenter = [39.9568, -85.9948];
  const map = L.map("map").setView(fishersCenter, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Initial Reports Data
  let reports = [
    {
      id: 1,
      location: [39.9568, -85.9948],
      title: "Pothole on 116th St",
      address: "116th St & Lantern Rd",
      category: "Pothole / road damage",
      description: "Large pothole forming near the intersection, getting worse after rain.",
      severity: "High",
      status: "Reported"
    },
    {
      id: 2,
      location: [39.9720, -86.0020],
      title: "Fallen Tree on Geist Rd",
      address: "Geist Rd near Fall Creek",
      category: "Fallen tree",
      description: "Tree came down across the road during last storm, blocking one lane.",
      severity: "Critical",
      status: "In progress"
    },
    {
      id: 3,
      location: [39.9492, -86.0235],
      title: "Flooding near Saxony",
      address: "Saxony Lake, Fishers",
      category: "Flooding / drainage",
      description: "Street flooding after heavy rain making the road impassable.",
      severity: "Medium",
      status: "Reported"
    }
  ];

  let markers = {};

  // Render Markers and Sidebar List
  function renderApp() {
    // Clear existing markers
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};

    const reportsList = document.getElementById("reportsList");
    const reportsCount = document.getElementById("reportsCount");
    const searchQuery = document.getElementById("searchInput").value.toLowerCase();

    reportsList.innerHTML = "";

    const filteredReports = reports.filter(r => 
      r.title.toLowerCase().includes(searchQuery) ||
      r.address.toLowerCase().includes(searchQuery) ||
      r.description.toLowerCase().includes(searchQuery)
    );

    reportsCount.textContent = `${filteredReports.length} issues in Fishers`;

    filteredReports.forEach(report => {
      // Add Marker to Map
      const marker = L.marker(report.location).addTo(map)
        .bindPopup(`<b>${report.title}</b><br>${report.description}`);
      markers[report.id] = marker;

      // Render Sidebar Card
      const card = document.createElement("div");
      card.className = "report-card";
      card.innerHTML = `
        <button class="delete-btn" data-id="${report.id}" title="Delete Report">×</button>
        <div class="report-card-top">
          <h4 class="report-card-title">${report.title}</h4>
          <span class="badge">${report.status}</span>
        </div>
        <div class="report-card-location">📍 ${report.address}</div>
        <p class="report-card-desc">${report.description}</p>
      `;

      // Zoom to marker when card is clicked
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) return;
        map.setView(report.location, 15);
        marker.openPopup();
      });

      // Delete Functionality
      const deleteBtn = card.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteReport(report.id);
      });

      reportsList.appendChild(card);
    });
  }

  // Delete Report
  function deleteReport(id) {
    reports = reports.filter(r => r.id !== id);
    renderApp();
  }

  // Search Event Listener
  document.getElementById("searchInput").addEventListener("input", renderApp);

  // Modal Functionality
  const reportOverlay = document.getElementById("reportOverlay");
  document.getElementById("reportButton").addEventListener("click", () => {
    reportOverlay.classList.add("active");
  });
  document.getElementById("closeReport").addEventListener("click", () => {
    reportOverlay.classList.remove("active");
  });

  // Location Selector
  let selectedLatLng = null;
  document.getElementById("chooseLocation").addEventListener("click", () => {
    reportOverlay.classList.remove("active");
    const status = document.getElementById("locationStatus");
    status.textContent = "Click anywhere on the map to set location.";
    
    map.once("click", (e) => {
      selectedLatLng = e.latlng;
      status.textContent = `Location set: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
      reportOverlay.classList.add("active");
    });
  });

  // Submit New Report
  document.getElementById("submitReport").addEventListener("click", () => {
    const title = document.getElementById("issueTitle").value.trim() || "New Report";
    const type = document.getElementById("issueType").value;
    const severity = document.getElementById("issueSeverity").value;
    const description = document.getElementById("issueDescription").value.trim();

    if (!selectedLatLng) {
      alert("Please select a location on the map.");
      return;
    }

    const newReport = {
      id: Date.now(),
      location: [selectedLatLng.lat, selectedLatLng.lng],
      title: title,
      address: `Lat: ${selectedLatLng.lat.toFixed(3)}, Lng: ${selectedLatLng.lng.toFixed(3)}`,
      category: type,
      description: description,
      severity: severity,
      status: "Reported"
    };

    reports.unshift(newReport);
    renderApp();

    // Reset Form
    document.getElementById("issueTitle").value = "";
    document.getElementById("issueDescription").value = "";
    document.getElementById("locationStatus").textContent = "Location not selected";
    selectedLatLng = null;
    reportOverlay.classList.remove("active");
  });

  // Initial Render
  renderApp();
});