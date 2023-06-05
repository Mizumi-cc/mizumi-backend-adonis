import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import RegisterValidator from 'App/Validators/RegisterValidator'
import WalletAddressValidator from 'App/Validators/WalletAddressValidator'
import Auth from 'App/Models/Auth'
import Waitlist from 'App/Models/Waitlist'

export default class AuthController {
  public async register({request, auth, response}: HttpContextContract) {
    const data = await request.validate(RegisterValidator)
    const waitlistSignup = await Waitlist.findBy('email', data.email)
    if (!waitlistSignup) {
      return response.badRequest('You must join the waitlist first')
    } else if (waitlistSignup.approved === false) {
      return response.badRequest('You must be approved by the waitlist first')
    }
    const user = await Auth.create(data)
    const token = await auth.use('api').attempt(data.email, data.password, {
      expiresIn: '10 days'
    })
    return response.status(200).json({ token, user })
  }

  public async login({request, auth, response}: HttpContextContract) {
    const email = request.input('email')
    const password = request.input('password')
    const username = request.input('username')
    
    try {
      const token= await auth.use('api').attempt(email ? email : username, password, {
        expiresIn: '10 days'
      })

      const user = await Auth.findBy(`${email ? 'email' : 'username'}`, email ? email : username)
      return response.status(200).json({ token, user })
    } catch (error) {
      return response.badRequest('Invalid credentials')
    }
    
  }

  public async logout({auth, response}: HttpContextContract) {
    await auth.use('api').authenticate()
    await auth.use('api').logout()
    return response.status(200)
  }

  public async saveWalletAddress({request, auth, response}: HttpContextContract) {
    const { address } = await request.validate(WalletAddressValidator)
    const user = auth.user

    if(!user) {
      return response.status(401)
    }

    user.walletAddress = address
    await user.save()

    return response.status(200)
  }

  public async me({auth, response}: HttpContextContract) {
    const user = auth.user
    return response.status(200).json({ user })
  }

  public async isUniqueUsernameOrEmail({request, response}: HttpContextContract) {
    const username = request.input('username')
    const email = request.input('email')
    const user = await Auth.findBy(`${email ? 'email' : 'username'}`, email ? email : username)
    if (user) {
      return response.status(200).json({ isUnique: false })
    } else {
      return response.status(200).json({ isUnique: true })
    }
  }
}
