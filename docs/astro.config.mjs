// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://knotviz.com',
  base: '/docs',
  trailingSlash: 'never',
  integrations: [
    starlight({
      title: 'Knotviz docs',
      description:
        'Graph visualization in the browser. Drop a file, explore, filter, colour, export.',
      favicon: '/favicon.ico',
      tableOfContents: false,
      logo: {
        light: './public/logo-light.png',
        dark: './public/logo-dark.png',
        replacesTitle: true,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/mhamas/knotviz',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/mhamas/knotviz/edit/main/docs/',
      },
      lastUpdated: true,
      customCss: ['./src/styles/custom.css'],
      components: {
        Header: './src/components/Header.astro',
        SocialIcons: './src/components/SocialIcons.astro',
        PageTitle: './src/components/PageTitle.astro',
        Footer: './src/components/Footer.astro',
      },
      sidebar: [
        { label: 'Quickstart', slug: 'index' },
        {
          label: 'Input formats',
          items: [
            { label: 'Overview', slug: 'input-formats' },
            { label: 'JSON', slug: 'input-formats/json' },
            { label: 'CSV edge list', slug: 'input-formats/csv-edge-list' },
            { label: 'CSV pair', slug: 'input-formats/csv-pair' },
            { label: 'GraphML', slug: 'input-formats/graphml' },
            { label: 'GEXF', slug: 'input-formats/gexf' },
          ],
        },
        {
          label: 'Working with graphs',
          items: [
            { label: 'Explore', slug: 'explore' },
            { label: 'Simulation', slug: 'simulation' },
            { label: 'Filter', slug: 'filter' },
            { label: 'Search', slug: 'search' },
            { label: 'Analyze', slug: 'analyze' },
            { label: 'Export', slug: 'export' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Limits', slug: 'limits' },
            { label: 'Compare', slug: 'compare' },
            { label: 'Troubleshooting', slug: 'troubleshooting' },
          ],
        },
      ],
    }),
  ],
})
