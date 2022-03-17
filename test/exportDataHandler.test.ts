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
    headers: {
      Authorization: getAuthHeader()
    },
    body: JSON.stringify({
      dateFrom: new Date(2022, 2, 17),
      dateTo: new Date()
    })
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event)

  t.ok(result!.statusCode === 200)

  const body = JSON.parse(result!.body)

  t.ok(body.ok)
  t.ok(body.result instanceof Array)
})

test.only('exportDataHandler (fail) #1', async t => {
  const event = {
    body: JSON.stringify({
      dateFrom: new Date(2022, 2, 15)
    })
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
    headers: {
      Authorization: getAuthHeader()
    },
    body: JSON.stringify({
      dateFrom: new Date(2022, 2, 15)
    })
  }

  // @ts-expect-error skip lambda params
  const result = await exportDataHandler(event)

  t.equal(result!.statusCode, 500)

  const body = JSON.parse(result!.body)

  t.notOk(body.ok)
  t.equal(body.description, '["dateTo"] undefined is not a string')
})
