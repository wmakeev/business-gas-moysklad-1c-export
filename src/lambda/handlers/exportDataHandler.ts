import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult
} from 'aws-lambda'
import { EntityTypes, getDocumentsInfo } from '../..'
import {
  $mol_data_pipe,
  $mol_data_record,
  $mol_data_string,
  $mol_data_optional
} from 'mol_data_all'
import { $mol_time_moment } from 'mol_time_all'
import { tryCall } from '../../tools'

const OK_STATUS = 200
const INTERNAL_ERROR_STATUS = 500
const BAD_REQUEST_STATUS = 400
const UNAUTHORIZED_STATUS = 401

const ExportDataParams = $mol_data_record({
  dateFrom: $mol_data_pipe($mol_data_string, $mol_time_moment),
  dateTo: $mol_data_pipe($mol_data_string, $mol_time_moment),
  continueFromEntity: $mol_data_optional($mol_data_string),
  continueFromDate: $mol_data_optional(
    $mol_data_pipe($mol_data_string, $mol_time_moment)
  )
})

const checkAuth = (event: APIGatewayProxyEvent) => {
  const authHeader =
    event.headers?.['Authorization'] ?? event.headers?.['authorization']

  if (!authHeader) {
    throw new Error('Не указан заголовок Authorization')
  }

  const [authType, authData] = authHeader.split(' ')

  if (authType !== 'Basic' || !authData) {
    throw new Error('Ожадалась Basic авторизация')
  }

  const [auth, authErr] = tryCall(() =>
    Buffer.from(authData, 'base64').toString('utf8').split(':')
  )

  if (authErr) {
    throw new Error('Некорретные данные Basic авторизации')
  }

  const [login, password] = auth

  if (!login || !password) {
    throw new Error('Некорретные данные Basic авторизации')
  }

  return { login, password }
}

export const exportDataHandler: APIGatewayProxyHandler = async (event, ctx) => {
  let statusCode: number | undefined
  let result: unknown | undefined
  let description: string | undefined

  try {
    if (event.requestContext.httpMethod !== 'GET') {
      statusCode = BAD_REQUEST_STATUS
      throw new Error('Ожидался GET запрос')
    }

    const [auth, authErr] = tryCall(() => checkAuth(event))

    if (authErr) {
      statusCode = UNAUTHORIZED_STATUS
      throw new Error(authErr.message)
    }

    const [params, queryErr] = tryCall(() =>
      ExportDataParams(event.queryStringParameters)
    )

    if (queryErr) {
      statusCode = BAD_REQUEST_STATUS
      throw new Error(`Некорректные параметры запроса - ${queryErr.message}`)
    }

    const dateFrom = params.dateFrom.native
    const dateTo = params.dateTo.native
    const continueFromEntity = params.continueFromEntity as EntityTypes
    const continueFromDate = params.continueFromDate?.native

    const { items, abortedOnDate, abortedOnEntity } = await getDocumentsInfo({
      auth,
      dateFrom,
      dateTo,
      getRemainingTimeInMillis: () => ctx.getRemainingTimeInMillis(),
      lastAbortedOnEntity: continueFromEntity,
      lastAbortedOnDate: continueFromDate
    })

    let nextQueryString

    if (abortedOnEntity) {
      const urlParams = new URLSearchParams({
        dateFrom: dateFrom.toJSON(),
        dateTo: dateTo.toJSON(),
        continueFromEntity: abortedOnEntity,
        continueFromDate: abortedOnDate?.toJSON() ?? undefined
      })

      nextQueryString = urlParams.toString()
    }

    result = { items, nextQueryString }

    statusCode = OK_STATUS
  } catch (err: any) {
    console.log(err)

    if (err.message.includes('Ошибка аутентификации')) {
      statusCode = UNAUTHORIZED_STATUS
    }

    description = err instanceof Error ? err.message : 'Unknown error'
  }

  const response: APIGatewayProxyResult = {
    statusCode: statusCode ?? INTERNAL_ERROR_STATUS,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        ok: statusCode === OK_STATUS,
        result,
        description
      },
      null,
      2
    )
  }

  return response
}
