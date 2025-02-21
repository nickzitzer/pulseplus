// TODO: Customize theme settings
import { useConfig } from 'nextra-theme-docs'

export default {
  logo: <span style={{ fontWeight: 600 }}>PulsePlus Docs</span>,
  project: {
    link: 'https://github.com/yourorg/pulseplus'
  },
  docsRepositoryBase: 'https://github.com/yourorg/pulseplus-docs/blob/main',
  footer: {
    text: `MIT ${new Date().getFullYear()} © Your Organization`
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – PulsePlus'
    }
  }
} 