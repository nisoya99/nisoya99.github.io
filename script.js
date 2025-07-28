//matrix
const matrixContainer = document.getElementById('matrix-container');

const canvas = matrixContainer.querySelector('#matrix-canvas');
const ctx = canvas.getContext('2d');

let columns, drops;
const fontSize = 20;
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%";

function resize() {
  canvas.width = window.innerWidth;

  ctx.fillStyle = 'lime';
ctx.font = '30px monospace';
ctx.fillText('Hello Matrix', 100, 100);

  
  canvas.height = window.innerHeight;
  columns = Math.floor(canvas.width / fontSize);
  drops = new Array(columns).fill(0);
}

window.addEventListener('resize', resize);
resize();

  function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#660000";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(text, x, y);
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  let animationFrameId;
  let matrixRunning = true;

  function animate() {
    if(matrixRunning){
      drawMatrix();
      animationFrameId = requestAnimationFrame(animate);
    }
  }
  animate();

const questionContainer = matrixContainer.querySelector('#question-container');
const pills = matrixContainer.querySelector('#pills');
const pillYes = matrixContainer.querySelector('#pill-yes');
const pillNo = matrixContainer.querySelector('#pill-no');
const response = matrixContainer.querySelector('#response');
const yesButton = matrixContainer.querySelector('#yes-button');
const skipButton = matrixContainer.querySelector('#skip-button');

  let questionShown = false;
  let isTyping = false;
  let skipTyping = false;

  const questionText = "You feel something, don't you?\nThere is more behind this screen. A fracture in the mask.\nDo you want to look deeper into me?";

  function typeText(element, text, callback) {
    let i = 0;
    element.innerHTML = '';
    element.style.display = 'block';
    element.style.opacity = '1';
    isTyping = true;
    skipTyping = false;

    function type() {
      if (skipTyping) {
        element.innerHTML = text.replace(/\n/g, "<br>") + '<span class="cursor">|</span>';
        isTyping = false;
        skipTyping = false;
        if (callback) callback();
        return;
      }
      if (i < text.length) {
        const char = text.charAt(i);
        element.innerHTML = element.innerHTML.replace(/<span class="cursor">.*?<\/span>/, '');
        element.innerHTML += (char === "\n" ? "<br>" : char) + '<span class="cursor">|</span>';
        i++;
        setTimeout(type, 60);
      } else {
        isTyping = false;
        if (callback) callback();
      }
    }
    type();
  }

  function showQuestion() {
    if (questionShown) return;
    questionShown = true;
    matrixRunning = false;
    cancelAnimationFrame(animationFrameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pills.style.display = "none";
    response.style.display = "none";
    yesButton.style.display = "none";
    typeText(questionContainer, questionText, () => {
      pills.style.display = "flex";
    });
  }

  const questionTimeout = setTimeout(() => {
    showQuestion();
  }, 3500);

  pillYes.addEventListener('click', () => {
    pills.style.display = "none";
    questionContainer.style.display = "none";

    const answerText = "Good. Then follow me.\nMy name is NSY99.\nYou will see what I see — in fragments of travel,\nframes, photos, stories and quiet moments.\n\nLet's begin...";

    typeText(response, answerText, () => {
      yesButton.style.display = "block";
    });
  });

  // Matrix Shutdown Animation mit Flackern + Hochlaufen + Zusammenklappen
  function matrixShutdownAnimation(callback) {
    let step = 0;
    const maxSteps = 60; // Dauer des Flackerns
    let collapseStep = 0;
    const collapseMax = canvas.height / fontSize;

    // Synchron hochlaufende Drops starten unten
    let shutdownDrops = new Array(columns).fill(Math.floor(canvas.height / fontSize));

    function drawShutdown() {
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ff6666"; // Hellrote Schrift für Shutdown
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < shutdownDrops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        const x = i * fontSize;
        const y = shutdownDrops[i] * fontSize;
        ctx.fillText(text, x, y);
      }

      for (let i = 0; i < shutdownDrops.length; i++) {
        shutdownDrops[i]--;
        if (shutdownDrops[i] < 0) shutdownDrops[i] = 0;
      }

      step++;
      if (step < maxSteps) {
        requestAnimationFrame(drawShutdown);
      } else {
        collapse();
      }
    }

    function collapse() {
      if (collapseStep < collapseMax) {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, canvas.height - collapseStep * fontSize, canvas.width, fontSize);
        collapseStep++;
        requestAnimationFrame(collapse);
      } else {
        if (callback) callback();
      }
    }

    drawShutdown();
  }

  pillNo.addEventListener('click', () => {
    pills.style.display = "none";
    questionContainer.style.display = "none";

    const noAnswerText = "Then stay in the safety of what you know.\nThis isn’t for everyone. \nYou chose silence over the unknown.\nWho knows — the world is small. We may meet again another time.";

    typeText(response, noAnswerText, () => {
      // Antwort noch 5 Sekunden sichtbar, dann langsam ausfaden
      setTimeout(() => {
        response.style.transition = "opacity 2s ease";
        response.style.opacity = '0';
        setTimeout(() => {
          response.style.display = "none";
          // Shutdown Animation starten, nach kurzem Delay
          setTimeout(() => {
            matrixShutdownAnimation(() => {
              window.close();
            });
          }, 0);
        }, 1000);
      }, 4000);
    });
  });

  yesButton.addEventListener('click', () => {
    window.location.href = "index.html";
  });

