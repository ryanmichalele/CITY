import {defineField, defineType} from 'sanity'

export const transaction = defineType({
  name: 'transaction',
  title: 'Transaction',
  type: 'document',
  fields: [
    defineField({
      name: 'account',
      title: 'Account',
      type: 'reference',
      to: [{type: 'account'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'date', title: 'Date', type: 'datetime', validation: (rule) => rule.required()}),
    defineField({name: 'description', title: 'Description', type: 'string'}),
    defineField({name: 'amount', title: 'Amount', type: 'number'}),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: ['deposit', 'credit', 'debit', 'withdrawal', 'payment'],
        layout: 'dropdown',
      },
    }),
    defineField({name: 'status', title: 'Status', type: 'string', options: {list: ['posted', 'pending', 'failed'], layout: 'dropdown'}}),
    defineField({name: 'balanceAfter', title: 'Balance after', type: 'number'}),
  ],
  orderings: [{title: 'Newest first', name: 'newest', by: [{field: 'date', direction: 'desc'}]}],
})

export const payment = defineType({
  name: 'payment',
  title: 'Payment',
  type: 'document',
  fields: [
    defineField({
      name: 'account',
      title: 'Account',
      type: 'reference',
      to: [{type: 'account'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'dueDate', title: 'Due date', type: 'date'}),
    defineField({name: 'amount', title: 'Amount', type: 'number'}),
    defineField({name: 'payee', title: 'Payee', type: 'string'}),
    defineField({name: 'status', title: 'Status', type: 'string', options: {list: ['upcoming', 'paid', 'failed'], layout: 'radio'}, initialValue: 'upcoming'}),
  ],
})

export const activityEvent = defineType({
  name: 'activityEvent',
  title: 'Activity event',
  type: 'document',
  fields: [
    defineField({
      name: 'account',
      title: 'Account',
      type: 'reference',
      to: [{type: 'account'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'meta', title: 'Meta', type: 'string'}),
    defineField({name: 'at', title: 'When', type: 'datetime'}),
    defineField({name: 'icon', title: 'Icon name', type: 'string'}),
    defineField({name: 'tone', title: 'Tone', type: 'string', options: {list: ['neutral', 'credit', 'debit'], layout: 'radio'}}),
  ],
  orderings: [{title: 'Newest first', name: 'newest', by: [{field: 'at', direction: 'desc'}]}],
})

export const login = defineType({
  name: 'login',
  title: 'Login mapping',
  type: 'document',
  fields: [
    defineField({name: 'loginId', title: 'Login ID', type: 'string', readOnly: true}),
    defineField({name: 'application', title: 'Application', type: 'reference', to: [{type: 'application'}], readOnly: true}),
    defineField({name: 'createdAt', title: 'Created at', type: 'datetime', readOnly: true}),
  ],
  preview: {
    select: {title: 'loginId'},
  },
})

export const auditEvent = defineType({
  name: 'auditEvent',
  title: 'Audit event',
  type: 'document',
  fields: [
    defineField({name: 'action', title: 'Action', type: 'string'}),
    defineField({name: 'actor', title: 'Actor', type: 'string'}),
    defineField({name: 'target', title: 'Target', type: 'string'}),
    defineField({name: 'at', title: 'When', type: 'datetime'}),
    defineField({name: 'ipHash', title: 'IP hash', type: 'string'}),
    defineField({name: 'detail', title: 'Detail', type: 'text', rows: 3}),
  ],
  orderings: [{title: 'Newest first', name: 'newest', by: [{field: 'at', direction: 'desc'}]}],
})
