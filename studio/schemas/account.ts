import {defineField, defineType} from 'sanity'

export const account = defineType({
  name: 'account',
  title: 'Account',
  type: 'document',
  fields: [
    defineField({
      name: 'owner',
      title: 'Owner (application)',
      type: 'reference',
      to: [{type: 'application'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'prototypeId', title: 'Prototype ID', type: 'string', readOnly: true}),
    defineField({name: 'maskedNumber', title: 'Masked account number', type: 'string'}),
    defineField({name: 'routingLast4', title: 'Routing number last 4', type: 'string'}),
    defineField({
      name: 'type',
      title: 'Account type',
      type: 'string',
      options: {
        list: [
          {title: 'Checking', value: 'checking'},
          {title: 'Savings', value: 'savings'},
          {title: 'Money market', value: 'money-market'},
        ],
      },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {list: ['Active', 'Frozen', 'Closed'], layout: 'radio'},
      initialValue: 'Active',
    }),
    defineField({name: 'openedAt', title: 'Opened at', type: 'datetime'}),
    defineField({
      name: 'balances',
      title: 'Balances',
      type: 'object',
      fields: [
        defineField({name: 'available', title: 'Available', type: 'number'}),
        defineField({name: 'current', title: 'Current', type: 'number'}),
        defineField({name: 'currency', title: 'Currency', type: 'string', initialValue: 'USD'}),
      ],
    }),
  ],
  preview: {
    select: {title: 'maskedNumber', subtitle: 'status', type: 'type'},
    prepare({title, subtitle, type}) {
      return {title: title || 'Account', subtitle: [type, subtitle].filter(Boolean).join(' · ')}
    },
  },
})
