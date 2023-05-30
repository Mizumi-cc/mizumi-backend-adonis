import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Transaction from "App/Models/Transaction";
import Auth from "App/Models/Auth";
import NewTransactionValidator from "App/Validators/NewTransactionValidator";
import * as anchor from "@project-serum/anchor";
import { IDL } from "App/Types/MizumiProgram";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TRANSACTIONKIND, TRANSACTIONSTATUS,
   STABLES 
  } from "App/Models/Enums";
import DebitUserValidator from "App/Validators/DebitUserValidator";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import CreditUserValidator from "App/Validators/CreditUserValidator";
import CompleteTransactionValidator from "App/Validators/CompleteTransactionValidator";
import Env from "@ioc:Adonis/Core/Env";
import { PAYOUTMETHOD, PaymentForm, PayoutForm, initiatePayment, initiatePayout } from "App/Services/Fincra";
import crypto from "crypto";
import { getOrCreateAssociatedTokenAccount } from "App/Utils/Solana";
import Ws from "App/Services/Ws";

export default class TransactionsController {
  public async create({request, response}: HttpContextContract) {

    const payload = await request.validate(NewTransactionValidator) 
    const { userId, fiatAmount, tokenAmount, token, fiat, kind, country, tokenRate, fiatRate, payoutInfo } = payload

    const user = await Auth.find(userId)

    if (!user) {
      return response.status(404).json({
        message: 'User not found'
      })
    }

    if (!user.walletAddress) {
      return response.status(400).json({
        message: 'User has no wallet address'
      })
    } 

    const userWallet = new PublicKey(user.walletAddress!)
    // TODO: move rate value to be determined in the backend. not safe to have rates come from client side
    const transaction = await Transaction.create({
      userId,
      fiatAmount,
      tokenAmount,
      token,
      fiat,
      kind,
      country,
      tokenRate,
      fiatRate,
      payoutInfo,
      status: TRANSACTIONSTATUS.INITIATED
    })
    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

    const connection = new Connection(Env.get('ANCHOR_PROVIDER_URL'))
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(admin),
      anchor.AnchorProvider.defaultOptions()
    )
    anchor.setProvider(provider)
    const program = new anchor.Program(
      IDL,
      new PublicKey(Env.get('PROGRAM_ID')),
    )
    const [user_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        userWallet.toBuffer(),
      ],
      program.programId
    );
 
    let swapAccountTx: anchor.web3.Transaction;

    const [swap_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("swap-account"),
        userWallet.toBuffer(),
        Buffer.from(`${transaction.id.replace(/-/gi, '')}`),
      ],
      program.programId
    );

    swapAccountTx = await program.methods
      .newSwap(`${transaction.id.replace(/-/gi, '')}`)
      .accounts({
        admin: admin.publicKey,
        userAccount: user_acc_pda,
        newSwapAccount: swap_acc_pda,
        authority: userWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();
    
    swapAccountTx.feePayer = userWallet;
    swapAccountTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    swapAccountTx.sign({ publicKey: admin.publicKey, secretKey: admin.secretKey })

    const serializedTx = Buffer.from(swapAccountTx.serialize({ requireAllSignatures: false })).toString('base64')
    return response.json({
      serializedTransaction: serializedTx,
      dbTransaction: transaction
    })
  }

  public async debitUser({request, response}: HttpContextContract) {
    const payload = await request.validate(DebitUserValidator);
    const { userId, txId, blockchainTxId } = payload;

    const transaction = await Transaction.find(txId)
    const user = await Auth.find(userId)

    if (!transaction) {
      return response.badRequest({
        error: "Transaction not found"
      })
    }

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }
    if (transaction.userId !== userId) {
      return response.badRequest({
        error: "Transaction does not belong to user"
      })
    }


    if (transaction.status !== TRANSACTIONSTATUS.INITIATED) {
      return response.badRequest({
        error: "Transaction is not in INITIATED state"
      })
    }

    transaction.status = TRANSACTIONSTATUS.DEBITING
    transaction.transactionHash = blockchainTxId
    await transaction.save()

    const userWallet = new PublicKey(user.walletAddress as string)

    let creditTx: anchor.web3.Transaction;

    let paymentLink = null
    let serializedTransaction: string | null = null

    if (transaction.kind === TRANSACTIONKIND.ONRAMP) {
      const form: PaymentForm = {
        amount: transaction.fiatAmount.toString(),
        currency: 'NGN',
        reference: transaction.id,
        redirectUrl: `${Env.get('CLIENT_URL')}`,
        feeBearer: 'business',
        metadata: {
          userId: user.id,
        },
        customer: {
          name: `John Doe`,
          email: user.email,
        },
        successMessage: 'Payment successful'
      }
      const res = await initiatePayment(form)
        .catch((err) => {
          console.log(err, 'err')
        })
      paymentLink = res.body.data.link

    } else if (transaction.kind === TRANSACTIONKIND.OFFRAMP) {
      const USDC_MINT = new PublicKey(process.env.USDC_MINT as string)
      const USDT_MINT = new PublicKey(process.env.USDT_MINT as string)
    
      const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

      const connection = new Connection(Env.get('ANCHOR_PROVIDER_URL'))

      const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(admin),
        anchor.AnchorProvider.defaultOptions()
      )
      anchor.setProvider(provider)
      const program = new anchor.Program(
        IDL,
        new PublicKey(Env.get('PROGRAM_ID')),
      )
      const [user_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user-account"),
          userWallet.toBuffer(),
        ],
        program.programId
      )

      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${transaction.id.replace(/-/gi, '')}`),
        ],
        program.programId
      )
      
      const [usdc_vault_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdc-vault"),
          USDC_MINT.toBuffer(),
        ],
        program.programId
      )

      const [usdt_vault_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdt-vault"),
          USDT_MINT.toBuffer(),
        ],
        program.programId
      )

      const usdc_associated_token_acc = await getOrCreateAssociatedTokenAccount(
        connection, { secretKey: admin.secretKey, publicKey: admin.publicKey },
        USDC_MINT, userWallet, true
      )

      const usdt_associated_token_acc = await getOrCreateAssociatedTokenAccount(
        connection, { secretKey: admin.secretKey, publicKey: admin.publicKey },
        USDT_MINT, userWallet, true
      )
      console.log(transaction.token, `${typeof transaction.token}`)

      const debitAmount = new anchor.BN(transaction.tokenAmount * 1000000000)
      const tokenArgument = transaction.token === STABLES.USDC ? {usdc: {}} as never : {usdt: {}} as never
      creditTx = await program.methods
        .initiateSwap(tokenArgument, debitAmount, {ghs: {} as never}, {offramp: {}}, `${transaction.id.replace(/-/gi, '')}`)
        .accounts({
          admin: admin.publicKey,
          authority: userWallet,
          authorityUsdc: usdc_associated_token_acc.address,
          authorityUsdt: usdt_associated_token_acc.address,
          userAccount: user_acc_pda,
          swapAccount: swap_acc_pda,
          usdc: USDC_MINT,
          usdt: USDT_MINT,
          usdcVault: usdc_vault_pda,
          usdtVault: usdt_vault_pda,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();
      
      creditTx.feePayer = userWallet;
      creditTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
      creditTx.sign({ publicKey: admin.publicKey, secretKey: admin.secretKey })

      serializedTransaction = Buffer.from(creditTx.serialize({ requireAllSignatures: false })).toString('base64')
    }

    return response.json({
      serializedTransaction,
      paymentLink,
    })
  }

  public async creditUser({request, response}: HttpContextContract) {
    const payload = await request.validate(CreditUserValidator);
    const { userId, txId } = payload

    const transaction = await Transaction.find(txId)
    const user = await Auth.find(userId)

    if (!transaction) {
      return response.badRequest({
        error: "Transaction not found"
      })
    }

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }

    if (transaction.userId !== userId) {
      return response.badRequest({
        error: "Transaction does not belong to user"
      })
    }

    // if (transaction.status !== TRANSACTIONSTATUS.DEBITED) {
    //   return response.badRequest({
    //     error: "Transaction not debited"
    //   })
    // }

    transaction.status = TRANSACTIONSTATUS.SETTLING
    await transaction.save()

    const userWallet = new PublicKey(user.walletAddress as string)

    let creditTx: anchor.web3.Transaction

    let serializedTransaction: string | null = null

    if (transaction.kind === TRANSACTIONKIND.ONRAMP) {
      const payoutWallet = new PublicKey(transaction.payoutInfo.walletAddress as string)
      const USDC_MINT = new PublicKey(process.env.USDC_MINT as string)
      const USDT_MINT = new PublicKey(process.env.USDT_MINT as string)
    
      const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))))

      const connection = new Connection(Env.get('ANCHOR_PROVIDER_URL'))
      const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(admin),
        anchor.AnchorProvider.defaultOptions()
      )
      anchor.setProvider(provider)
      const program = new anchor.Program(
        IDL,
        new PublicKey(Env.get('PROGRAM_ID')),
      )
      const [user_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user-account"),
          userWallet.toBuffer(),
        ],
        program.programId
      )

      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${transaction.id.replace(/-/gi, '')}`),
        ],
        program.programId
      )
      
      const [usdc_vault_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdc-vault"),
          USDC_MINT.toBuffer(),
        ],
        program.programId
      )

      const [usdt_vault_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdt-vault"),
          USDT_MINT.toBuffer(),
        ],
        program.programId
      )

      const usdc_associated_token_acc = await getOrCreateAssociatedTokenAccount(
        connection, { secretKey: admin.secretKey, publicKey: admin.publicKey },
        USDC_MINT, payoutWallet, true
      )

      const usdt_associated_token_acc = await getOrCreateAssociatedTokenAccount(
        connection, { secretKey: admin.secretKey, publicKey: admin.publicKey },
        USDT_MINT, payoutWallet, true
      )

      // TODO: change this to 6 decimals for mainnet-beta launch
      const creditAmount = new anchor.BN(transaction.tokenAmount * 1000000000)
      const tokenArgument = transaction.token === STABLES.USDC ? {usdc: {}} as never : {usdt: {}} as never
      creditTx = await program.methods
        .initiateSwap(tokenArgument, creditAmount, {ghs: {} as never}, {onramp: {}}, `${transaction.id.replace(/-/gi, '')}`)
        .accounts({
          admin: admin.publicKey,
          authority: payoutWallet,
          authorityUsdc: usdc_associated_token_acc.address,
          authorityUsdt: usdt_associated_token_acc.address,
          userAccount: user_acc_pda,
          swapAccount: swap_acc_pda,
          usdc: USDC_MINT,
          usdt: USDT_MINT,
          usdcVault: usdc_vault_pda,
          usdtVault: usdt_vault_pda,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .transaction()

      creditTx.feePayer = payoutWallet
      creditTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
      creditTx.partialSign(admin)
      serializedTransaction = Buffer.from(creditTx.serialize({ requireAllSignatures: false })).toString('base64')

    } else if (transaction.kind === TRANSACTIONKIND.OFFRAMP) {
      const form: PayoutForm = {
        business: Env.get('FINCRA_BUSINESS_ID'),
        sourceCurrency: 'GHS',
        destinationCurrency: 'GHS',
        amount: transaction.fiatAmount.toString(),
        description: 'Payout',
        paymentDestination: PAYOUTMETHOD.MOBILE_MONEY,
        customerReference: transaction.id,
        beneficiary: {
          firstName: transaction.payoutInfo.momoName.split(' ')[0],
          lastName: transaction.payoutInfo.momoName.split(' ')[1],
          accountHolderName: transaction.payoutInfo.momoName,
          country: 'GH',
          phone: transaction.payoutInfo.momoNumber,
          mobileMoneyCode: transaction.payoutInfo.momoNetwork,
          accountNumber: transaction.payoutInfo.momoNumber,
          type: 'individual',
          email: user.email,
        }
      }
      await initiatePayout(form)
        .catch((err) => {
          console.log(err, 'err with payout')
        })
      transaction.status = TRANSACTIONSTATUS.SETTLED
      await transaction.save()
    }

    return response.json({
      serializedTransaction,
    })
  }

  public async completeTransaction({request, response}: HttpContextContract) {
    const payload = await request.validate(CompleteTransactionValidator)
    const { txId, userId } = payload

    const transaction = await Transaction.find(txId)
    const user = await Auth.find(userId)

    if (!transaction) {
      return response.badRequest({
        error: "Transaction not found"
      })
    }

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }

    if (transaction.userId !== userId) {
      return response.badRequest({
        error: "Transaction does not belong to user"
      })
    }

    // if (transaction.status !== TRANSACTIONSTATUS.SETTLED) {
    //   return response.badRequest({
    //     error: "Transaction not settled"
    //   })
    // }

    const userWallet = new PublicKey(user.walletAddress as string)

    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))))

    const provider = new anchor.AnchorProvider(
      new Connection(Env.get('ANCHOR_PROVIDER_URL')),
      new anchor.Wallet(admin),
      anchor.AnchorProvider.defaultOptions()
    )
    anchor.setProvider(provider)
    const program = new anchor.Program(
      IDL,
      new PublicKey(Env.get('PROGRAM_ID')),
    )
    const [user_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        userWallet.toBuffer(),
      ],
      program.programId
    )

    const [swap_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("swap-account"),
        userWallet.toBuffer(),
        Buffer.from(`${transaction.id.replace(/-/gi, '')}`),
      ],
      program.programId
    )
    
    const tx = await program.methods
      .completeSwap(true, new anchor.BN(transaction.fiatAmount), `${transaction.id.replace(/-/gi, '')}`)
      .accounts({
        admin: admin.publicKey,
        authority: userWallet,
        userAccount: user_acc_pda,
        swapAccount: swap_acc_pda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .transaction();

    tx.feePayer = userWallet;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    tx.partialSign(admin)
    const serializedTransaction = Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64')

    return response.json({
      serializedTransaction
    })
  }

  public async createUserProgramAccountTx({params, response}: HttpContextContract) {
    const { userId } = params

    const user = await Auth.find(userId)

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }

    if (!user.walletAddress) {
      return response.badRequest({
        error: "User wallet address not found"
      })
    }

    const userWallet = new PublicKey(user.walletAddress!)

    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))))

    const provider = new anchor.AnchorProvider(
      new Connection(Env.get('ANCHOR_PROVIDER_URL')),
      new anchor.Wallet(admin),
      anchor.AnchorProvider.defaultOptions()
    )
    anchor.setProvider(provider)
    const program = new anchor.Program(
      IDL,
      new PublicKey(Env.get('PROGRAM_ID')),
    )

    console.log(admin.publicKey.toBase58(), 'admin')
    const [user_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        userWallet.toBuffer(),
      ],
      program.programId
    )

    const tx = await program.methods
      .newUser()
      .accounts({
        admin: admin.publicKey,
        userAccount: user_acc_pda,
        authority: userWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();
    
    tx.feePayer = userWallet;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash({commitment: 'confirmed'})).blockhash
    tx.sign({ publicKey: admin.publicKey, secretKey: admin.secretKey })

    const serializedTx = Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64')
    return response.json({
      serializedTransaction: serializedTx,
    })
  }

  public async updateStatus({response, params}: HttpContextContract) {
    const { id, userId, status } = params

    const transaction = await Transaction.find(id)
    const user = await Auth.find(userId)

    if (!transaction) {
      return response.badRequest({
        error: "Transaction not found"
      })
    }

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }

    if (transaction.userId !== userId) {
      return response.badRequest({
        error: "Transaction does not belong to user"
      })
    }

    if (!TRANSACTIONSTATUS[status]) {
      return response.badRequest({
        error: "Invalid transaction status"
      })
    }

    transaction.status = status
    await transaction.save()

    return response.json({
      result: "success"
    })
  }

  public async fetchUserTransactions({response, params}: HttpContextContract) {
    const { userId } = params

    const user = await Auth.find(userId)

    if (!user) {
      return response.badRequest({
        error: "User not found"
      })
    }

    const transactions = await Transaction.query().where('userId', userId)

    return response.json({
      transactions
    })
  }

  public async fincraWebhook({response, request}: HttpContextContract) {
    const payload = request.body()
    console.log(payload, 'webhook payload')
    const webhookSignature = request.header('signature')
    const webhookSecret = Env.get('FINCRA_WEBHOOK_KEY')
    const encryptedData =  crypto
      .createHmac("SHA512", webhookSecret)
      .update(JSON.stringify(payload)) 
      .digest("hex")
    if (encryptedData === webhookSignature) {
      console.log('webhook verified')
      const transaction = await Transaction.find(payload.data.reference)
      if (payload.data && payload.data.status === "success") {
        if (transaction && transaction.status === TRANSACTIONSTATUS.DEBITING) {
          console.log('now debited')
          Ws.io.emit('order', {
            id: transaction.id,
            userId: transaction.userId,
            status: 'debited'
          })
          transaction.status = TRANSACTIONSTATUS.DEBITED
          await transaction.save()
          
        }
      } else if (payload.type && payload.type.data.status === "success") {
        if (transaction && transaction.status === TRANSACTIONSTATUS.SETTLING) {
          transaction.status = TRANSACTIONSTATUS.SETTLED
          await transaction.save()
        }
      }
      return response.json({
        result: "success"
      })
    } else {
      console.log('invalid webhook signature')
      return response.badRequest({
        error: "Invalid signature"
      })
    }
  }

  public async fetchTransaction({response, params}: HttpContextContract) {
    const { id } = params

    const transaction = await Transaction.find(id)

    if (!transaction) {
      return response.badRequest({
        error: "Transaction not found"
      })
    }

    return response.json({
      transaction
    })
  }
}
