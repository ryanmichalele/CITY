// Shared test fixture: a realistic submitted application draft.
module.exports = {
  accountType: 'checking',
  personal: { firstName: 'Alex', middleName: 'R', lastName: 'Morgan', dob: '1990-04-12', ssnLast4: '1234', citizenship: 'US', ownership: 'individual' },
  contact: {
    email: 'alex.morgan@example.com', phone: '(212) 555-0147',
    street: '88 Pine Street', apt: 'Apt 12C', city: 'New York', state: 'NY', zip: '10004',
    country: 'US', mailingSame: 'yes', mailing: {},
  },
  employment: { status: 'employed', occupation: 'Engineer', employer: 'Acme', jobTitle: 'SE', industry: 'Tech', income: '120000' },
  financial: { incomeSource: 'salary', sourceFunds: 'salary', monthlyDeposits: '4000', monthlyWithdrawals: '2500', purpose: 'savings', activity: 'moderate' },
  tax: { usResident: 'yes', tinType: 'ssn', residencyCountry: 'US', certification: true, declarations: true },
  agreements: { accepted: {}, signature: 'Alex Morgan', consent: true, acceptedAt: '2026-11-10T15:04:22.000Z', docVersion: '1.0' },
  meta: { submitted: true, status: 'approved', reference: 'APP-20261110-K3F9QZ', submittedAt: '2026-11-10T15:04:22.000Z' },
  ui: { step: 8, maxStep: 8 },
};
