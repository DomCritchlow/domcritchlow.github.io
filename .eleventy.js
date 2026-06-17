const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

module.exports = function(eleventyConfig) {
  // Copy static assets to output
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("src/css");

  // Pins app — Universal Links. The AASA must sit at the site root under
  // /.well-known/ (served as-is, no templating); the fallback page answers
  // /pinned/p for anyone without the app. Both live in static/ (outside the
  // Eleventy "src" input dir) so they're copied verbatim, never templated.
  eleventyConfig.addPassthroughCopy({
    "static/well-known/apple-app-site-association": ".well-known/apple-app-site-association"
  });
  eleventyConfig.addPassthroughCopy({ "static/pinned-p": "pinned/p" });
  
  // Date filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLLL dd, yyyy");
  });
  
  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });
  
  // Get the first n elements of a collection
  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });
  
  // Create posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });
  
  // Create projects collection with dates as Date objects
  eleventyConfig.addCollection("projectsSorted", function(collectionApi) {
    const projects = require('./src/_data/projects.js');
    return projects.map(project => ({
      ...project,
      date: new Date(project.date)
    })).sort((a, b) => b.date - a.date);
  });

  // Projects that get short-link / github redirects generated.
  // Internal projects (those with a real page on this site) are excluded
  // so their permalink doesn't collide with the page that lives there.
  eleventyConfig.addCollection("redirectProjects", function() {
    return require('./src/_data/projects.js').filter(project => !project.internal);
  });

  // Create latest collection (combines posts and projects)
  eleventyConfig.addCollection("latest", function(collectionApi) {
    const items = [];
    
    // Add blog posts
    const posts = collectionApi.getFilteredByGlob("src/posts/*.md");
    posts.forEach(post => {
      items.push({
        title: post.data.title,
        url: post.url,
        date: post.date,
        type: "writing",
        description: post.data.description
      });
    });
    
    // Add projects
    const projects = require('./src/_data/projects.js');
    projects.forEach(project => {
      items.push({
        title: project.title,
        url: project.url,
        date: new Date(project.date),
        type: "project",
        description: project.description,
        logo: project.logo,
        github: project.github
      });
    });
    
    // Sort by date, newest first, and return top 8
    return items.sort((a, b) => b.date - a.date).slice(0, 8);
  });
  
  // Markdown configuration
  const markdownLibrary = markdownIt({
    html: true,
    breaks: false,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "header-anchor",
      symbol: "#",
    }),
    level: [1, 2, 3, 4],
  });
  
  eleventyConfig.setLibrary("md", markdownLibrary);
  
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
