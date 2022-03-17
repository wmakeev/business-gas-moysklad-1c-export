import path from 'path'
import fs from 'fs/promises'
import { getDocumentsInfo } from '../src'

const dateFrom = new Date(2022, 2, 1)
const dateTo = new Date()

const auth = {
  login: process.env['MOYSKLAD_LOGIN']!,
  password: process.env['MOYSKLAD_PASSWORD']!
}

getDocumentsInfo(auth, dateFrom, dateTo).then(async result => {
  console.log(result.length)

  await fs.writeFile(
    path.join(process.cwd(), '__temp/output.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('DONE.')
})