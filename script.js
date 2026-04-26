const TMDB_API_KEY = "a666ef51ef474c8e71f2e1a0961df6d1";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const apiCache = new Map();

document.addEventListener("DOMContentLoaded", function () {
  const mediaContainer = document.getElementById("mediaContainer");
  const searchInput = document.getElementById("searchInput");

  const movieCarouselTrack = document.getElementById("movieCarouselTrack");
  const showCarouselTrack = document.getElementById("showCarouselTrack");
  const musicCarouselTrack = document.getElementById("musicCarouselTrack");

  if (typeof reviews === "undefined") {
    console.error("reviews.js is not loading.");
    return;
  }

  if (typeof PAGE_TYPE === "undefined") {
    console.error("PAGE_TYPE is not set.");
    return;
  }

  if (movieCarouselTrack) {
    displayCarousel(movieCarouselTrack, "movie");
  }

  if (showCarouselTrack) {
    displayCarousel(showCarouselTrack, "tv");
  }

  if (musicCarouselTrack) {
    displayCarousel(musicCarouselTrack, "music");
  }

  if (mediaContainer) {
    displayMedia(mediaContainer, "");
  }

  const filterElements = [
    searchInput,
    document.getElementById("filterRating"),
    document.getElementById("filterGenre"),
    document.getElementById("filterFeatured"),
    document.getElementById("filterSort"),
    document.getElementById("filterRuntime")
  ].filter(Boolean);

  filterElements.forEach(element => {
    element.addEventListener("input", function () {
      displayMedia(mediaContainer, searchInput ? searchInput.value : "");
    });

    element.addEventListener("change", function () {
      displayMedia(mediaContainer, searchInput ? searchInput.value : "");
    });
  });
});

