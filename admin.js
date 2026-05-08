document.addEventListener("DOMContentLoaded", function () {
  const loginPanel = document.getElementById("loginPanel");
  const adminDashboard = document.getElementById("adminDashboard");

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const saveReviewButton = document.getElementById("saveReviewButton");
  const cancelEditButton = document.getElementById("cancelEditButton");
  const clearFormButton = document.getElementById("clearFormButton");
  const refreshReviewsButton = document.getElementById("refreshReviewsButton");
  const fetchSpotifyPreviewButton = document.getElementById("fetchSpotifyPreviewButton");

  const loginMessage = document.getElementById("loginMessage");
  const saveMessage = document.getElementById("saveMessage");
  const listMessage = document.getElementById("listMessage");
  const previewMessage = document.getElementById("previewMessage");

  const adminReviewList = document.getElementById("adminReviewList");
  const formTitle = document.getElementById("formTitle");

  let previewSpotifyData = null;

  if (typeof supabaseClient === "undefined") {
    loginMessage.textContent = "Supabase is not connected. Check supabase-config.js.";
    loginPanel.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    return;
  }

  setupLivePreview();
  showLogin();
  checkSession();

  loginButton.addEventListener("click", async function () {
    loginMessage.textContent = "Logging in...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      loginMessage.textContent = error.message;
      return;
    }

    loginMessage.textContent = "";
    showAdmin();
    loadAdminReviews();
  });

  logoutButton.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    showLogin();
  });

  saveReviewButton.addEventListener("click", async function () {
    const editingId = document.getElementById("editingIdInput").value;

    if (editingId) {
      updateReview(editingId);
    } else {
      saveNewReview();
    }
  });

  cancelEditButton.addEventListener("click", function () {
    clearForm();
    setAddMode();
    renderPreview();
  });

  clearFormButton.addEventListener("click", function () {
    clearForm();
    setAddMode();
    renderPreview();
  });

  refreshReviewsButton.addEventListener("click", function () {
    loadAdminReviews();
  });

  fetchSpotifyPreviewButton.addEventListener("click", function () {
    fetchSpotifyPreview();
  });

  async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      loginMessage.textContent = error.message;
      showLogin();
      return;
    }

    if (data.session) {
      showAdmin();
      loadAdminReviews();
    } else {
      showLogin();
    }
  }

  function showAdmin() {
    loginPanel.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    renderPreview();
  }

  function showLogin() {
    adminDashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  }

  function getFormData() {
    const type = document.getElementById("typeInput").value;
    const title = document.getElementById("titleInput").value.trim();
    const artist = document.getElementById("artistInput").value.trim();
    const mediaType = document.getElementById("mediaTypeInput").value;
    const tmdbId = document.getElementById("tmdbIdInput").value;
    const rating = Number(document.getElementById("ratingInput").value);
    const featured = document.getElementById("featuredInput").checked;
    const review = document.getElementById("reviewInput").value.trim();

    const manualTitle = document.getElementById("manualTitleInput").value.trim();
    const manualArtist = document.getElementById("manualArtistInput").value.trim();
    const manualImage = document.getElementById("manualImageInput").value.trim();
    const manualReleaseDate = document.getElementById("manualReleaseDateInput").value.trim();
    const manualGenre = document.getElementById("manualGenreInput").value.trim();

    if (!title || !review) {
      return {
        error: "Title and review are required."
      };
    }

    return {
      data: {
        type: type,
        title: title,
        artist: artist || null,
        media_type: mediaType || null,
        tmdb_id: tmdbId ? Number(tmdbId) : null,
        rating: rating,
        featured: featured,
        review: review,
        manual_title: manualTitle || null,
        manual_artist: manualArtist || null,
        manual_image: manualImage || null,
        manual_release_date: manualReleaseDate || null,
        manual_genre: manualGenre || null
      }
    };
  }

  async function fetchSpotifyPreview() {
    const type = document.getElementById("typeInput").value;
    const title = document.getElementById("titleInput").value.trim();
    const artist = document.getElementById("artistInput").value.trim();

    previewSpotifyData = null;

    if (type !== "music") {
      previewMessage.textContent = "Spotify preview only works for music reviews.";
      renderPreview();
      return;
    }

    if (!title || !artist) {
      previewMessage.textContent = "Enter a music title and artist first.";
      renderPreview();
      return;
    }

    previewMessage.textContent = "Fetching Spotify preview...";

    try {
      const { data, error } = await supabaseClient.functions.invoke("spotify-search", {
        body: {
          title: title,
          artist: artist
        }
      });

      if (error || !data || data.error) {
        previewMessage.textContent = data?.error || error?.message || "Spotify preview failed.";
        renderPreview();
        return;
      }

      previewSpotifyData = data;
      previewMessage.textContent = "Spotify preview loaded.";
      renderPreview();
    } catch (error) {
      previewMessage.textContent = "Spotify preview failed.";
      console.error("Spotify preview error:", error);
      renderPreview();
    }
  }

  async function addSpotifyDataIfNeeded(reviewData) {
    const isMusic = reviewData.type === "music";
    const hasArtist = Boolean(reviewData.artist);
    const hasManualImage = Boolean(reviewData.manual_image);

    if (!isMusic || !hasArtist || hasManualImage) {
      return {
        ...reviewData,
        spotify_title: null,
        spotify_artist: null,
        spotify_image: null,
        spotify_release_date: null,
        spotify_genre: null,
        spotify_url: null,
        spotify_id: null
      };
    }

    if (
      previewSpotifyData &&
      previewSpotifyData.title &&
      reviewData.title &&
      reviewData.artist
    ) {
      return {
        ...reviewData,
        spotify_title: previewSpotifyData.title || reviewData.title,
        spotify_artist: previewSpotifyData.artist || reviewData.artist,
        spotify_image: previewSpotifyData.image || null,
        spotify_release_date: previewSpotifyData.releaseDate || null,
        spotify_genre: previewSpotifyData.genre || "Album",
        spotify_url: previewSpotifyData.spotifyUrl || null,
        spotify_id: previewSpotifyData.spotifyId || null
      };
    }

    try {
      saveMessage.textContent = "Finding Spotify data...";

      const { data, error } = await supabaseClient.functions.invoke("spotify-search", {
        body: {
          title: reviewData.title,
          artist: reviewData.artist
        }
      });

      if (error || !data || data.error) {
        console.warn("Spotify lookup failed:", error || data?.error);

        return {
          ...reviewData,
          spotify_title: null,
          spotify_artist: null,
          spotify_image: null,
          spotify_release_date: null,
          spotify_genre: null,
          spotify_url: null,
          spotify_id: null
        };
      }

      return {
        ...reviewData,
        spotify_title: data.title || reviewData.title,
        spotify_artist: data.artist || reviewData.artist,
        spotify_image: data.image || null,
        spotify_release_date: data.releaseDate || null,
        spotify_genre: data.genre || "Album",
        spotify_url: data.spotifyUrl || null,
        spotify_id: data.spotifyId || null
      };
    } catch (error) {
      console.error("Spotify lookup error:", error);

      return {
        ...reviewData,
        spotify_title: null,
        spotify_artist: null,
        spotify_image: null,
        spotify_release_date: null,
        spotify_genre: null,
        spotify_url: null,
        spotify_id: null
      };
    }
  }

  async function saveNewReview() {
    saveMessage.textContent = "Saving...";

    const formResult = getFormData();

    if (formResult.error) {
      saveMessage.textContent = formResult.error;
      return;
    }

    const reviewData = await addSpotifyDataIfNeeded(formResult.data);

    const { error } = await supabaseClient
      .from("reviews")
      .insert([reviewData]);

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    saveMessage.textContent = "Review saved successfully.";
    clearForm();
    setAddMode();
    renderPreview();
    loadAdminReviews();
  }

  async function updateReview(id) {
    saveMessage.textContent = "Updating...";

    const formResult = getFormData();

    if (formResult.error) {
      saveMessage.textContent = formResult.error;
      return;
    }

    const reviewData = await addSpotifyDataIfNeeded(formResult.data);

    const { error } = await supabaseClient
      .from("reviews")
      .update(reviewData)
      .eq("id", id);

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    saveMessage.textContent = "Review updated successfully.";
    clearForm();
    setAddMode();
    renderPreview();
    loadAdminReviews();
  }

  async function deleteReview(id, title) {
    const confirmed = confirm(`Delete "${title}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    listMessage.textContent = "Deleting...";

    const { error } = await supabaseClient
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      listMessage.textContent = error.message;
      return;
    }

    listMessage.textContent = "Review deleted.";
    loadAdminReviews();
  }

  async function loadAdminReviews() {
    adminReviewList.innerHTML = "";
    listMessage.textContent = "Loading reviews...";

    const { data, error } = await supabaseClient
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      listMessage.textContent = error.message;
      return;
    }

    if (!data || data.length === 0) {
      listMessage.textContent = "No Supabase reviews yet.";
      return;
    }

    listMessage.textContent = "";

    data.forEach(review => {
      const item = document.createElement("article");
      item.className = "admin-review-item";

      const typeLabel = getTypeLabel(review);
      const createdDate = review.created_at
        ? new Date(review.created_at).toLocaleDateString()
        : "";

      item.innerHTML = `
        <div class="admin-review-info">
          <p class="meta">${typeLabel}</p>
          <h3>${escapeHtml(review.title)}</h3>
          <p>${escapeHtml(review.artist || "")}</p>
          <p>${review.rating} stars ${review.featured ? "• Jacob's Pick" : ""}</p>
          <p class="admin-date">${createdDate}</p>
        </div>

        <div class="admin-review-actions">
          <button class="admin-button small-admin-button edit-button">Edit</button>
          <button class="admin-button small-admin-button danger-button delete-button">Delete</button>
        </div>
      `;

      const editButton = item.querySelector(".edit-button");
      const deleteButton = item.querySelector(".delete-button");

      editButton.addEventListener("click", function () {
        fillFormForEdit(review);
      });

      deleteButton.addEventListener("click", function () {
        deleteReview(review.id, review.title);
      });

      adminReviewList.appendChild(item);
    });
  }

  function fillFormForEdit(review) {
    document.getElementById("editingIdInput").value = review.id;

    document.getElementById("typeInput").value = review.type || "music";
    document.getElementById("titleInput").value = review.title || "";
    document.getElementById("artistInput").value = review.artist || "";
    document.getElementById("mediaTypeInput").value = review.media_type || "";
    document.getElementById("tmdbIdInput").value = review.tmdb_id || "";
    document.getElementById("ratingInput").value = review.rating || "5";
    document.getElementById("featuredInput").checked = Boolean(review.featured);
    document.getElementById("reviewInput").value = review.review || "";

    document.getElementById("manualTitleInput").value = review.manual_title || "";
    document.getElementById("manualArtistInput").value = review.manual_artist || "";
    document.getElementById("manualImageInput").value = review.manual_image || "";
    document.getElementById("manualReleaseDateInput").value = review.manual_release_date || "";
    document.getElementById("manualGenreInput").value = review.manual_genre || "";

    if (review.spotify_image || review.spotify_url) {
      previewSpotifyData = {
        title: review.spotify_title || review.title,
        artist: review.spotify_artist || review.artist,
        image: review.spotify_image || "",
        releaseDate: review.spotify_release_date || "",
        genre: review.spotify_genre || "Album",
        spotifyUrl: review.spotify_url || "",
        spotifyId: review.spotify_id || ""
      };
    } else {
      previewSpotifyData = null;
    }

    setEditMode();
    renderPreview();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function clearForm() {
    document.getElementById("editingIdInput").value = "";

    document.getElementById("typeInput").value = "music";
    document.getElementById("titleInput").value = "";
    document.getElementById("artistInput").value = "";
    document.getElementById("mediaTypeInput").value = "";
    document.getElementById("tmdbIdInput").value = "";
    document.getElementById("ratingInput").value = "5";
    document.getElementById("featuredInput").checked = false;
    document.getElementById("reviewInput").value = "";

    document.getElementById("manualTitleInput").value = "";
    document.getElementById("manualArtistInput").value = "";
    document.getElementById("manualImageInput").value = "";
    document.getElementById("manualReleaseDateInput").value = "";
    document.getElementById("manualGenreInput").value = "";

    previewSpotifyData = null;
    previewMessage.textContent = "";
  }

  function setEditMode() {
    formTitle.textContent = "Edit Review";
    saveReviewButton.textContent = "Update Review";
    cancelEditButton.classList.remove("hidden");
    saveMessage.textContent = "Editing mode.";
  }

  function setAddMode() {
    formTitle.textContent = "Add Review";
    saveReviewButton.textContent = "Save Review";
    cancelEditButton.classList.add("hidden");
  }

  function setupLivePreview() {
    const previewInputs = [
      "typeInput",
      "titleInput",
      "artistInput",
      "mediaTypeInput",
      "ratingInput",
      "featuredInput",
      "reviewInput",
      "manualTitleInput",
      "manualArtistInput",
      "manualImageInput",
      "manualReleaseDateInput",
      "manualGenreInput"
    ];

    previewInputs.forEach(id => {
      const element = document.getElementById(id);

      if (!element) {
        return;
      }

      element.addEventListener("input", function () {
        previewSpotifyData = shouldClearSpotifyPreview(id) ? null : previewSpotifyData;
        renderPreview();
      });

      element.addEventListener("change", function () {
        previewSpotifyData = shouldClearSpotifyPreview(id) ? null : previewSpotifyData;
        renderPreview();
      });
    });
  }

  function shouldClearSpotifyPreview(id) {
    return id === "titleInput" || id === "artistInput" || id === "typeInput";
  }

  function renderPreview() {
    const type = document.getElementById("typeInput").value;
    const title = document.getElementById("titleInput").value.trim();
    const artist = document.getElementById("artistInput").value.trim();
    const mediaType = document.getElementById("mediaTypeInput").value;
    const rating = Number(document.getElementById("ratingInput").value);
    const review = document.getElementById("reviewInput").value.trim();

    const manualTitle = document.getElementById("manualTitleInput").value.trim();
    const manualArtist = document.getElementById("manualArtistInput").value.trim();
    const manualImage = document.getElementById("manualImageInput").value.trim();
    const manualReleaseDate = document.getElementById("manualReleaseDateInput").value.trim();
    const manualGenre = document.getElementById("manualGenreInput").value.trim();

    const previewType = document.getElementById("previewType");
    const previewTitle = document.getElementById("previewTitle");
    const previewDetails = document.getElementById("previewDetails");
    const previewStars = document.getElementById("previewStars");
    const previewReview = document.getElementById("previewReview");
    const previewSpotifyLink = document.getElementById("previewSpotifyLink");
    const previewCard = document.getElementById("previewCard");

    const imageTarget = previewCard.querySelector(".admin-preview-image-placeholder, .admin-preview-image");

    let displayTitle = title || "Title";
    let displayArtist = artist || "Artist";
    let displayYear = "Year";
    let displayGenre = type === "music" ? "Album" : "Movie / Show";
    let displayImage = "";
    let spotifyUrl = "";

    if (manualImage) {
      displayTitle = manualTitle || displayTitle;
      displayArtist = manualArtist || displayArtist;
      displayYear = manualReleaseDate || displayYear;
      displayGenre = manualGenre || displayGenre;
      displayImage = manualImage;
    } else if (previewSpotifyData) {
      displayTitle = previewSpotifyData.title || displayTitle;
      displayArtist = previewSpotifyData.artist || displayArtist;
      displayYear = previewSpotifyData.releaseDate || displayYear;
      displayGenre = previewSpotifyData.genre || displayGenre;
      displayImage = previewSpotifyData.image || "";
      spotifyUrl = previewSpotifyData.spotifyUrl || "";
    }

    previewType.textContent = type === "music"
      ? "Music"
      : mediaType === "tv"
        ? "Show"
        : "Movie";

    previewTitle.textContent = displayTitle;

    previewDetails.textContent = type === "music"
      ? `${displayArtist} • ${displayYear} • ${displayGenre}`
      : `${mediaType || "Movie / Show"}`;

    previewStars.textContent = createStars(rating);
    previewReview.textContent = review || "Your review preview will show here.";

    if (spotifyUrl) {
      previewSpotifyLink.href = spotifyUrl;
      previewSpotifyLink.classList.remove("hidden");
    } else {
      previewSpotifyLink.href = "#";
      previewSpotifyLink.classList.add("hidden");
    }

    if (displayImage) {
      if (imageTarget.tagName.toLowerCase() === "img") {
        imageTarget.src = displayImage;
        imageTarget.alt = displayTitle;
      } else {
        const img = document.createElement("img");
        img.className = "admin-preview-image";
        img.src = displayImage;
        img.alt = displayTitle;
        imageTarget.replaceWith(img);
      }
    } else {
      if (imageTarget.tagName.toLowerCase() === "img") {
        const placeholder = document.createElement("div");
        placeholder.className = "admin-preview-image-placeholder";
        placeholder.textContent = "Preview";
        imageTarget.replaceWith(placeholder);
      } else {
        imageTarget.textContent = "Preview";
      }
    }
  }

  function createStars(rating) {
    const numericRating = Number(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return "★".repeat(fullStars) + (hasHalfStar ? "½" : "") + "☆".repeat(emptyStars);
  }

  function getTypeLabel(review) {
    if (review.type === "music") {
      return "Music";
    }

    if (review.media_type === "tv") {
      return "Show";
    }

    if (review.media_type === "movie") {
      return "Movie";
    }

    return "Review";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
