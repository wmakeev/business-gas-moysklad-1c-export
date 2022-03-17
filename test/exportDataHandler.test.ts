import test from 'tape'
import { exportDataHandler } from '../src/lambda'

const auth = {
  login: process.env['MOYSKLAD_LOGIN']!,
  password: process.env['MOYSKLAD_PASSWORD']!
}

const getAuthHeader = () =>
  'Basic ' + Buffer.from(`${auth.login}:${auth.password}`).toString('base64')

test('exportDataHandler', async t => {
  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    headers: {
      Authorization: getAuthHeader()
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON(),
      dateTo: new Date().toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event)

  t.ok(result!.statusCode === 200)

  const body = JSON.parse(result!.body)

  t.ok(body.ok)
  t.ok(body.result instanceof Array)
})

test('exportDataHandler (fail) #1', async t => {
  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON(),
      dateTo: new Date().toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event)

  t.equal(result!.statusCode, 401)

  const body = JSON.parse(result!.body)

  t.notOk(body.ok)
  t.equal(body.description, 'Не указан заголовок Authorization')
})

test('exportDataHandler (fail) #2', async t => {
  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    headers: {
      Authorization: getAuthHeader()
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event)

  t.equal(result!.statusCode, 400)

  const body = JSON.parse(result!.body)

  t.notOk(body.ok)
  t.equal(
    body.description,
    'Некорректные параметры запроса - ["dateTo"] undefined is not a string'
  )
})
