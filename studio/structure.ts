import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('CITI BANK')
    .items([
      S.listItem()
        .title('Applications')
        .child(
          S.documentTypeList('application')
            .title('Applications')
            .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Accounts')
        .child(S.documentTypeList('account').title('Accounts')),
      S.listItem()
        .title('Logins')
        .child(S.documentTypeList('login').title('Login mappings')),
      S.divider(),
      S.listItem()
        .title('Dashboard defaults')
        .child(S.document().schemaType('dashboardDefaults').documentId('dashboardDefaults')),
      S.listItem()
        .title('Site settings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.listItem()
        .title('Products')
        .child(S.documentTypeList('product').title('Products')),
      S.listItem()
        .title('Services')
        .child(S.documentTypeList('service').title('Services')),
      S.listItem()
        .title('Quick actions')
        .child(S.documentTypeList('quickAction').title('Quick actions')),
      S.listItem()
        .title('Account types')
        .child(S.documentTypeList('accountType').title('Account types')),
      S.listItem()
        .title('Agreements')
        .child(S.documentTypeList('agreement').title('Agreements')),
      S.divider(),
      S.listItem()
        .title('Transactions')
        .child(
          S.documentTypeList('transaction')
            .title('Transactions')
            .defaultOrdering([{field: 'date', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Payments')
        .child(S.documentTypeList('payment').title('Payments')),
      S.listItem()
        .title('Activity events')
        .child(
          S.documentTypeList('activityEvent')
            .title('Activity events')
            .defaultOrdering([{field: 'at', direction: 'desc'}]),
        ),
      S.divider(),
      S.listItem()
        .title('Audit log')
        .child(
          S.documentTypeList('auditEvent')
            .title('Audit log')
            .defaultOrdering([{field: 'at', direction: 'desc'}]),
        ),
    ])
