document.addEventListener("DOMContentLoaded", function () {
  const loginPanel = document.getElementById("loginPanel");
  const reviewPanel = document.getElementById("reviewPanel");

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const saveReviewButton = document.getElementById("saveReviewButton");

  const loginMessage = document.getElementById("loginMessage");
  const saveMessage = document.getElementById("saveMessage");

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
  });

  logoutButton.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    showLogin();
  });

  saveReviewButton.addEventListener("click", async function () {
    saveMessage.textContent = "Saving...";

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
      saveMessage.textContent = "Title and review are required.";
      return;
    }

    const newReview = {
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
    };

    const { error } = await supabaseClient
      .from("reviews")
      .insert([newReview]);

    if (error) {
      saveMessage.textContent = error.message;
      return;
    }

    saveMessage.textContent = "Review saved successfully.";
    clearForm();
  });

  async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      showAdmin();
    } else {
      showLogin();
    }
  }

  function showAdmin() {
    loginPanel.classList.add("hidden");
    reviewPanel.classList.remove("hidden");
  }

  function showLogin() {
    reviewPanel.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  }

  function clearForm() {
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
});
