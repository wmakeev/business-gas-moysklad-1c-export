import test from 'tape'
import { exportDataHandler } from '../src/lambda'

const auth = {
  login: process.env['MOYSKLAD_LOGIN']!,
  password: process.env['MOYSKLAD_PASSWORD']!
}

const getAuthHeader = () =>
  'Basic ' + Buffer.from(`${auth.login}:${auth.password}`).toString('base64')

test('exportDataHandler #1', async t => {
  const lambdaContext = {
    getRemainingTimeInMillis: () => 40000
  }

  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    headers: {
      Authorization: getAuthHeader()
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON(),
      dateTo: new Date(2022, 2, 19).toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event, lambdaContext)

  t.ok(result!.statusCode === 200)

  const body = JSON.parse(result!.body)

  t.ok(body.ok)
  t.ok(body.result.items instanceof Array)
})

test('exportDataHandler #2', async t => {
  const lambdaContext = {
    getRemainingTimeInMillis: () => 40000
  }

  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    headers: {
      Authorization: getAuthHeader()
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON(),
      dateTo: new Date(2022, 2, 19).toJSON(),
      continueFromEntity: 'demand',
      continueFromDate: new Date(2022, 2, 16, 15, 0, 0).toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event, lambdaContext)

  t.ok(result!.statusCode === 200)

  const body = JSON.parse(result!.body)

  t.ok(body.ok)
  t.ok(body.result.items instanceof Array)
})

test('exportDataHandler #3', async t => {
  const startTime = Date.now()
  const TIMEOUT = 12000

  const lambdaContext = {
    getRemainingTimeInMillis: () => {
      return TIMEOUT - (Date.now() - startTime)
    }
  }

  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    headers: {
      Authorization: getAuthHeader()
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 1, 1).toJSON(),
      dateTo: new Date(2022, 1, 28).toJSON(),
      continueFromEntity: 'paymentout',
      continueFromDate: new Date(2022, 1, 25).toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event, lambdaContext)

  t.ok(result!.statusCode === 200)

  const body = JSON.parse(result!.body)

  t.ok(body.ok)
  t.ok(body.result.items instanceof Array)
  t.ok(body.result.nextQueryString)
})

test('exportDataHandler (fail) #1', async t => {
  const lambdaContext = {
    getRemainingTimeInMillis: () => 40000
  }

  const event = {
    requestContext: {
      httpMethod: 'GET'
    },
    queryStringParameters: {
      dateFrom: new Date(2022, 2, 17).toJSON(),
      dateTo: new Date(2022, 2, 19).toJSON()
    }
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event, lambdaContext)

  t.equal(result!.statusCode, 401)

  const body = JSON.parse(result!.body)

  t.notOk(body.ok)
  t.equal(body.description, 'Не указан заголовок Authorization')
})

test('exportDataHandler (fail) #2', async t => {
  const lambdaContext = {
    getRemainingTimeInMillis: () => 40000
  }

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
  const result = await exportDataHandler(event, lambdaContext)

  t.equal(result!.statusCode, 400)

  const body = JSON.parse(result!.body)

  t.notOk(body.ok)
  t.equal(
    body.description,
    'Некорректные параметры запроса - ["dateTo"] undefined is not a string'
  )
})
