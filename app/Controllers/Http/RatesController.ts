import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { getForexRates } from 'App/Services/Rates'

export default class RatesController {
  public async getGHSToUSD({response}: HttpContextContract) {
    const rate = await getForexRates('GHS')
    return response.status(200).json({ rate })
  }
}
