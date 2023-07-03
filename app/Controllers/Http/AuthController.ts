import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import RegisterValidator from 'App/Validators/RegisterValidator'
import WalletAddressValidator from 'App/Validators/WalletAddressValidator'
import ChangePasswordValidator from 'App/Validators/ChangePasswordValidator'
import Auth from 'App/Models/Auth'
import Waitlist from 'App/Models/Waitlist'
import { createTransferInstruction } from '@solana/spl-token'
import { PublicKey, Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import Env from "@ioc:Adonis/Core/Env";
import { getOrCreateAssociatedTokenAccount } from "App/Utils/Solana";
import Hash from "@ioc:Adonis/Core/Hash"
import UpdateProfileValidator from 'App/Validators/UpdateProfileValidator'
import TwoFactorAuthProvider from 'App/Services/TwoFactorAuthProvider'
import TwoFactorChallengeValidator from 'App/Validators/TwoFactorChallengeValidator'
const twoFactor = require('node-2fa')

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
      const user = await auth.use('api').verifyCredentials(email ? email : username, password)
      console.log(user.twoFactorSecret)
      if (user.isTwoFactorEnabled) {
        return response.status(200).json({ twoFactorRequired: true })
      } else {
        const token = await auth.use('api').generate(user!, {
          expiresIn: '10 days'
        })
        return response.status(200).json({ token, user: user, twoFactorRequired: false, twoFactorEnabled: false })
      }
    } catch (error) {
      return response.unauthorized('Invalid credentials')
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
    

    // fund user wallet with SOL, USDC, USDT
    const connection = new Connection(Env.get('ANCHOR_PROVIDER_URL'))
    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));
    const pubkey = new PublicKey(address)
    const USDC_MINT = new PublicKey(process.env.USDC_MINT as string)
    const USDT_MINT = new PublicKey(process.env.USDT_MINT as string)
    const admin_usdc_ata = await getOrCreateAssociatedTokenAccount(
      connection, { secretKey: admin.secretKey, publicKey: admin.publicKey }, USDC_MINT, admin.publicKey, true,
    )
    const admin_usdt_ata = await getOrCreateAssociatedTokenAccount(
      connection, { secretKey: admin.secretKey, publicKey: admin.publicKey }, USDT_MINT, admin.publicKey, true,
    )
    const usdc_ata = await getOrCreateAssociatedTokenAccount(
      connection, { secretKey: admin.secretKey, publicKey: admin.publicKey }, USDC_MINT, pubkey, true,
    )
    const usdt_ata = await getOrCreateAssociatedTokenAccount(
      connection, { secretKey: admin.secretKey, publicKey: admin.publicKey }, USDT_MINT, pubkey, true,
    )

    const blockhash1 = (await connection.getLatestBlockhash())

    const solTransferInstruction = SystemProgram.transfer({
      fromPubkey: admin.publicKey,
      toPubkey: pubkey,
      lamports: 0.2 * LAMPORTS_PER_SOL,
    })

    const solTx = new Transaction().add(solTransferInstruction)
    solTx.feePayer = admin.publicKey
    solTx.recentBlockhash = blockhash1.blockhash
    solTx.lastValidBlockHeight = blockhash1.lastValidBlockHeight
    solTx.sign(admin)
    const solHash = await connection.sendRawTransaction(solTx.serialize())
    console.log(
      'Funded wallet with SOL. Transaction hash: ', solHash
    )
    await connection.confirmTransaction(solHash)

    const usdcTransferInstruction = createTransferInstruction(
      admin_usdc_ata.address,
      usdc_ata.address,
      admin.publicKey,
      1000 * 1000000000,
    )

    const usdtTransferInstruction = createTransferInstruction(
      admin_usdt_ata.address,
      usdt_ata.address,
      admin.publicKey,
      1000 * 1000000000,
    )

    const blockhash = (await connection.getLatestBlockhash())
    const fundTx = new Transaction(
      {
        feePayer: admin.publicKey,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
    )
    fundTx.instructions = [usdcTransferInstruction, usdtTransferInstruction]
    fundTx.sign(admin)
    const result = await connection.simulateTransaction(fundTx)
    console.log('Simulate result: ', result) 
    const hash = await connection.sendRawTransaction(fundTx.serialize())
    console.log(
      'Funded wallet with USDC and USDT. Transaction hash: ', hash
    )
    return response.status(200)
  }

  public async me({auth, response}: HttpContextContract) {
    const user = auth.user
    return response.status(200).json({ user: user, twoFactorEnabled: user?.isTwoFactorEnabled })
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

  public async changePassword({request, auth, response}: HttpContextContract) {
    const { oldPassword, newPassword } = await request.validate(ChangePasswordValidator)
    await auth.use('api').authenticate()
    const user = auth.use('api').user

    if(!user) {
      return response.status(401)
    }

    const isSame = await Hash.verify(user.password, oldPassword)

    if (!isSame) {
      return response.badRequest('Invalid credentials')
    }

    user.password = newPassword
    await user.save()

    return response.status(200)
  }

  public async updateProfile({request, auth, response}: HttpContextContract) {
    const payload = await request.validate(UpdateProfileValidator)
    await auth.use('api').authenticate()
      .catch((e) => {
        response.status(500).json({ e })
      })
    const user = auth.use('api').user
    
    if (!user) {
      response.status(401)
    }

    const keys = Object.keys(payload)
    for (const iterator of keys) {
      user![iterator] = payload[iterator]
    }

    await user?.save()
    response.status(200)
  }

  public async enableTwoFactorAuth({ auth, response }: HttpContextContract) {
    await auth.use('api').authenticate()
    const user = auth.use('api').user
    
    if (!user) {
      return response.status(401)
    }

    user.twoFactorSecret = await TwoFactorAuthProvider.generateSecret(user)
    user.twoFactorRecoveryCodes = await TwoFactorAuthProvider.generateRecoveryCodes()
    await user.save()

    response.status(200).json({
      status: {
        type: 'success',
        message: 'Two factor authentication enabled',
      },
      code: await TwoFactorAuthProvider.generateQrCode(user),
    })
  }

  public async disableTwoFactorAuth({ auth, response }: HttpContextContract) {
    await auth.use('api').authenticate()
    const user = auth.use('api').user

    if (!user) {
      return response.status(401)
    }

    user.twoFactorSecret = undefined
    user.twoFactorRecoveryCodes = undefined
    await user.save()

    response.status(200).json({
      status: {
        type: 'success',
        message: 'Two factor authentication disabled',
      },
    })
  }

  public async fetchRecoveryCodes({ auth, response }: HttpContextContract) {
    await auth.use('api').authenticate()
    const user = auth.use('api').user

    if (!user) {
      return response.status(401)
    }

    if (!user.twoFactorRecoveryCodes) {
      return response.status(400).json({
        status: {
          type: 'error',
          message: 'No recovery codes available',
        },
      })
    }

    response.status(200).json({
      twoFactorEnabled: user.isTwoFactorEnabled,
      recoveryCodes: user.twoFactorRecoveryCodes,
    })
  }

  public async twoFactorChallenge({ request, auth, response }: HttpContextContract) {
    const { code, recoveryCode, id } = await request.validate(TwoFactorChallengeValidator)


    const user = await Auth.query().where(`${id.includes('@') ? 'email' : 'username'}`, id).first()
    if (!user || !user.twoFactorSecret) {
      return response.status(401).json({
        message: 'Two factor authentication failed. Invalid user.'
      })
    }

    if (code) {
      const isValid = twoFactor.verifyToken(user.twoFactorSecret, code)
      if (isValid) {
        const token = await auth.use('api').generate(user, {
          expiresIn: '10 days'
        })
        return response.status(200).json({
          message: 'Two factor authentication successful.',
          token,
          user: user,
          twoFactorEnabled: true
        })
      } else {
        return response.status(401).json({
          message: 'Two factor authentication failed. Invalid code.'
        })
      }
    } else if (recoveryCode) {
      const codes = user?.twoFactorRecoveryCodes ?? []
      if (codes.includes(recoveryCode)) {
        user.twoFactorRecoveryCodes = codes.filter((c) => c !== recoveryCode)
        await user.save()
        const token = await auth.use('api').generate(user, {
          expiresIn: '10 days'
        })
        return response.status(200).json({
          message: 'Two factor authentication successful.',
          token,
          user: user,
          twoFactorEnabled: true
        })
      } else {
        return response.status(401).json({
          message: 'Two factor authentication failed. Invalid recovery code.'
        })
      }
    }
  }
}


