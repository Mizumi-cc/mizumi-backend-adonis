import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Waitlist from 'App/Models/Waitlist'

export default class WaitlistsController {
  public async join({ request, response }: HttpContextContract) {
    const { email } = request.only(['email'])
    const waitlist = await Waitlist.create({ email })
    return response.status(201).json(waitlist)
  }

  public async getWaitlist({ response }: HttpContextContract) {
    const waitlist = await Waitlist.all()
    return response.status(200).json(waitlist)
  }

  public async approve({ request, response}: HttpContextContract) {
    const { email } = request.only(['email'])
    const waitlist = await Waitlist.findByOrFail('email', email)
    waitlist.approved = true
    await waitlist.save()
    return response.status(200).json(waitlist)
  }
}
