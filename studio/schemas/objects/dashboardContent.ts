import {defineArrayMember, defineField, defineType} from 'sanity'

const toneOptions = {
  list: [
    {title: 'On / active', value: 'on'},
    {title: 'Off / inactive', value: 'off'},
    {title: 'Coming soon', value: 'soon'},
  ],
  layout: 'radio' as const,
}

/**
 * Every piece of dashboard content an editor can change.
 *
 * Used twice:
 *  - inside each `application` document (per-user overrides)
 *  - inside the `dashboardDefaults` singleton (fallback for all users)
 *
 * The site merges: per-user value -> defaults singleton -> built-in copy.
 */
export const dashboardContent = defineType({
  name: 'dashboardContent',
  title: 'Dashboard content',
  type: 'object',
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero panel',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow text', type: 'string'}),
        defineField({name: 'availableLabel', title: 'Available balance label', type: 'string'}),
        defineField({name: 'availableSub', title: 'Available balance sub-label', type: 'string'}),
        defineField({name: 'statusLabel', title: 'Status label', type: 'string'}),
        defineField({name: 'typeLabel', title: 'Account type label', type: 'string'}),
        defineField({name: 'openedLabel', title: 'Opened label', type: 'string'}),
        defineField({name: 'referenceLabel', title: 'Reference label', type: 'string'}),
        defineField({name: 'holderLabel', title: 'Account holder label', type: 'string'}),
      ],
    }),

    defineField({
      name: 'sectionTitles',
      title: 'Section titles',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'quickActions', title: 'Quick actions', type: 'string'}),
        defineField({name: 'products', title: 'Products', type: 'string'}),
        defineField({name: 'services', title: 'Services', type: 'string'}),
        defineField({name: 'payments', title: 'Payments', type: 'string'}),
        defineField({name: 'transactions', title: 'Transactions', type: 'string'}),
        defineField({name: 'activity', title: 'Activity', type: 'string'}),
        defineField({name: 'notifications', title: 'Notifications', type: 'string'}),
        defineField({name: 'security', title: 'Security', type: 'string'}),
        defineField({name: 'support', title: 'Support', type: 'string'}),
        defineField({name: 'details', title: 'Account details', type: 'string'}),
        defineField({name: 'credentials', title: 'Credentials panel', type: 'string'}),
      ],
    }),

    defineField({
      name: 'stats',
      title: 'Stat cards',
      description: 'The four summary cards at the top of the dashboard.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statCard',
          fields: [
            defineField({name: 'key', title: 'Key', type: 'string', description: 'Stable key, e.g. available / current / type / status'}),
            defineField({name: 'label', title: 'Label', type: 'string'}),
            defineField({name: 'value', title: 'Value', type: 'string'}),
            defineField({name: 'sub', title: 'Sub-label', type: 'string'}),
            defineField({name: 'icon', title: 'Icon name', type: 'string'}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),

    defineField({
      name: 'details',
      title: 'Account information rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'detailRow',
          fields: [
            defineField({name: 'key', title: 'Key', type: 'string'}),
            defineField({name: 'label', title: 'Label', type: 'string'}),
            defineField({name: 'value', title: 'Value', type: 'string'}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),

    defineField({
      name: 'quickActions',
      title: 'Quick actions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'quickActionItem',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string'}),
            defineField({name: 'sub', title: 'Sub-label', type: 'string'}),
            defineField({name: 'icon', title: 'Icon name', type: 'string'}),
            defineField({name: 'target', title: 'Scroll target', type: 'string', description: 'Section id, e.g. #payments'}),
          ],
          preview: {select: {title: 'label', subtitle: 'sub'}},
        }),
      ],
    }),

    defineField({
      name: 'services',
      title: 'Service cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'serviceItem',
          fields: [
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'sub', title: 'Description', type: 'text', rows: 2}),
            defineField({name: 'badge', title: 'Badge', type: 'string'}),
            defineField({name: 'tone', title: 'Badge tone', type: 'string', options: toneOptions}),
            defineField({name: 'icon', title: 'Icon name', type: 'string'}),
          ],
          preview: {select: {title: 'title', subtitle: 'badge'}},
        }),
      ],
    }),

    defineField({
      name: 'products',
      title: 'Product cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'productItem',
          fields: [
            defineField({name: 'name', title: 'Name', type: 'string'}),
            defineField({name: 'type', title: 'Type', type: 'string'}),
            defineField({name: 'desc', title: 'Description', type: 'text', rows: 2}),
            defineField({name: 'badge', title: 'Badge', type: 'string'}),
            defineField({name: 'tone', title: 'Badge tone', type: 'string', options: toneOptions}),
            defineField({name: 'ctaLabel', title: 'Button label', type: 'string'}),
            defineField({name: 'ctaHref', title: 'Button link', type: 'string'}),
          ],
          preview: {select: {title: 'name', subtitle: 'type'}},
        }),
      ],
    }),

    defineField({
      name: 'notices',
      title: 'Notices / banners',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'noticeItem',
          fields: [
            defineField({name: 'text', title: 'Text', type: 'text', rows: 2}),
            defineField({name: 'tone', title: 'Tone', type: 'string', options: {list: ['info', 'success', 'warning', 'critical'], layout: 'radio'}}),
            defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
            defineField({name: 'linkLabel', title: 'Link label', type: 'string'}),
            defineField({name: 'linkHref', title: 'Link URL', type: 'string'}),
          ],
          preview: {select: {title: 'text', subtitle: 'tone'}},
        }),
      ],
    }),

    defineField({
      name: 'activity',
      title: 'Activity timeline',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'activityItem',
          fields: [
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'meta', title: 'Meta', type: 'string'}),
            defineField({name: 'at', title: 'When', type: 'datetime'}),
            defineField({name: 'icon', title: 'Icon name', type: 'string'}),
            defineField({name: 'tone', title: 'Tone', type: 'string', options: {list: ['neutral', 'credit', 'debit'], layout: 'radio'}}),
          ],
          preview: {select: {title: 'title', subtitle: 'meta'}},
        }),
      ],
    }),

    defineField({
      name: 'transactions',
      title: 'Transactions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'transactionItem',
          fields: [
            defineField({name: 'date', title: 'Date', type: 'datetime'}),
            defineField({name: 'description', title: 'Description', type: 'string'}),
            defineField({name: 'amount', title: 'Amount', type: 'number'}),
            defineField({name: 'type', title: 'Type', type: 'string', options: {list: ['deposit', 'credit', 'debit', 'withdrawal', 'payment'], layout: 'dropdown'}}),
            defineField({name: 'status', title: 'Status', type: 'string', options: {list: ['posted', 'pending', 'failed'], layout: 'dropdown'}}),
            defineField({name: 'balanceAfter', title: 'Balance after', type: 'number'}),
          ],
          preview: {select: {title: 'description', subtitle: 'amount'}},
        }),
      ],
    }),

    defineField({
      name: 'payments',
      title: 'Payments',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({
          name: 'upcoming',
          title: 'Upcoming payment',
          type: 'object',
          fields: [
            defineField({name: 'active', title: 'Show upcoming payment', type: 'boolean', initialValue: false}),
            defineField({name: 'dueDate', title: 'Due date', type: 'date'}),
            defineField({name: 'amount', title: 'Amount', type: 'number'}),
            defineField({name: 'payee', title: 'Payee', type: 'string'}),
          ],
        }),
        defineField({
          name: 'history',
          title: 'Payment history',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'paymentHistoryItem',
              fields: [
                defineField({name: 'description', title: 'Description', type: 'string'}),
                defineField({name: 'date', title: 'Date', type: 'date'}),
                defineField({name: 'amount', title: 'Amount', type: 'number'}),
              ],
              preview: {select: {title: 'description', subtitle: 'date'}},
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'notifications',
      title: 'Notifications',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'notificationItem',
          fields: [
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'body', title: 'Body', type: 'text', rows: 2}),
            defineField({name: 'at', title: 'When', type: 'datetime'}),
            defineField({name: 'read', title: 'Read', type: 'boolean', initialValue: false}),
          ],
          preview: {select: {title: 'title', subtitle: 'body'}},
        }),
      ],
    }),

    defineField({
      name: 'security',
      title: 'Security panel',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({name: 'body', title: 'Body', type: 'text', rows: 3}),
        defineField({
          name: 'items',
          title: 'Items',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'securityItem',
              fields: [
                defineField({name: 'label', title: 'Label', type: 'string'}),
                defineField({name: 'value', title: 'Value', type: 'string'}),
              ],
              preview: {select: {title: 'label', subtitle: 'value'}},
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'support',
      title: 'Support panel',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({name: 'body', title: 'Body', type: 'text', rows: 3}),
        defineField({name: 'phone', title: 'Phone', type: 'string'}),
        defineField({name: 'hours', title: 'Hours', type: 'string'}),
        defineField({name: 'email', title: 'Email', type: 'string'}),
        defineField({
          name: 'links',
          title: 'Links',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'supportLink',
              fields: [
                defineField({name: 'label', title: 'Label', type: 'string'}),
                defineField({name: 'href', title: 'URL', type: 'string'}),
              ],
              preview: {select: {title: 'label', subtitle: 'href'}},
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'emptyStates',
      title: 'Empty-state copy',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'balances', title: 'Balances', type: 'string'}),
        defineField({name: 'payments', title: 'Payments', type: 'string'}),
        defineField({name: 'transactions', title: 'Transactions', type: 'string'}),
        defineField({name: 'activity', title: 'Activity', type: 'string'}),
        defineField({name: 'statements', title: 'Statements', type: 'string'}),
      ],
    }),

    defineField({
      name: 'credentialsPanel',
      title: 'Credentials panel',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({name: 'loginIdLabel', title: 'Login ID label', type: 'string'}),
        defineField({name: 'passwordLabel', title: 'Password label', type: 'string'}),
        defineField({name: 'note', title: 'Note', type: 'text', rows: 2}),
      ],
    }),
  ],
})
