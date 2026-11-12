import {defineField, defineType} from 'sanity'

/**
 * Singleton: shared dashboard content used when a user's application has no
 * per-user override. One document, id `dashboardDefaults`.
 */
export const dashboardDefaults = defineType({
  name: 'dashboardDefaults',
  title: 'Dashboard defaults',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Internal title', type: 'string', initialValue: 'Dashboard defaults'}),
    defineField({
      name: 'content',
      title: 'Default content',
      type: 'dashboardContent',
      description: 'Used for every user unless that user has their own dashboard content.',
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Dashboard defaults'}
    },
  },
})