async function getMusicData(item) {
  const cacheKey = `music-${item.title}-${item.artist}`;

  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  if (item.manual) {
    const manualData = {
      title: item.manual.title,
      artist: item.manual.artist,
      image: item.manual.image,
      releaseDate: item.manual.releaseDate,
      genre: item.manual.genre,
      genres: [item.manual.genre],
      year: Number(item.manual.releaseDate) || 0
    };

    apiCache.set(cacheKey, manualData);
    return manualData;
  }

  const searchTerm = encodeURIComponent(`${item.title} ${item.artist}`);
  const url = `https://itunes.apple.com/search?term=${searchTerm}&media=music&entity=album&attribute=albumTerm&country=US&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      const fallbackData = {
        title: item.title,
        artist: item.artist || "Unknown artist",
        image: "https://via.placeholder.com/600x600?text=No+Album+Art",
        releaseDate: "Unknown",
        genre: "Unknown genre",
        genres: ["Unknown genre"],
        year: 0
      };

      apiCache.set(cacheKey, fallbackData);
      return fallbackData;
    }

    const exactMatch = data.results.find(album =>
      album.collectionName.toLowerCase().includes(item.title.toLowerCase()) &&
      album.artistName.toLowerCase().includes(item.artist.toLowerCase())
    );

    const album = exactMatch || data.results[0];

    const year = album.releaseDate
      ? new Date(album.releaseDate).getFullYear()
      : 0;

    const musicData = {
      title: album.collectionName,
      artist: album.artistName,
      image: album.artworkUrl100.replace("100x100bb", "600x600bb"),
      releaseDate: year || "Unknown",
      genre: album.primaryGenreName || "Unknown genre",
      genres: [album.primaryGenreName || "Unknown genre"],
      year: year
    };

    apiCache.set(cacheKey, musicData);
    return musicData;
  } catch (error) {
    console.error("iTunes API error:", error);

    const errorData = {
      title: item.title,
      artist: item.artist || "Unknown artist",
      image: "https://via.placeholder.com/600x600?text=No+Album+Art",
      releaseDate: "Unknown",
      genre: "Unknown genre",
      genres: ["Unknown genre"],
      year: 0
    };

    apiCache.set(cacheKey, errorData);
    return errorData;
  }
}

async function searchTmdbItem(item) {
  const mediaType = item.mediaType || "movie";
  const searchTitle = encodeURIComponent(item.title);
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${searchTitle}&language=en-US&page=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.results || data.results.length === 0) {
    throw new Error("No TMDb search results found.");
  }

  return data.results[0].id;
}

async function getFilmData(item) {
  const cacheKey = `film-${item.mediaType}-${item.tmdbId || item.title}`;

  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  const mediaType = item.mediaType || "movie";

  try {
    const tmdbId = item.tmdbId || await searchTmdbItem(item);

    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status_message || "TMDb request failed.");
    }

    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;

    const year = releaseDate
      ? new Date(releaseDate).getFullYear()
      : 0;

    const genreNames = data.genres
      ? data.genres.map(genre => genre.name)
      : [];

    const runtime = mediaType === "movie"
      ? data.runtime || 0
      : data.episode_run_time && data.episode_run_time.length > 0
        ? data.episode_run_time[0]
        : 0;

    const filmData = {
      title: title || item.title,
      image: data.poster_path
        ? `${TMDB_IMAGE_BASE}${data.poster_path}`
        : "https://via.placeholder.com/500x750?text=No+Poster",
      releaseDate: year || "Unknown",
      year: year,
      genres: genreNames,
      genre: genreNames.join(", "),
      runtime: runtime,
      overview: data.overview || ""
    };

    apiCache.set(cacheKey, filmData);
    return filmData;
  } catch (error) {
    console.error("TMDb API error:", error);

    const errorData = {
      title: item.title,
      image: item.image || "https://via.placeholder.com/500x750?text=Film+Poster",
      releaseDate: item.releaseDate || "Unknown",
      year: Number(item.releaseDate) || 0,
      genres: [],
      genre: "",
      runtime: 0,
      overview: ""
    };

    apiCache.set(cacheKey, errorData);
    return errorData;
  }
}

async function getApiData(item) {
  if (item.type === "music") {
    return await getMusicData(item);
  }

  if (item.type === "film") {
    return await getFilmData(item);
  }

  return {
    title: item.title || "Untitled",
    image: "https://via.placeholder.com/500x750?text=No+Image",
    releaseDate: "Unknown",
    year: 0,
    genres: [],
    genre: "",
    runtime: 0,
    overview: ""
  };
}

function createStars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function getMediaLabel(item) {
  if (item.type === "music") {
    return "music";
  }

  if (item.mediaType === "tv") {
    return "show";
  }

  return "movie";
}

function getBaseReviewsForPage() {
  if (PAGE_TYPE === "all") {
    return reviews;
  }

  if (PAGE_TYPE === "music") {
    return reviews.filter(item => item.type === "music");
  }

  if (PAGE_TYPE === "movie") {
    return reviews.filter(item =>
      item.type === "film" && item.mediaType === "movie"
    );
  }

  if (PAGE_TYPE === "show") {
    return reviews.filter(item =>
      item.type === "film" && item.mediaType === "tv"
    );
  }

  return reviews;
}

function getFilterState() {
  return {
    rating: document.getElementById("filterRating")?.value || "all",
    genre: document.getElementById("filterGenre")?.value || "all",
    featured: document.getElementById("filterFeatured")?.value || "all",
    sort: document.getElementById("filterSort")?.value || "default",
    runtime: document.getElementById("filterRuntime")?.value || "all"
  };
}

function getSearchText(item, apiData) {
  const manualText = item.manual
    ? `${item.manual.title || ""} ${item.manual.artist || ""} ${item.manual.genre || ""} ${item.manual.releaseDate || ""}`
    : "";

  return `
    ${item.title || ""}
    ${item.artist || ""}
    ${item.type || ""}
    ${item.mediaType || ""}
    ${item.rating || ""}
    ${item.review || ""}
    ${apiData.title || ""}
    ${apiData.artist || ""}
    ${apiData.releaseDate || ""}
    ${apiData.genre || ""}
    ${(apiData.genres || []).join(" ")}
    ${manualText}
  `.toLowerCase();
}

function matchesGenre(apiData, selectedGenre) {
  if (selectedGenre === "all") {
    return true;
  }

  const genreText = `
    ${apiData.genre || ""}
    ${(apiData.genres || []).join(" ")}
  `.toLowerCase();

  return genreText.includes(selectedGenre);
}

function matchesRuntime(apiData, selectedRuntime) {
  if (selectedRuntime === "all") {
    return true;
  }

  const runtime = apiData.runtime || 0;

  if (!runtime) {
    return false;
  }

  if (selectedRuntime === "under-120") {
    return runtime < 120;
  }

  if (selectedRuntime === "over-120") {
    return runtime >= 120;
  }

  return true;
}

function passesFilters(item, apiData, searchTerm, filters) {
  const cleanedSearch = searchTerm.trim().toLowerCase();

  if (cleanedSearch && !getSearchText(item, apiData).includes(cleanedSearch)) {
    return false;
  }

  if (filters.rating !== "all" && Number(item.rating) !== Number(filters.rating)) {
    return false;
  }

  if (filters.featured === "featured" && !item.featured) {
    return false;
  }

  if (!matchesGenre(apiData, filters.genre)) {
    return false;
  }

  if (!matchesRuntime(apiData, filters.runtime)) {
    return false;
  }

  return true;
}

function sortReviewCards(cards, sortType) {
  if (sortType === "newest") {
    cards.sort((a, b) => (b.apiData.year || 0) - (a.apiData.year || 0));
  }

  if (sortType === "oldest") {
    cards.sort((a, b) => (a.apiData.year || 0) - (b.apiData.year || 0));
  }

  return cards;
}

function updateSearchCount(count, searchTerm, filters) {
  const searchCount = document.getElementById("searchCount");

  if (!searchCount) {
    return;
  }

  const filtersActive =
    searchTerm.trim() ||
    filters.rating !== "all" ||
    filters.genre !== "all" ||
    filters.featured !== "all" ||
    filters.runtime !== "all";

  if (!filtersActive) {
    searchCount.textContent = "";
    return;
  }

  searchCount.textContent = `${count} result${count === 1 ? "" : "s"} found`;
}

function formatDetails(item, apiData) {
  if (item.type === "music") {
    return `${apiData.artist} • ${apiData.releaseDate} • ${apiData.genre}`;
  }

  const genreText = apiData.genre ? ` • ${apiData.genre}` : "";
  const runtimeText = apiData.runtime
    ? item.mediaType === "tv"
      ? ` • ${apiData.runtime} min episodes`
      : ` • ${apiData.runtime} min`
    : "";

  return `${apiData.releaseDate}${genreText}${runtimeText}`;
}

function createCard(item, apiData, container) {
  const card = document.createElement("div");
  card.className = `card ${item.type}-card`;

  const apiOverview =
    item.type === "film" && apiData.overview
      ? `<p class="api-overview">${apiData.overview}</p>`
      : "";

  card.innerHTML = `
    <img src="${apiData.image}" alt="${apiData.title}">
    <div class="card-content">
      <div class="meta">${getMediaLabel(item)}</div>
      <h3>${apiData.title}</h3>
      <p class="details">${formatDetails(item, apiData)}</p>
      <div class="stars">${createStars(item.rating)}</div>
      <div class="description">
        <p>${item.review}</p>
        ${apiOverview}
      </div>
    </div>
  `;

  container.appendChild(card);
}

function createCarouselCard(item, apiData, container) {
  const card = document.createElement("div");
  card.className = `carousel-card ${item.type}-carousel-card`;

  const details =
    item.type === "music"
      ? `${apiData.artist} • ${apiData.releaseDate}`
      : `${apiData.releaseDate}`;

  card.innerHTML = `
    <img src="${apiData.image}" alt="${apiData.title}">
    <div class="carousel-info">
      <span>${getMediaLabel(item)}</span>
      <h3>${apiData.title}</h3>
      <p>${details}</p>
      <div class="stars small-stars">${createStars(item.rating)}</div>
    </div>
  `;

  container.appendChild(card);
}

async function displayCarousel(carouselTrack, carouselType) {
  carouselTrack.innerHTML = "";

  let featuredReviews;

  if (carouselType === "music") {
    featuredReviews = reviews.filter(item =>
      item.featured && item.type === "music"
    );
  } else {
    featuredReviews = reviews.filter(item =>
      item.featured &&
      item.type === "film" &&
      item.mediaType === carouselType
    );
  }

  if (featuredReviews.length === 0) {
    carouselTrack.innerHTML = `<p class="empty-message">No picks yet.</p>`;
    return;
  }

  const carouselItems = [...featuredReviews, ...featuredReviews];

  for (const item of carouselItems) {
    const apiData = await getApiData(item);
    createCarouselCard(item, apiData, carouselTrack);
  }
}

async function displayMedia(mediaContainer, searchTerm = "") {
  mediaContainer.innerHTML = "";

  const filters = getFilterState();
  const baseReviews = getBaseReviewsForPage();
  const filteredCards = [];

  for (const item of baseReviews) {
    const apiData = await getApiData(item);

    if (passesFilters(item, apiData, searchTerm, filters)) {
      filteredCards.push({ item, apiData });
    }
  }

  sortReviewCards(filteredCards, filters.sort);

  updateSearchCount(filteredCards.length, searchTerm, filters);

  if (filteredCards.length === 0) {
    mediaContainer.innerHTML = `
      <div class="no-results">
        <h3>No reviews found</h3>
        <p>Try changing the search or filter options.</p>
      </div>
    `;
    return;
  }

  filteredCards.forEach(({ item, apiData }) => {
    createCard(item, apiData, mediaContainer);
  });
}