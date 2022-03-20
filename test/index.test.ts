import path from 'path'
import fs from 'fs/promises'
import { getDocumentsInfo } from '../src'

const dateFrom = new Date(2022, 1, 1)
const dateTo = new Date(2022, 1, 28, 23, 59, 0)

const auth = {
  login: process.env['MOYSKLAD_LOGIN']!,
  password: process.env['MOYSKLAD_PASSWORD']!
}

console.time('getDocumentsInfo')
getDocumentsInfo(auth, dateFrom, dateTo).then(async result => {
  console.timeEnd('getDocumentsInfo')

  console.log(result.length)

  await fs.writeFile(
    path.join(process.cwd(), '__temp/output.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('DONE.')
})
