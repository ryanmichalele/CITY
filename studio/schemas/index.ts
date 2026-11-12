import {dashboardContent} from './objects/dashboardContent'
import {application} from './application'
import {account} from './account'
import {dashboardDefaults} from './dashboardDefaults'
import {product, service, quickAction, accountType, agreement} from './catalog'
import {siteSettings} from './siteSettings'
import {transaction, payment, activityEvent, login, auditEvent} from './system'

export const schemaTypes = [
  // documents
  application,
  account,
  dashboardDefaults,
  product,
  service,
  quickAction,
  accountType,
  agreement,
  siteSettings,
  transaction,
  payment,
  activityEvent,
  login,
  auditEvent,
  // objects
  dashboardContent,
]
