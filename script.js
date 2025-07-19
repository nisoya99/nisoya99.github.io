document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("post-container");
  const filterTag = container?.dataset.filter || null;

  const posts = [
    "paris-july25.html" //, und dann unten den weiteren Post einfügen
    // weitere Posts hier eintragen
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
