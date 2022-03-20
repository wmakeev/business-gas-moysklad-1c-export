import path from 'path'
import fs from 'fs/promises'
import { getDocumentsInfo } from '../src'

const dateFrom = new Date(2022, 1, 1)
const dateTo = new Date(2022, 1, 28, 23, 59, 0)

const auth = {
  login: process.env['MOYSKLAD_LOGIN']!,
  password: process.env['MOYSKLAD_PASSWORD']!
}

const startTime = Date.now()
const TIMEOUT = 10000

const getRemainingTimeInMillis = () => {
  return TIMEOUT - (Date.now() - startTime)
}

console.time('getDocumentsInfo')
getDocumentsInfo({ auth, dateFrom, dateTo, getRemainingTimeInMillis }).then(
  async result => {
    console.timeEnd('getDocumentsInfo')

    console.log('abortedOnEntity', result.abortedOnEntity)
    console.log('abortedOnDate', result.abortedOnDate)
    console.log('items.length', result.items.length)

    await fs.writeFile(
      path.join(process.cwd(), '__temp/output.json'),
      JSON.stringify(result, null, 2)
    )

    console.log('DONE.')
  }
)
