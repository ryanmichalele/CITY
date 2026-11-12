import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'CITI BANK — Content & Accounts',
  projectId: 'mc5ry4cs',
  dataset: 'production',
  plugins: [structureTool({structure}), visionTool()],
  schema: {
    types: schemaTypes,
    // Keep unknown fields out of the way for editors.
    templates: [],
  },
  document: {
    // Applications and audit events are managed by the site, not created by hand.
    newDocumentOptions: (prev) =>
      prev.filter(({templateId}) => !['application', 'login', 'auditEvent'].includes(templateId)),
  },
})
