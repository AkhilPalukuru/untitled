document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === "undefined") return;

  const defaultReports = [
    {
      id: 1,
      location: [39.9568, -85.9948],
      title: "Pothole on 116th St",
      address: "116th St & Lantern Rd, Fishers, IN",
      category: "Pothole / road damage",
      description: "Large pothole forming near the intersection, getting worse after rain.",
      severity: "High",
      status: "Reported",
      image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 2,
      location: [39.9720, -86.0020],
      title: "Fallen Tree on Geist Rd",
      address: "Geist Rd near Fall Creek, Fishers, IN",
      category: "Fallen tree",
      description: "Tree came down across the road during last storm, blocking one lane.",
      severity: "Critical",
      status: "In progress",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=600&q=80"
    }
  ];

  let reports = JSON.parse(localStorage.getItem("fixfishers_reports")) || defaultReports;
  let selectedLatLng = null;
  let selectedAddress = "";
  let selectedImageDataUrl = null;
  let selectionMarker = null;

  const fishersCenter = [39.9568, -85.9948];
  const map = L.map("map").setView(fishersCenter, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let markers = {};

  // Safely save reports to localStorage with error catching
  function saveReports() {
    try {
      localStorage.setItem("fixfishers_reports", JSON.stringify(reports));
    } catch (err) {
      console.error("Storage full, could not save report:", err);
      alert("Storage limit reached! Please try a smaller image or delete old reports.");
    }
  }

  // Helper to compress and resize images so localStorage doesn't overflow
  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed Data URL (JPEG, 0.7 quality)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        callback(compressedDataUrl);
      };
    };
  }

  // Reverse Geocoding helper with 3s timeout
  async function fetchAddress(lat, lng) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",");
        return parts.slice(0, 3).join(",").trim();
      }
    } catch (err) {
      console.warn("Geocoding timeout or error:", err);
    }
    return `Fishers (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
  }

  function renderApp() {
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};

    const reportsList = document.getElementById("reportsList");
    const reportsCount = document.getElementById("reportsCount");
    const searchInput = document.getElementById("searchInput");
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

    if (reportsList) reportsList.innerHTML = "";

    const filteredReports = reports.filter(r => 
      (r.title && r.title.toLowerCase().includes(searchQuery)) ||
      (r.address && r.address.toLowerCase().includes(searchQuery)) ||
      (r.description && r.description.toLowerCase().includes(searchQuery))
    );

    if (reportsCount) {
      reportsCount.textContent = `${filteredReports.length} issues in Fishers`;
    }

    filteredReports.forEach(report => {
      const popupImageHTML = report.image 
        ? `<img src="${report.image}" alt="${report.title}" style="width:100%; max-height:140px; object-fit:cover; border-radius:6px; margin-bottom:8px;">`
        : `<div style="padding:10px; background:#f0f0f0; text-align:center; color:#888; border-radius:6px; margin-bottom:8px; font-size:12px;">No photo attached</div>`;

      const popupHTML = `
        <div style="max-width:210px;">
          ${popupImageHTML}
          <h4 style="margin:0 0 4px; font-size:14px; font-weight:600;">${report.title}</h4>
          <p style="margin:0 0 4px; font-size:11px; color:#777;">📍 ${report.address}</p>
          <p style="margin:0 0 6px; font-size:12px; color:#555;">${report.description || ""}</p>
          <span style="font-size:10px; padding:2px 6px; background:#dce6d7; color:#2f5039; border-radius:10px; font-weight:bold;">${report.status}</span>
        </div>
      `;

      const marker = L.marker(report.location).addTo(map).bindPopup(popupHTML);
      markers[report.id] = marker;

      if (reportsList) {
        const card = document.createElement("div");
        card.className = "report-card";
        card.innerHTML = `
          <button type="button" class="delete-btn" data-id="${report.id}" title="Delete Report">×</button>
          <div class="report-card-top">
            <h4 class="report-card-title">${report.title}</h4>
            <span class="badge">${report.status}</span>
          </div>
          <div class="report-card-location">📍 ${report.address}</div>
          <p class="report-card-desc">${report.description || ""}</p>
        `;

        card.addEventListener("click", (e) => {
          if (e.target.classList.contains("delete-btn")) return;
          map.setView(report.location, 15);
          marker.openPopup();
        });

        const deleteBtn = card.querySelector(".delete-btn");
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteReport(report.id);
        });

        reportsList.appendChild(card);
      }
    });
  }

  function deleteReport(id) {
    reports = reports.filter(r => r.id !== id);
    saveReports();
    renderApp();
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", renderApp);
  }

  const reportOverlay = document.getElementById("reportOverlay");
  const reportButton = document.getElementById("reportButton");
  const closeReport = document.getElementById("closeReport");

  if (reportButton) {
    reportButton.addEventListener("click", () => {
      reportOverlay.classList.add("active");
    });
  }

  if (closeReport) {
    closeReport.addEventListener("click", () => {
      reportOverlay.classList.remove("active");
    });
  }

  // Handle Image Upload with Automatic Compression
  const issueImageInput = document.getElementById("issueImage");
  const imagePreview = document.getElementById("imagePreview");

  if (issueImageInput) {
    issueImageInput.addEventListener("change", () => {
      const file = issueImageInput.files[0];
      if (file && file.type.startsWith("image/")) {
        // Compress image to max width 600px, 70% quality
        compressImage(file, 600, 600, 0.7, (compressedDataUrl) => {
          selectedImageDataUrl = compressedDataUrl;
          if (imagePreview) {
            imagePreview.innerHTML = `<img src="${selectedImageDataUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:6px; margin-top:8px;">`;
          }
        });
      } else {
        selectedImageDataUrl = null;
        if (imagePreview) imagePreview.innerHTML = "";
      }
    });
  }

  // Map Location Picker
  const chooseLocationBtn = document.getElementById("chooseLocation");
  if (chooseLocationBtn) {
    chooseLocationBtn.addEventListener("click", (e) => {
      e.preventDefault();
      reportOverlay.classList.remove("active");
      const status = document.getElementById("locationStatus");
      if (status) status.textContent = "Click anywhere on the map to set location...";

      const handleMapClick = async (e) => {
        selectedLatLng = e.latlng;

        if (selectionMarker) {
          map.removeLayer(selectionMarker);
        }
        selectionMarker = L.marker(selectedLatLng).addTo(map);

        if (status) {
          status.textContent = "Fetching street address...";
        }

        reportOverlay.classList.add("active");

        selectedAddress = await fetchAddress(selectedLatLng.lat, selectedLatLng.lng);

        if (status) {
          status.textContent = `📍 ${selectedAddress}`;
        }

        map.off("click", handleMapClick);
      };

      map.once("click", handleMapClick);
    });
  }

  // Core Submit Handler
  function handleFormSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedLatLng) {
      alert("Please select a location on the map first using 'Choose location on map'.");
      return;
    }

    const titleInput = document.getElementById("issueTitle");
    const typeInput = document.getElementById("issueType");
    const severityInput = document.getElementById("issueSeverity");
    const descInput = document.getElementById("issueDescription");

    const type = typeInput ? typeInput.value : "Other";
    const title = titleInput && titleInput.value.trim() !== "" ? titleInput.value.trim() : type;
    const severity = severityInput ? severityInput.value : "Medium";
    const description = descInput ? descInput.value.trim() : "";
    const finalAddress = selectedAddress || `Fishers (${selectedLatLng.lat.toFixed(3)}, ${selectedLatLng.lng.toFixed(3)})`;

    const newReport = {
      id: Date.now(),
      location: [selectedLatLng.lat, selectedLatLng.lng],
      title: title,
      address: finalAddress,
      category: type,
      description: description,
      severity: severity,
      status: "Reported",
      image: selectedImageDataUrl
    };

    reports.unshift(newReport);
    saveReports();

    if (selectionMarker) {
      map.removeLayer(selectionMarker);
      selectionMarker = null;
    }

    renderApp();

    // Reset Form
    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";
    if (issueImageInput) issueImageInput.value = "";
    if (imagePreview) imagePreview.innerHTML = "";
    const status = document.getElementById("locationStatus");
    if (status) status.textContent = "Location not selected";

    selectedLatLng = null;
    selectedAddress = "";
    selectedImageDataUrl = null;
    reportOverlay.classList.remove("active");

    map.setView(newReport.location, 15);
    if (markers[newReport.id]) {
      markers[newReport.id].openPopup();
    }
  }

  const submitReportBtn = document.getElementById("submitReport");
  if (submitReportBtn) {
    submitReportBtn.addEventListener("click", handleFormSubmit);
  }

  const reportForm = document.getElementById("reportForm");
  if (reportForm) {
    reportForm.addEventListener("submit", handleFormSubmit);
  }

  renderApp();
});