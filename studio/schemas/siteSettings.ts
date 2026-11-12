import {defineArrayMember, defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'brandName', title: 'Brand name', type: 'string', initialValue: 'Citi'}),
    defineField({name: 'tagline', title: 'Tagline', type: 'string'}),
    defineField({
      name: 'navigation',
      title: 'Navigation links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navLink',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string'}),
            defineField({name: 'href', title: 'URL', type: 'string'}),
          ],
          preview: {select: {title: 'label', subtitle: 'href'}},
        }),
      ],
    }),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        defineField({name: 'text', title: 'Text', type: 'text', rows: 3}),
        defineField({name: 'legal', title: 'Legal line', type: 'text', rows: 2}),
      ],
    }),
    defineField({
      name: 'contactPage',
      title: 'Contact page',
      type: 'object',
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({name: 'body', title: 'Body', type: 'text', rows: 6}),
        defineField({name: 'phone', title: 'Phone', type: 'string'}),
        defineField({name: 'hours', title: 'Hours', type: 'string'}),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Site settings'}
    },
  },
})
