module.exports = {
  siteMetadata: {
    title: 'Tech Blog',
    siteDescription: 'Tech Blog - A blog by Einat Bertenthal',
    authorName: 'Einat Bertenthal'
  },
  plugins: [
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: 'GatsbyJS',
        short_name: 'GatsbyJS',
        start_url: '/',
        background_color: '#6b37bf',
        theme_color: '#6b37bf',
        // Enables "Add to Homescreen" prompt and disables browser UI (including back button)
        // see https://developers.google.com/web/fundamentals/web-app-manifest/#display
        display: 'standalone'
        // icon: 'public/favicon.png' // This path is relative to the root of the site.
      }
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'src',
        path: `${__dirname}/src/blog-posts`
      }
    },
    {
      resolve: 'gatsby-plugin-typography',
      options: {
        pathToConfigModule: 'src/utils/typography.js'
      }
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-images',
            options: {
              maxWidth: 590,
              showCaptions: true
            }
          },
          {
            resolve: 'gatsby-remark-prismjs',
            options: {
              classPrefix: 'language-'
            }
          },
          'gatsby-remark-reading-time'
        ]
      }
    },
    'gatsby-plugin-offline',
    `gatsby-plugin-react-helmet`,
    'gatsby-plugin-styled-components'
  ]
}
