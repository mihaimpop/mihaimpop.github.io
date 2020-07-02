module.exports = {
  siteMetadata: {
    description: "Personal page of Mihai Pop",
    locale: "en",
    title: "Mihai Pop",
  },
  plugins: [
    {
      resolve: "@wkocjan/gatsby-theme-intro",
      options: {
        theme: "classic",
        basePath: "/",
        contentPath: "content/",
        showThemeLogo: true,
      },
    },
  ],
}