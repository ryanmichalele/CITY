import {defineArrayMember, defineField, defineType} from 'sanity'

export const application = defineType({
  name: 'application',
  title: 'Application',
  type: 'document',
  groups: [
    {name: 'application', title: 'Application', default: true},
    {name: 'login', title: 'Login & security'},
    {name: 'dashboard', title: 'Dashboard content'},
    {name: 'meta', title: 'Submission meta'},
  ],
  fields: [
    defineField({
      name: 'reference',
      title: 'Application reference',
      type: 'string',
      group: 'application',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'application',
      options: {
        list: ['submitted', 'approved', 'declined', 'closed'],
        layout: 'radio',
      },
      initialValue: 'submitted',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted at',
      type: 'datetime',
      group: 'application',
      readOnly: true,
    }),
    defineField({
      name: 'accountType',
      title: 'Account type',
      type: 'string',
      group: 'application',
      options: {
        list: [
          {title: 'Checking', value: 'checking'},
          {title: 'Savings', value: 'savings'},
          {title: 'Money market', value: 'money-market'},
        ],
      },
    }),

    defineField({
      name: 'personal',
      title: 'Personal information',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'firstName', title: 'First name', type: 'string'}),
        defineField({name: 'middleName', title: 'Middle name', type: 'string'}),
        defineField({name: 'lastName', title: 'Last name', type: 'string'}),
        defineField({name: 'dob', title: 'Date of birth', type: 'date'}),
        defineField({name: 'ssnLast4', title: 'SSN last 4', type: 'string', description: 'Only the last four digits are stored.'}),
        defineField({name: 'citizenship', title: 'Citizenship', type: 'string'}),
        defineField({name: 'ownership', title: 'Ownership', type: 'string'}),
      ],
    }),

    defineField({
      name: 'contact',
      title: 'Contact information',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'email', title: 'Email', type: 'string'}),
        defineField({name: 'phone', title: 'Phone', type: 'string'}),
        defineField({name: 'street', title: 'Street', type: 'string'}),
        defineField({name: 'apt', title: 'Apt / unit', type: 'string'}),
        defineField({name: 'city', title: 'City', type: 'string'}),
        defineField({name: 'state', title: 'State', type: 'string'}),
        defineField({name: 'zip', title: 'ZIP', type: 'string'}),
        defineField({name: 'country', title: 'Country', type: 'string'}),
        defineField({name: 'mailingSame', title: 'Mailing same as home', type: 'string', options: {list: ['yes', 'no'], layout: 'radio'}}),
        defineField({
          name: 'mailing',
          title: 'Mailing address',
          type: 'object',
          fields: [
            defineField({name: 'street', title: 'Street', type: 'string'}),
            defineField({name: 'apt', title: 'Apt / unit', type: 'string'}),
            defineField({name: 'city', title: 'City', type: 'string'}),
            defineField({name: 'state', title: 'State', type: 'string'}),
            defineField({name: 'zip', title: 'ZIP', type: 'string'}),
          ],
        }),
      ],
    }),

    defineField({
      name: 'employment',
      title: 'Employment',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'status', title: 'Employment status', type: 'string'}),
        defineField({name: 'occupation', title: 'Occupation', type: 'string'}),
        defineField({name: 'employer', title: 'Employer', type: 'string'}),
        defineField({name: 'jobTitle', title: 'Job title', type: 'string'}),
        defineField({name: 'industry', title: 'Industry', type: 'string'}),
        defineField({name: 'income', title: 'Annual income', type: 'string'}),
      ],
    }),

    defineField({
      name: 'financial',
      title: 'Financial',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'incomeSource', title: 'Income source', type: 'string'}),
        defineField({name: 'sourceFunds', title: 'Source of funds', type: 'string'}),
        defineField({name: 'monthlyDeposits', title: 'Monthly deposits', type: 'string'}),
        defineField({name: 'monthlyWithdrawals', title: 'Monthly withdrawals', type: 'string'}),
        defineField({name: 'purpose', title: 'Purpose', type: 'string'}),
        defineField({name: 'activity', title: 'Expected activity', type: 'string'}),
      ],
    }),

    defineField({
      name: 'tax',
      title: 'Tax & legal',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'usResident', title: 'US resident', type: 'string', options: {list: ['yes', 'no'], layout: 'radio'}}),
        defineField({name: 'tinType', title: 'TIN type', type: 'string'}),
        defineField({name: 'residencyCountry', title: 'Residency country', type: 'string'}),
        defineField({name: 'certification', title: 'Certification', type: 'boolean'}),
        defineField({name: 'declarations', title: 'Declarations', type: 'boolean'}),
      ],
    }),

    defineField({
      name: 'agreements',
      title: 'Agreements',
      type: 'object',
      group: 'application',
      fields: [
        defineField({name: 'accepted', title: 'Accepted agreements', type: 'array', of: [defineArrayMember({type: 'string'})]}),
        defineField({name: 'signature', title: 'Typed signature', type: 'string'}),
        defineField({name: 'consent', title: 'E-sign consent', type: 'boolean'}),
        defineField({name: 'acceptedAt', title: 'Accepted at', type: 'datetime'}),
        defineField({name: 'docVersion', title: 'Document version', type: 'string'}),
      ],
    }),

    defineField({
      name: 'credentials',
      title: 'Login credentials',
      type: 'object',
      group: 'login',
      fields: [
        defineField({name: 'loginId', title: 'Login ID', type: 'string', readOnly: true}),
        defineField({
          name: 'passwordHash',
          title: 'Password hash',
          type: 'string',
          readOnly: true,
          description: 'scrypt hash. Plaintext passwords are never stored.',
        }),
        defineField({name: 'passwordAlgo', title: 'Hash algorithm', type: 'string', readOnly: true}),
        defineField({name: 'passwordUpdatedAt', title: 'Password last changed', type: 'datetime', readOnly: true}),
      ],
    }),

    defineField({
      name: 'dashboard',
      title: 'Dashboard content (this user)',
      type: 'dashboardContent',
      group: 'dashboard',
      description: 'Anything set here overrides the shared dashboard defaults for this user only.',
    }),

    defineField({
      name: 'turnstile',
      title: 'Turnstile verification',
      type: 'object',
      group: 'meta',
      readOnly: true,
      fields: [
        defineField({name: 'success', title: 'Verified', type: 'boolean'}),
        defineField({name: 'hostname', title: 'Hostname', type: 'string'}),
        defineField({name: 'action', title: 'Action', type: 'string'}),
        defineField({name: 'challengeAt', title: 'Verified at', type: 'datetime'}),
      ],
    }),

    defineField({
      name: 'meta',
      title: 'Submission meta',
      type: 'object',
      group: 'meta',
      readOnly: true,
      fields: [
        defineField({name: 'ipHash', title: 'IP hash', type: 'string'}),
        defineField({name: 'userAgent', title: 'User agent', type: 'string'}),
        defineField({name: 'source', title: 'Source', type: 'string'}),
      ],
    }),
  ],

  preview: {
    select: {
      ref: 'reference',
      status: 'status',
      first: 'personal.firstName',
      last: 'personal.lastName',
      email: 'contact.email',
    },
    prepare({ref, status, first, last, email}) {
      const name = [first, last].filter(Boolean).join(' ') || 'Unnamed applicant'
      return {
        title: `${name} — ${ref || 'no reference'}`,
        subtitle: [status, email].filter(Boolean).join(' · '),
      }
    },
  },
})
