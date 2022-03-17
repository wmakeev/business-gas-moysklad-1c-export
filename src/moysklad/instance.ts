import { wrapFetchApi } from 'moysklad-fetch-planner'
import fetch from 'node-fetch'
import Moysklad from 'moysklad'

export const getInstance = (auth: { login: string; password: string }) => {
  const instance = Moysklad({
    ...auth,
    apiVersion: '1.2',
    fetch: wrapFetchApi(fetch)
  })

  return instance
}
