import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Waitlist from 'App/Models/Waitlist'

const sgMail = require('@sendgrid/mail')
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
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
      to: email,
      from: 'support@mizumi.cc',
      templateId: 'd-e0f3103e885f4f58b05df59557a25916'
    }
    await sgMail.send(msg)
    return response.status(200).json(waitlist)
  }
}
