module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addShortcode("asset", function(path) {
    const base = (this.ctx.site && this.ctx.site.baseUrl) || "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const normalizedPath = String(path).replace(/^\//, "");
    return `${normalizedBase}${normalizedPath}`;
  });
  eleventyConfig.addCollection("post", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./content/posts/*.md");
  });
  eleventyConfig.addFilter("displayDate", function(value) {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  });

  return {
    dir: {
      input: ".",
      includes: "src/_includes",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
    passthroughFileCopy: true
  };
};
