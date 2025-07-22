document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("post-container");
  const filterTag = container?.dataset.filter || null;

  const posts = [
    "paris-july25.html",
    "nishikigoi-2023.html" //, und dann unten den weiteren Post einfügen
  ];

  posts.forEach(async (filename) => {
    const res = await fetch(`posts/${filename}`);
    const html = await res.text();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const post = wrapper.querySelector(".post");

    if (!filterTag || post.dataset.tag === filterTag) {
      container.appendChild(post);
    }
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

  if (
    e.target === lightbox ||
    e.target === closeBtn
  ) {
    lightbox.classList.remove("active");
    lightboxImg.src = "";
  }
});

