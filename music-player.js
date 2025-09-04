const player = {
  // =====================
  // Constants
  // =====================
  NEXT: +1,
  PREV: -1,
  RESTART_THRESHOLD_SECONDS: 2,
  CLASS: {
    ACTIVE: "active",
    PAUSED: "paused",
    SPIN: "spin",
  },

  // =====================
  // DOM Elements
  // =====================
  playlistEl: document.getElementById("playlist"),
  audioEl: document.getElementById("audio"),
  currentSongTitleEl: document.getElementById("current-song-title"),
  btnNextEl: document.getElementById("btn-next"),
  btnTogglePlayEl: document.getElementById("btn-toggle-play"),
  btnPrevEl: document.getElementById("btn-prev"),
  progressEl: document.getElementById("progress"),
  btnRepeatEl: document.getElementById("btn-repeat"),
  btnRandomEl: document.getElementById("btn-random"),
  currentTimeEl: document.getElementById("current-time"),
  durationEl: document.getElementById("duration"),
  cdEL: document.getElementById("cd"),

  // =====================
  // Application State
  // =====================
  songs: [
    {
      id: 1,
      name: "Bắc thang lên hỏi ông trời",
      path: "./musics/Bắc thang lên hỏi ông trời.mp3",
      artist: "Juky San",
    },
    {
      id: 2,
      name: "Cứ đổ tại cơn mưa",
      path: "./musics/Cứ đổ tại cơn mưa.mp3",
      artist: "Phương Mỹ Chi",
    },
    {
      id: 3,
      name: "Ếch ngoài đáy giếng",
      path: "./musics/Ếch ngoài đáy giếng.mp3",
      artist: "Châu Bùi",
    },
    {
      id: 4,
      name: "Người đầu tiên",
      path: "./musics/Người đầu tiên.mp3",
      artist: "Châu Bùi",
    },
  ],
  currentSongIndex: 0,
  isSeeking: false,
  isRepeat: false,
  isRandom: false,
  playedSongsIndex: new Set(),
  allSongsIndex: new Set(),

  // =====================
  // Init
  // =====================
  init() {
    // Lưu index tất cả bài hát vào allSongsIndex
    this.cacheSongIndexes();

    // Render danh sách bài hát
    this.renderSongs();

    // Load state từ localStorage nếu có
    if (localStorage.getItem("playerState")) {
      this.loadState();
    } else {
      // Load bài hát đầu tiên
      this.loadCurrentSong();
    }

    // Gắn các sự kiện cho UI
    this.bindEvents();
  },

  // =====================
  // Event Binding
  // =====================
  bindEvents() {
    // Toggle play/pause khi bấm nút
    this.btnTogglePlayEl.addEventListener("click", () =>
      this.audioEl.paused ? this.audioEl.play() : this.audioEl.pause()
    );

    // Xử lý khi audio play
    this.audioEl.addEventListener("play", () => {
      // Gỡ class paused ở nút play
      this.toggleClass(this.btnTogglePlayEl, this.CLASS.PAUSED, false);

      // Thêm class spin vào CD
      this.cdEL.classList.add(this.CLASS.SPIN);

      // Chạy hiệu ứng quay
      this.cdEL.style.animationPlayState = "running";
    });

    // Xử lý khi audio pause
    this.audioEl.addEventListener("pause", () => {
      // Thêm class paused vào nút play
      this.toggleClass(this.btnTogglePlayEl, this.CLASS.PAUSED, true);

      // Dừng hiệu ứng quay CD
      this.cdEL.style.animationPlayState = "paused";
    });

    // Xử lý khi bấm Next
    this.btnNextEl.addEventListener("click", () =>
      this.handlePrevOrNext(this.NEXT)
    );

    // Xử lý khi bấm Prev
    this.btnPrevEl.addEventListener("click", () => {
      // Nếu thời gian phát > ngưỡng → phát lại từ đầu
      if (this.audioEl.currentTime > this.RESTART_THRESHOLD_SECONDS) {
        this.audioEl.currentTime = 0;
      } else {
        // Nếu không → lùi về bài trước
        this.handlePrevOrNext(this.PREV);
      }
    });

    // Cập nhật thanh progress & thời gian khi phát
    this.audioEl.addEventListener("timeupdate", () => {
      if (!this.audioEl.duration || this.isSeeking) return;

      // Tính % đã phát
      const percent = (this.audioEl.currentTime / this.audioEl.duration) * 100;

      // Cập nhật UI progress
      this.progressEl.value = percent;
      this.progressEl.style.setProperty("--progress", `${percent}%`);

      // Hiển thị thời gian hiện tại
      this.currentTimeEl.textContent = this.formatTime(
        this.audioEl.currentTime
      );

      // Lưu state
      this.saveState();
    });

    // Xem trước vị trí khi kéo progress
    this.progressEl.addEventListener("input", () => {
      if (!this.audioEl.duration) return;

      // Tính thời gian preview dựa vào % kéo
      const seekTime = (this.progressEl.value / 100) * this.audioEl.duration;

      // Cập nhật hiển thị preview
      this.currentTimeEl.textContent = this.formatTime(seekTime);

      // Cập nhật màu progress
      this.progressEl.style.setProperty(
        "--progress",
        `${this.progressEl.value}%`
      );
    });

    // Bắt đầu kéo progress
    this.progressEl.addEventListener(
      "mousedown",
      () => (this.isSeeking = true)
    );

    // Kết thúc kéo progress
    this.progressEl.addEventListener("mouseup", () => {
      if (!this.audioEl.duration) return;

      // Dừng trạng thái seeking
      this.isSeeking = false;

      // Cập nhật lại currentTime theo progress
      this.audioEl.currentTime =
        (this.audioEl.duration / 100) * this.progressEl.value;

      // Lưu state
      this.saveState();
    });

    // Toggle repeat
    this.btnRepeatEl.addEventListener("click", () => {
      // Đổi trạng thái repeat
      this.isRepeat = !this.isRepeat;

      // Thêm/xóa class active
      this.toggleClass(this.btnRepeatEl, this.CLASS.ACTIVE, this.isRepeat);

      // Lưu state
      this.saveState();
    });

    // Toggle random
    this.btnRandomEl.addEventListener("click", () => {
      // Đổi trạng thái random
      this.isRandom = !this.isRandom;

      // Thêm/xóa class active
      this.toggleClass(this.btnRandomEl, this.CLASS.ACTIVE, this.isRandom);

      // Lưu state
      this.saveState();
    });

    // Xử lý khi bài hát kết thúc
    this.audioEl.addEventListener("ended", () => {
      if (this.isRepeat) {
        // Nếu repeat → phát lại
        this.audioEl.play();
      } else {
        // Nếu không → chuyển bài tiếp
        this.handlePrevOrNext(this.NEXT);
      }
    });

    // Lấy metadata để hiển thị duration
    this.audioEl.addEventListener("loadedmetadata", () => {
      if (this.audioEl.duration) {
        this.durationEl.textContent = this.formatTime(this.audioEl.duration);
      }
    });
  },

  // =====================
  // UI Rendering
  // =====================
  cacheSongIndexes() {
    // Lưu toàn bộ index bài hát vào allSongsIndex
    this.songs.forEach((_, index) => this.allSongsIndex.add(index));
  },

  renderSongs() {
    // Render danh sách bài hát ra playlist
    this.playlistEl.innerHTML = this.songs
      .map(
        (song, index) => `
        <div class="song ${
          index === this.currentSongIndex ? this.CLASS.ACTIVE : ""
        }"
             onclick="player.handleClickSong(${index})"
             data-index="${index}">
          <div class="thumb" style="background-image: url('https://cdn-icons-png.freepik.com/512/2402/2402463.png');"></div>
          <div class="body">
            <h3 class="title">${song.name}</h3>
            <p class="author">${song.artist}</p>
          </div>
          <div class="option"><i class="fas fa-ellipsis-h"></i></div>
        </div>`
      )
      .join("");
  },

  updateActiveSongUI() {
    // Xóa class active của bài trước
    this.playlistEl
      .querySelector(`.${this.CLASS.ACTIVE}`)
      ?.classList.remove(this.CLASS.ACTIVE);

    // Thêm class active cho bài hiện tại
    const currentSongEl = this.playlistEl.querySelector(
      `[data-index="${this.currentSongIndex}"]`
    );
    currentSongEl?.classList.add(this.CLASS.ACTIVE);
  },

  // =====================
  // Core Logic
  // =====================
  loadCurrentSong(autoPlay = true) {
    // Reset hiệu ứng quay CD
    this.cdEL.classList.remove(this.CLASS.SPIN);

    // Cập nhật tiêu đề bài hát
    this.currentSongTitleEl.textContent =
      this.songs[this.currentSongIndex].name;

    // Gán đường dẫn nhạc
    this.audioEl.src = this.songs[this.currentSongIndex].path;

    // Phát nhạc tự động nếu cần
    if (autoPlay) {
      this.audioEl.play();
    }

    // Lưu index bài đã phát
    this.playedSongsIndex.add(this.currentSongIndex);

    // Cập nhật UI active
    this.updateActiveSongUI();

    // Lưu state
    this.saveState();
  },

  handlePrevOrNext(step) {
    // Tính toán index bài hát mới
    this.currentSongIndex =
      this.isRandom && step === this.NEXT
        ? this.randomSong()
        : (this.currentSongIndex + step + this.songs.length) %
          this.songs.length;

    // Load bài hát mới
    this.loadCurrentSong();
  },

  handleClickSong(index) {
    // Lấy index từ bài được click
    this.currentSongIndex = Number(index);

    // Load bài hát đó
    this.loadCurrentSong();
  },

  randomSong() {
    // Nếu tất cả bài đã phát → reset lại
    if (this.playedSongsIndex.size === this.allSongsIndex.size) {
      this.playedSongsIndex.clear();

      // Giữ lại bài hiện tại nếu có nhiều hơn 1 bài
      if (this.allSongsIndex.size > 1) {
        this.playedSongsIndex.add(this.currentSongIndex);
      }
    }

    // Lấy danh sách index chưa phát
    const notPlayed = this.getSetDifference(
      this.allSongsIndex,
      this.playedSongsIndex
    );

    // Chuyển set thành mảng
    const arr = Array.from(notPlayed);

    // Random 1 index trong danh sách chưa phát
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // =====================
  // State Persistence
  // =====================
  saveState() {
    // Lưu state vào localStorage
    const state = {
      currentSongIndex: this.currentSongIndex,
      isRepeat: this.isRepeat,
      isRandom: this.isRandom,
      currentTime: this.audioEl.currentTime,
      playedSongsIndex: Array.from(this.playedSongsIndex),
    };
    localStorage.setItem("playerState", JSON.stringify(state));
  },

  loadState() {
    // Khôi phục state từ localStorage
    const state = JSON.parse(localStorage.getItem("playerState") || "{}");

    if (state.currentSongIndex !== undefined) {
      this.currentSongIndex = state.currentSongIndex;
    }
    if (state.isRepeat !== undefined) {
      this.isRepeat = state.isRepeat;
      this.toggleClass(this.btnRepeatEl, this.CLASS.ACTIVE, this.isRepeat);
    }
    if (state.isRandom !== undefined) {
      this.isRandom = state.isRandom;
      this.toggleClass(this.btnRandomEl, this.CLASS.ACTIVE, this.isRandom);
    }
    if (state.playedSongsIndex) {
      this.playedSongsIndex = new Set(state.playedSongsIndex);
    }

    // Load nhạc và set thời gian trước khi play
    this.loadCurrentSong(false);
    if (state.currentTime) {
      this.audioEl.currentTime = state.currentTime;
    }
  },

  // =====================
  // Helpers
  // =====================
  formatTime(seconds) {
    // Nếu giá trị không hợp lệ → trả về 00:00
    if (!Number.isFinite(seconds)) return "00:00";

    // Tính giờ, phút, giây
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Format thành chuỗi HH:MM:SS hoặc MM:SS
    return [
      hrs > 0 ? String(hrs).padStart(2, "0") : null,
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  },

  toggleClass(element, className, condition) {
    // Thêm hoặc xóa class tùy theo điều kiện
    element.classList.toggle(className, condition);
  },

  getSetDifference(a, b) {
    // Nếu browser hỗ trợ Set.difference → dùng trực tiếp
    if (typeof a.difference === "function") return a.difference(b);

    // Nếu không → filter thủ công
    return new Set([...a].filter((x) => !b.has(x)));
  },
};

// =====================
// Start App
// =====================
player.init();
