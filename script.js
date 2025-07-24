document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("post-container");
  if (!container) return;

  const filterTag = container.dataset.filter || null;

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
    // --- MASONRY INITIALISIEREN ---
    imagesLoaded(container, () => {
      const msnry = new Masonry(container, {
        itemSelector: '.post',
        gutter: 20,
        percentPosition: true,
        fitWidth: true
      });

      window.addEventListener("resize", () => {
        msnry.layout();
      });
    });
  });
});
