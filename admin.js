document.addEventListener("DOMContentLoaded", function () {
  const loginPanel = document.getElementById("loginPanel");
  const adminDashboard = document.getElementById("adminDashboard");

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const saveReviewButton = document.getElementById("saveReviewButton");
  const cancelEditButton = document.getElementById("cancelEditButton");
  const refreshReviewsButton = document.getElementById("refreshReviewsButton");

  const loginMessage = document.getElementById("loginMessage");
  const saveMessage = document.getElementById("saveMessage");
  const listMessage = document.getElementById("listMessage");
  const adminReviewList = document.getElementById("adminReviewList");
  const formTitle = document.getElementById("formTitle");

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
  });

  refreshReviewsButton.addEventListener("click", function () {
    loadAdminReviews();
  });

  async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();

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

  async function saveNewReview() {
    saveMessage.textContent = "Saving...";

    const formResult = getFormData();

    if (formResult.error) {
      saveMessage.textContent = formResult.error;
      return;
    }

    const { error } = await supabaseClient
      .from("reviews")
      .insert([formResult.data]);

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    saveMessage.textContent = "Review saved successfully.";
    clearForm();
    setAddMode();
    loadAdminReviews();
  }

  async function updateReview(id) {
    saveMessage.textContent = "Updating...";

    const formResult = getFormData();

    if (formResult.error) {
      saveMessage.textContent = formResult.error;
      return;
    }

    const { error } = await supabaseClient
      .from("reviews")
      .update(formResult.data)
      .eq("id", id);

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    saveMessage.textContent = "Review updated successfully.";
    clearForm();
    setAddMode();
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

    setEditMode();

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
