import { getInstance } from './moysklad/instance'
import { Instance, parseTimeString } from 'moysklad'
import { AbortController } from 'node-abort-controller'

const DEMAND_TAX_SYSTEM_ATTR_ID = '83a2644f-50e2-11eb-0a80-05ec0025b107'

const ENTITY_TYPES = [
  'paymentin',
  'paymentout',
  'retaildemand',
  'demand'
] as const

export type EntityTypes = typeof ENTITY_TYPES[number]

/**
 * Время до конца таймаута, за которое нужно прервать текущий запрос и вернуть
 * результат.
 *
 */
const REMAINING_TIME_DEADLINE = 2000

async function* getEntities(
  ms: Instance,
  dateFrom: Date,
  dateTo: Date,
  getRemainingTimeInMillis: () => number,
  lastAbortedEntity?: EntityTypes,
  lastAbortedOnDate?: Date
) {
  if (dateFrom.getTime() > dateTo.getTime()) {
    throw new Error(
      'Дата начала периода должна быть меньше даты окончания периода'
    )
  }

  if (lastAbortedOnDate && dateFrom.getTime() > lastAbortedOnDate.getTime()) {
    throw new Error(
      'Последняя дата предыдущего отчета должна быть больше даты начала периода'
    )
  }

  const lastAbortedEntityIndex = lastAbortedEntity
    ? ENTITY_TYPES.indexOf(lastAbortedEntity)
    : 0

  for (
    let entityIndex = lastAbortedEntityIndex;
    entityIndex < ENTITY_TYPES.length;
    entityIndex++
  ) {
    const entityType = ENTITY_TYPES[entityIndex]!

    let nextHref = ms.buildUrl(`entity/${entityType}`, {
      filter: {
        isDeleted: ['true', 'false'],
        moment: {
          ...(lastAbortedEntity === entityType && lastAbortedOnDate
            ? { $gt: lastAbortedOnDate }
            : { $gte: dateFrom }),
          $lte: dateTo
        }
      },
      expand: entityType === 'paymentin' ? 'operations' : undefined,
      order: 'moment,asc',
      limit: 100
    })

    while (nextHref) {
      const remainingTime = getRemainingTimeInMillis()

      const timeToDeadline = remainingTime - REMAINING_TIME_DEADLINE

      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, timeToDeadline)

      let coll
      try {
        coll = await ms.GET(nextHref, null, {
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeout)
      }

      for (const it of coll.rows) yield it as { meta: { type: EntityTypes } }

      nextHref = coll.meta.nextHref
    }
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

export interface GetDocumentsInfoParams {
  auth: { login: string; password: string }
  dateFrom: Date
  dateTo: Date
  getRemainingTimeInMillis: () => number
  lastAbortedOnEntity?: EntityTypes
  lastAbortedOnDate?: Date
}

export async function getDocumentsInfo(params: GetDocumentsInfoParams) {
  const {
    auth,
    dateFrom,
    dateTo,
    getRemainingTimeInMillis,
    lastAbortedOnEntity,
    lastAbortedOnDate
  } = params

  const ms = getInstance(auth)

  const [expenseItems, retailStores] = await Promise.all([
    ms.GET('entity/expenseitem').then(res => res.rows),
    ms.GET('entity/retailstore').then(res => res.rows)
  ])

  const getExpenseItem = (href: string) =>
    expenseItems.find((it: any) => it.meta.href === href)

  const getRetailStore = (href: string) =>
    retailStores.find((it: any) => it.meta.href === href)

  const getDemandTaxSystem = (demand: any) => {
    const taxSystem: string | null =
      demand.attributes?.find(
        (attr: any) => attr.id === DEMAND_TAX_SYSTEM_ATTR_ID
      )?.value.name ?? null

    return taxSystem
  }

  const mapByType: Record<EntityTypes, (entity: any) => any> = {
    paymentin: entity => {
      const linkedDemand = entity.operations?.find(
        (o: any) => o.meta.type === 'demand'
      )

      const taxSystem = linkedDemand ? getDemandTaxSystem(linkedDemand) : null

      return {
        ...getCommonFields(entity),
        incomingNumber: entity.incomingNumber ?? null,
        incomingDate: entity.incomingDate
          ? parseTimeString(entity.incomingDate)
          : null,
        taxSystem
      }
    },

    paymentout: entity => {
      const expenseType =
        getExpenseItem(entity.expenseItem?.meta.href)?.name ?? null

      return {
        ...getCommonFields(entity),
        expenseType
      }
    },

    retaildemand: entity => {
      const retailStore = getRetailStore(entity.retailStore.meta.href)

      const taxSystem = taxSystemNames[retailStore.defaultTaxSystem] ?? null

      return {
        ...getCommonFields(entity),
        taxSystem
      }
    },

    demand: entity => {
      const taxSystem = getDemandTaxSystem(entity)

      return {
        ...getCommonFields(entity),
        taxSystem
      }
    }
  }

  const gen = getEntities(
    ms,
    dateFrom,
    dateTo,
    getRemainingTimeInMillis,
    lastAbortedOnEntity,
    lastAbortedOnDate
  )

  const items = []

  try {
    for await (const entity of gen) {
      const entityType = entity.meta.type

      const item = mapByType[entityType](entity)

      items.push(item)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('Request was aborted')

      if (items.length === 0) {
        throw new Error('Достигнут таймаут при пустом результате')
      }

      return {
        abortedOnEntity: items[items.length - 1]?.type,
        abortedOnDate: items[items.length - 1]?.moment,
        items
      }
    }

    throw err
  }

  return { items }
}
