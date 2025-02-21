export default {
  logo: <span>PulsePlus Documentation</span>,
  project: {
    link: 'https://github.com/yourusername/pulseplus'
  },
  docsRepositoryBase: 'https://github.com/yourusername/pulseplus/tree/main/docs',
  footer: {
    text: `PulsePlus ${new Date().getFullYear()} © All Rights Reserved.`
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – PulsePlus Docs'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="PulsePlus Documentation" />
      <meta name="og:title" content="PulsePlus Documentation" />
    </>
  ),
  primaryHue: 210
} 