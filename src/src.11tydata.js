module.exports = {
  permalink: function(data) {
    if (data.page.inputPath.endsWith('/src/index.njk')) {
      return '/index.html';
    }
    return false;
  }
};
