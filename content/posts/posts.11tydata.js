module.exports = {
  permalink: function(data) {
    return `/posts/${data.page.fileSlug}/index.html`;
  }
};
