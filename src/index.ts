import { getInstance } from './moysklad/instance'
import { fromAsyncGenerator } from '@wmakeev/highland-tools'
import { Instance, parseTimeString } from 'moysklad'
import _H from 'highland'

const DEMAND_TAX_SYSTEM_ATTR_ID = '83a2644f-50e2-11eb-0a80-05ec0025b107'

async function* getEntities(
  ms: Instance,
  entityType: string,
  dateFrom: Date,
  dateTo: Date
) {
  let nextHref = ms.buildUrl(`entity/${entityType}`, {
    filter: {
      isDeleted: ['true', 'false'],
      moment: {
        $gte: dateFrom,
        $lte: dateTo
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
  ).map(entity => {
    return {
      ...getCommonFields(entity),
      incomingNumber: entity.incomingNumber ?? null,
      incomingDate: entity.incomingDate
        ? parseTimeString(entity.incomingDate)
        : null
    }
  })

  const paymentOut$ = fromAsyncGenerator(() =>
    getEntities(ms, 'paymentout', dateFrom, dateTo)
  ).map(entity => {
    const expenseType =
      getExpenseItem(entity.expenseItem?.meta.href)?.name ?? null

    return {
      ...getCommonFields(entity),
      expenseType
    }
  })

  const retailDemand$ = fromAsyncGenerator(() =>
    getEntities(ms, 'retaildemand', dateFrom, dateTo)
  ).map(entity => {
    const retailStore = getRetailStore(entity.retailStore.meta.href)

    const taxSystem = taxSystemNames[retailStore.defaultTaxSystem] ?? null

    return {
      ...getCommonFields(entity),
      taxSystem
    }
  })

  const demand$ = fromAsyncGenerator(() =>
    getEntities(ms, 'demand', dateFrom, dateTo)
  ).map(entity => {
    const taxSystem =
      entity.attributes?.find(
        (attr: any) => attr.id === DEMAND_TAX_SYSTEM_ATTR_ID
      )?.value.name ?? null

    return {
      ...getCommonFields(entity),
      taxSystem
    }
  })

  // @ts-expect-error merge
  const result = await _H([paymentIn$, paymentOut$, retailDemand$, demand$])
    .merge()
    .collect()
    .toPromise(Promise)

  return result
}
