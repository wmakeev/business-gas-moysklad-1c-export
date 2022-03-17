import { getInstance } from './moysklad/instance'
import { fromAsyncGenerator, compact } from '@wmakeev/highland-tools'
import { Instance, parseTimeString } from 'moysklad'
import _H from 'highland'

async function* getEntities(
  ms: Instance,
  entityType: string,
  dateFrom: Date,
  dateTo: Date
) {
  let nextHref = ms.buildUrl(`entity/${entityType}`, {
    filter: {
      moment: {
        $gte: dateFrom,
        $lt: dateTo
      }
    }
  })

  while (nextHref) {
    const coll = await ms.GET(nextHref)

    for (const it of coll.rows) yield it

    nextHref = coll.meta.nextHref
  }
}

const getCommonFields = (entity: any) => {
  return {
    type: entity.meta.type,
    name: entity.name,
    moment: parseTimeString(entity.moment)
  }
}

const taxSystemNames: Record<string, string> = {
  GENERAL_TAX_SYSTEM: 'ОСН',
  SIMPLIFIED_TAX_SYSTEM_INCOME: 'УСН. Доход',
  SIMPLIFIED_TAX_SYSTEM_INCOME_OUTCOME: 'УСН. Доход-Расход',
  UNIFIED_AGRICULTURAL_TAX: 'ЕСХН',
  PRESUMPTIVE_TAX_SYSTEM: 'ЕНВД',
  PATENT_BASED: 'Патент'
}

export async function getDocumentsInfo(
  auth: { login: string; password: string },
  dateFrom: Date,
  dateTo: Date
) {
  const ms = getInstance(auth)

  const [expenseItems, retailStores] = await Promise.all([
    ms.GET('entity/expenseitem').then(res => res.rows),
    ms.GET('entity/retailstore').then(res => res.rows)
  ])

  const getExpenseItem = (href: string) =>
    expenseItems.find((it: any) => it.meta.href === href)

  const getRetailStore = (href: string) =>
    retailStores.find((it: any) => it.meta.href === href)

  const paymentIn$ = fromAsyncGenerator(() =>
    getEntities(ms, 'paymentin', dateFrom, dateTo)
  )
    .map(entity => {
      const incomingNumber = entity.incomingNumber

      return incomingNumber
        ? {
            ...getCommonFields(entity),
            incomingNumber,
            incomingDate: entity.incomingDate
              ? parseTimeString(entity.incomingDate)
              : undefined
          }
        : null
    })
    .through(compact)

  const paymentOut$ = fromAsyncGenerator(() =>
    getEntities(ms, 'paymentout', dateFrom, dateTo)
  )
    .map(entity => {
      const expenseType = getExpenseItem(entity.expenseItem?.meta.href)?.name

      return expenseType
        ? {
            ...getCommonFields(entity),
            expenseType
          }
        : null
    })
    .through(compact)

  const retailDemand$ = fromAsyncGenerator(() =>
    getEntities(ms, 'retaildemand', dateFrom, dateTo)
  )
    .map(entity => {
      const retailStore = getRetailStore(entity.retailStore.meta.href)

      const taxSystem = taxSystemNames[retailStore.defaultTaxSystem]

      return taxSystem
        ? {
            ...getCommonFields(entity),
            taxSystem
          }
        : null
    })
    .through(compact)

  // @ts-expect-error merge
  const result = await _H([paymentIn$, paymentOut$, retailDemand$])
    .merge()
    .collect()
    .toPromise(Promise)

  return result
}
