module.exports = {
  site: {
    title: "Shit My AI Says",
    baseUrl: "/"
  },
  permalink: function(data) {
    if (data.page.inputPath.endsWith('/src/index.njk')) {
      return '/index.html';
    }
    return false;
  }
};
