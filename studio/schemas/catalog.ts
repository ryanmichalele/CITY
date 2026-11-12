import {defineField, defineType} from 'sanity'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'type', title: 'Type', type: 'string'}),
    defineField({name: 'desc', title: 'Description', type: 'text', rows: 3}),
    defineField({name: 'badge', title: 'Badge', type: 'string'}),
    defineField({
      name: 'tone',
      title: 'Badge tone',
      type: 'string',
      options: {
        list: [
          {title: 'On / active', value: 'on'},
          {title: 'Off / inactive', value: 'off'},
          {title: 'Coming soon', value: 'soon'},
        ],
        layout: 'radio',
      },
      initialValue: 'on',
    }),
    defineField({name: 'ctaLabel', title: 'Button label', type: 'string'}),
    defineField({name: 'ctaHref', title: 'Button link', type: 'string'}),
    defineField({name: 'order', title: 'Order', type: 'number', initialValue: 0}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
  ],
  orderings: [{title: 'Order', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
})

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'sub', title: 'Description', type: 'text', rows: 3}),
    defineField({name: 'badge', title: 'Badge', type: 'string'}),
    defineField({
      name: 'tone',
      title: 'Badge tone',
      type: 'string',
      options: {
        list: [
          {title: 'On / active', value: 'on'},
          {title: 'Off / inactive', value: 'off'},
          {title: 'Coming soon', value: 'soon'},
        ],
        layout: 'radio',
      },
      initialValue: 'on',
    }),
    defineField({name: 'icon', title: 'Icon name', type: 'string'}),
    defineField({name: 'order', title: 'Order', type: 'number', initialValue: 0}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
  ],
  orderings: [{title: 'Order', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
})

export const quickAction = defineType({
  name: 'quickAction',
  title: 'Quick action',
  type: 'document',
  fields: [
    defineField({name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'sub', title: 'Sub-label', type: 'string'}),
    defineField({name: 'icon', title: 'Icon name', type: 'string'}),
    defineField({name: 'target', title: 'Scroll target', type: 'string', description: 'Section id, e.g. #payments'}),
    defineField({name: 'order', title: 'Order', type: 'number', initialValue: 0}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
  ],
  orderings: [{title: 'Order', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
})

export const accountType = defineType({
  name: 'accountType',
  title: 'Account type',
  type: 'document',
  fields: [
    defineField({name: 'key', title: 'Key', type: 'string', description: 'checking / savings / money-market'}),
    defineField({name: 'label', title: 'Label', type: 'string'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
    defineField({name: 'eligibility', title: 'Eligibility', type: 'text', rows: 3}),
    defineField({name: 'order', title: 'Order', type: 'number', initialValue: 0}),
  ],
})

export const agreement = defineType({
  name: 'agreement',
  title: 'Agreement',
  type: 'document',
  fields: [
    defineField({name: 'key', title: 'Key', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 6}),
    defineField({name: 'version', title: 'Version', type: 'string'}),
    defineField({name: 'effectiveDate', title: 'Effective date', type: 'date'}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
  ],
})