const skipButton = matrixContainer.querySelector('#skip-button');
skipButton.addEventListener('click', () => {
  window.location.href = "index.html";
});


//eigentliche Seite
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("post-container");
  const filterTag = container?.dataset.filter || null;

  const posts = [
    "paris-2025.html",
    "line-2024.html",
    "songoku-2023.html",
    "nissan-2022.html",
    "nishikigoi-2022.html",
    "rihanna-2021.html",
    "tupac-2021.html",
    "miley-2016.html",
    "marilyn-2016.html",
    "illusion-2015.html"
  ];

  Promise.all(
    posts.map(async (filename) => {
      const res = await fetch(`posts/${filename}`);
      const html = await res.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      const post = wrapper.querySelector(".post");

      if (!filterTag || post.dataset.tag === filterTag) {
        container.appendChild(post);

        // --- SLIDER-KLASSE NACH EINBINDUNG HINZUFÜGEN ---
        const slider = post.querySelector(".slider");
        if (slider) {
          const images = slider.querySelectorAll("img");
          if (images.length > 1) {
            slider.classList.add("multiple");
          } else {
            slider.classList.add("single");
          }
        }
      }
    })
  ).then(() => {

    const insertedPosts = container.querySelectorAll(".post");
    if (insertedPosts.length === 1) {
      insertedPosts[0].style.maxWidth = "90%";
    }

    // --- MASONRY INITIALISIEREN ---
    imagesLoaded(container, () => {
      const msnry = new Masonry(container, {
        itemSelector: '.post',
        gutter: 20,
        percentPosition: true,
        fitWidth: true
      });

      // ➕ Re-Layout bei Fenstergröße-Änderung
      window.addEventListener("resize", () => {
        msnry.layout();
      });
    });
  });
});

// --- LIGHTBOX ---
const lightbox = document.createElement("div");
lightbox.className = "lightbox-overlay";
lightbox.innerHTML = `
  <button class="lightbox-close">&times;</button>
  <img src="" alt="Preview" />
`;
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector("img");
const closeBtn = lightbox.querySelector(".lightbox-close");

document.addEventListener("click", (e) => {
  if (e.target.matches(".slider img")) {
    lightboxImg.src = e.target.src;
    lightbox.classList.add("active");
  }

  if (e.target === lightbox || e.target === closeBtn) {
    lightbox.classList.remove("active");
    lightboxImg.src = "";
  }
});
