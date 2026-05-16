module.exports = {
  site: {
    title: "Shit My AI Says",
    description: "A curated gallery of delightful, strange, and funny AI chat moments.",
    url: "https://shitmyaisays.nulldevice.net",
    baseUrl: "/"
  },
  permalink: function(data) {
    if (data.page.inputPath.endsWith('/src/index.njk')) {
      return '/index.html';
    }
    return false;
  }
};
