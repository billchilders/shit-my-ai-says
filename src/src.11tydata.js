module.exports = {
  site: {
    title: "Shit My AI Says",
    baseUrl: process.env.ELEVENTY_ENV === "production" ? "/shit-my-ai-says/" : "/"
  },
  permalink: function(data) {
    if (data.page.inputPath.endsWith('/src/index.njk')) {
      return '/index.html';
    }
    return false;
  }
};
