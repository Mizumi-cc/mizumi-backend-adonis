import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Transaction from "App/Models/Transaction";
import Auth from "App/Models/Auth";
import NewTransactionValidator from "App/Validators/NewTransactionValidator";
import * as anchor from "@project-serum/anchor";
import { IDL } from "App/Types/MizumiProgram";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TRANSACTIONKIND, TRANSACTIONSTATUS, STABLES } from "App/Models/Enums";
import DebitUserValidator from "App/Validators/DebitUserValidator";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import CreditUserValidator from "App/Validators/CreditUserValidator";
import CompleteTransactionValidator from "App/Validators/CompleteTransactionValidator";
import Env from "@ioc:Adonis/Core/Env";
import { PaymentForm, initiatePayment } from "App/Services/Fincra";
import CheckoutStatusValidator from "App/Validators/CheckoutStatusValidator";
import crypto from "crypto";

export default class TransactionsController {
  public async create({request, response}: HttpContextContract) {

    const payload = await request.validate(NewTransactionValidator) 
    const { userId, fiatAmount, tokenAmount, token, fiat, kind, country, rate } = payload

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
      rate,
      status: TRANSACTIONSTATUS.INITIATED
    })
    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

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
    );
 
    let swapAccountTx: anchor.web3.Transaction;
    
    const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount;
    console.log(swaps_count, 'swaps_count')

    if (swaps_count.toNumber() !== 0) {
      const new_swaps_count = swaps_count.add(new anchor.BN(1));

      const [current_swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
        ],
        program.programId
      );

      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${new_swaps_count.toNumber()}`),
        ],
        program.programId
      );

      swapAccountTx = await program.methods
        .newSwap(`${new_swaps_count.toNumber()}`)
        .accounts({
          admin: admin.publicKey,
          userAccount: user_acc_pda,
          currentSwapAccount: current_swap_acc_pda,
          newSwapAccount: swap_acc_pda,
          authority: userWallet,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    } else {
      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${new anchor.BN(1).toNumber()}`),
        ],
        program.programId
      );

      swapAccountTx = await program.methods
        .firstSwap(`${new anchor.BN(1).toNumber()}`)
        .accounts({
          admin: admin.publicKey,
          userAccount: user_acc_pda,
          swapAccount: swap_acc_pda,
          authority: userWallet,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
      
    }
    
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

      const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
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

      const usdc_associated_token_acc = getAssociatedTokenAddressSync(
        USDC_MINT, userWallet, true
      )

      const usdt_associated_token_acc = getAssociatedTokenAddressSync(
        USDT_MINT, userWallet, true
      )

      const debitAmount = new anchor.BN(transaction.tokenAmount)
      const tokenArgument = transaction.token === STABLES.USDC ? {uSDC: {}} : {uSDT: {}}
      creditTx = await program.methods
        .initiateSwap(tokenArgument, debitAmount, {gHS: {}}, {offramp: {}}, `${swaps_count.toNumber()}`)
        .accounts({
          admin: admin.publicKey,
          authority: userWallet,
          authorityUsdc: usdc_associated_token_acc,
          authorityUsdt: usdt_associated_token_acc,
          userAccount: user_acc_pda,
          swapAccount: swap_acc_pda,
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

    if (transaction.status !== TRANSACTIONSTATUS.DEBITED) {
      return response.badRequest({
        error: "Transaction not debited"
      })
    }

    transaction.status = TRANSACTIONSTATUS.SETTLING
    await transaction.save()

    const userWallet = new PublicKey(user.walletAddress as string)

    let debitTx: anchor.web3.Transaction;

    if (transaction.kind === TRANSACTIONKIND.ONRAMP) {
      const USDC_MINT = new PublicKey(process.env.USDC_MINT as string)
      const USDT_MINT = new PublicKey(process.env.USDT_MINT as string)
    
      const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

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

      const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
      const [swap_acc_pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
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

      const usdc_associated_token_acc = getAssociatedTokenAddressSync(
        USDC_MINT, userWallet, true
      )

      const usdt_associated_token_acc = getAssociatedTokenAddressSync(
        USDT_MINT, userWallet, true
      )

      const debitAmount = new anchor.BN(transaction.tokenAmount)
      const tokenArgument = transaction.token === STABLES.USDC ? {uSDC: {}} : {uSDT: {}}
      debitTx = await program.methods
        .initiateSwap(tokenArgument, debitAmount, {gHS: {}}, {onramp: {}}, `${swaps_count.toNumber()}`)
        .accounts({
          admin: admin.publicKey,
          authority: userWallet,
          authorityUsdc: usdc_associated_token_acc,
          authorityUsdt: usdt_associated_token_acc,
          userAccount: user_acc_pda,
          swapAccount: swap_acc_pda,
          usdcVault: usdc_vault_pda,
          usdtVault: usdt_vault_pda,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      debitTx.feePayer = userWallet;
      debitTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
      debitTx.partialSign(admin)

      return response.json({
        serializedTransaction: debitTx.serialize(),
      })
    } else if (transaction.kind === TRANSACTIONKIND.OFFRAMP) {
      
    }
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

    if (transaction.status !== TRANSACTIONSTATUS.SETTLED) {
      return response.badRequest({
        error: "Transaction not settled"
      })
    }

    const userWallet = new PublicKey(user.walletAddress as string)

    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

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

    const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
    const [swap_acc_pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("swap-account"),
        userWallet.toBuffer(),
        Buffer.from(`${swaps_count.toNumber()}`),
      ],
      program.programId
    )
    
    const tx = await program.methods
      .completeSwap(true, new anchor.BN(transaction.fiatAmount), `${swaps_count.toNumber()}`)
      .accounts({
        admin: admin.publicKey,
        authority: userWallet,
        userAccount: user_acc_pda,
        swapAccount: swap_acc_pda,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .transaction();

    tx.feePayer = userWallet;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.partialSign(admin)
    
    return response.json({
      serializedTransaction: tx.serialize(),
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

    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Env.get('ADMIN'))));

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
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash({commitment: 'confirmed'})).blockhash;
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

  public async checkoutStatus({response, request}: HttpContextContract) {
    const payload = request.validate(CheckoutStatusValidator)
    const webhookSignature = request.header('signature')
    const webhookSecret = Env.get('FINCRA_WEBHOOK_KEY')
    const encryptedData =  crypto
      .createHmac("SHA512", webhookSecret)
      .update(JSON.stringify(payload)) 
      .digest("hex");
    if (encryptedData === webhookSignature) {

    } else {
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
