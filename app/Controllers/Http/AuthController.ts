import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import RegisterValidator from 'App/Validators/RegisterValidator'
import WalletAddressValidator from 'App/Validators/WalletAddressValidator'
import Auth from 'App/Models/Auth'
import Waitlist from 'App/Models/Waitlist'
import { createTransferInstruction } from '@solana/spl-token'
import { PublicKey, Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import Env from "@ioc:Adonis/Core/Env";
import { getOrCreateAssociatedTokenAccount } from "App/Utils/Solana";

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
