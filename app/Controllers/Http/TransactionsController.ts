import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Transaction from "App/Models/Transaction";
import User from "App/Models/User";
import NewTransactionValidator from "App/Validators/NewTransactionValidator";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MizumiProgram } from "App/Types/MizumiProgram";
import { Keypair, PublicKey } from "@solana/web3.js";
import Database from "@ioc:Adonis/Lucid/Database";
import { TRANSACTIONKIND, TRANSACTIONSTATUS, STABLES, PAYBOXMODE } from "App/Models/Enums";
import DebitUserValidator from "App/Validators/DebitUserValidator";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { chargeBankCard, IChargeBankCard, transfer, ITransfer } from "App/Services/Paybox";
import CreditUserValidator from "App/Validators/CreditUserValidator";
import CompleteTransactionValidator from "App/Validators/CompleteTransactionValidator";

export default class TransactionsController {
  public async create({request, response}: HttpContextContract) {

    const payload = await request.validate(NewTransactionValidator) 
    const { userId, fiatAmount, tokenAmount, token, fiat, kind, country, rate } = payload

    const user = await User.find(userId)

    if (!user) {
      return response.status(404).json({
        message: 'User not found'
      })
    }

    const userWallet = new PublicKey(user.walletAddress)
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

    const program = anchor.workspace.MizumiProgram as Program<MizumiProgram>;
    const admin = Keypair.fromSecretKey(Uint8Array.from(process.env.ADMIN as any));
    const [user_acc_pda, db] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        userWallet.toBuffer(),
      ],
      program.programId
    );
    
    const transactions = await Database
      .from('transactions')
      .where('userId', userId)
      .exec();

    let swapAccountTx: anchor.web3.Transaction;
    
    if (transactions.length > 0) {
      const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount;
      const new_swaps_count = swaps_count.add(new anchor.BN(1));

      const [current_swap_acc_pda, hb] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
        ],
        program.programId
      );

      const [swap_acc_pda, sb] = PublicKey.findProgramAddressSync(
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
        .signers([
          admin
        ])
        .transaction();
      
      
    } else {
      const [swap_acc_pda, sb] = PublicKey.findProgramAddressSync(
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
        .signers([
          admin
        ])
        .transaction()
    }

    
    return response.json({
      serializedTransaction: swapAccountTx.serialize(),
      dbTransaction: transaction
    })
  }

  public async debitUser({request, response}: HttpContextContract) {
    const payload = await request.validate(DebitUserValidator);
    const { userId, txId, cardAddress, cardCity, 
      cardCountry, cardCvc, cardEmail, cardExpiry, cardFirstName, 
      cardLastName, cardNumber, cardState, cardZip } = payload;

    const transaction = await Transaction.find(txId)
    const user = await User.find(userId)

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
    await transaction.save()

    const userWallet = new PublicKey(user.walletAddress as string)

    let creditTx: anchor.web3.Transaction;

    if (transaction.kind === TRANSACTIONKIND.ONRAMP) {
      const data: IChargeBankCard = {
        amount: `${transaction.fiatAmount}`,
        currency: 'GHS',
        order_id: transaction.id.toString(),
        mode: PAYBOXMODE.TEST,
        card_first_name: cardFirstName!,
        card_last_name: cardLastName!,
        card_number: cardNumber!,
        card_cvc: cardCvc!,
        card_expiry: cardExpiry!,
        card_address: cardAddress!,
        card_city: cardCity!,
        card_state: cardState!,
        card_zip: cardZip!,
        card_country: cardCountry!,
        card_email: cardEmail!,
      }
      const chargeResponse = await chargeBankCard(data)
        .then((res) => {
          if (res.data.status === "Success") {
            return res.data
          } else {
            console.log(res.data)
            return "error"
          }
        })
        .catch((err) => {{
          console.log(err)
          return response.internalServerError({
            error: "Error charging bank card"
          })
        }})

      if (chargeResponse === "error") {
        return response.internalServerError({
          error: "Error charging bank card"
        })
      }
      transaction.status = TRANSACTIONSTATUS.DEBITED
      transaction.fiatTransactionId = chargeResponse.token
      transaction.paymentProvider = "Paybox"
      await transaction.save()

      return response.json({
        result: "success"
      })

    } else if (transaction.kind === TRANSACTIONKIND.OFFRAMP) {
      const USDC_MINT = new PublicKey(process.env.USDC_MINT as string)
      const USDT_MINT = new PublicKey(process.env.USDT_MINT as string)
    
      const program = anchor.workspace.MizumiProgram as Program<MizumiProgram>;
      const admin = Keypair.fromSecretKey(Uint8Array.from(process.env.ADMIN as any));
      const [user_acc_pda, db] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user-account"),
          userWallet.toBuffer(),
        ],
        program.programId
      )

      const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
      const [swap_acc_pda, sb] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
        ],
        program.programId
      )
      
      const [usdc_vault_pda, vb] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdc-vault"),
          USDC_MINT.toBuffer(),
        ],
        program.programId
      )

      const [usdt_vault_pda, wb] = PublicKey.findProgramAddressSync(
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
        .signers([admin])
        .transaction();

      return response.json({
        serializedTransaction: creditTx.serialize(),
      })
    }
  }

  public async creditUser({request, response}: HttpContextContract) {
    const payload = await request.validate(CreditUserValidator);
    const { userId, txId, amount, mobileNetwork, mobileNumber, bankCode, bankAccount } = payload

    const transaction = await Transaction.find(txId)
    const user = await User.find(userId)

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
    
      const program = anchor.workspace.MizumiProgram as Program<MizumiProgram>;
      const admin = Keypair.fromSecretKey(Uint8Array.from(process.env.ADMIN as any));
      const [user_acc_pda, db] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user-account"),
          userWallet.toBuffer(),
        ],
        program.programId
      )

      const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
      const [swap_acc_pda, sb] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("swap-account"),
          userWallet.toBuffer(),
          Buffer.from(`${swaps_count.toNumber()}`),
        ],
        program.programId
      )
      
      const [usdc_vault_pda, vb] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("usdc-vault"),
          USDC_MINT.toBuffer(),
        ],
        program.programId
      )

      const [usdt_vault_pda, wb] = PublicKey.findProgramAddressSync(
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
        .signers([admin])
        .transaction();

      return response.json({
        serializedTransaction: debitTx.serialize(),
      })
    } else if (transaction.kind === TRANSACTIONKIND.OFFRAMP) {
      if (mobileNetwork) {
        const data: ITransfer = {
          amount: `${amount}`,
          currency: 'GHS',
          order_id: transaction.id.toString(),
          mode: PAYBOXMODE.TEST,
          mobile_network: mobileNetwork,
          mobile_number: mobileNumber!,
        }
        const transferResponse = await transfer(data)
          .then((res) => {
            if (res.data.status === "Success") {
              return res.data
            } else {
              console.log(res.data)
              return "error"
            }
          })
          .catch((err) => {{
            console.log(err)
            return response.internalServerError({
              error: "Error transferring mobile money"
            })
          }})
  
        if (transferResponse === "error") {
          return response.internalServerError({
            error: "Error transferring mobile money"
          })
        }
        transaction.status = TRANSACTIONSTATUS.SETTLED
        transaction.fiatTransactionId = transferResponse.token
        transaction.paymentProvider = "Paybox"
        await transaction.save()
  
        return response.json({
          result: "success"
        })
      } else if (bankAccount) {
        const data: ITransfer = {
          amount: `${amount}`,
          currency: 'GHS',
          order_id: transaction.id.toString(),
          mode: PAYBOXMODE.TEST,
          bank_code: bankCode,
          bank_account: bankAccount,
        }
  
        const transferResponse = await transfer(data)
          .then((res) => {
            if (res.data.status === "Success") {
              return res.data
            } else {
              console.log(res.data)
              return "error"
            }
          })
          .catch((err) => {{
            console.log(err)
            return response.internalServerError({
              error: "Error transferring mobile money"
            })
          }})
        if (transferResponse === "error") {
          return response.internalServerError({
            error: "Error transferring mobile money"
          })
        }
        transaction.status = TRANSACTIONSTATUS.SETTLED
        transaction.fiatTransactionId = transferResponse.token
        transaction.paymentProvider = "Paybox"
        await transaction.save()
  
        return response.json({
          result: "success"
        })
      }
    }
  }

  public async completeTransaction({request, response}: HttpContextContract) {
    const payload = await request.validate(CompleteTransactionValidator)
    const { txId, userId } = payload

    const transaction = await Transaction.find(txId)
    const user = await User.find(userId)

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

    const program = anchor.workspace.MizumiProgram as Program<MizumiProgram>;
    const admin = Keypair.fromSecretKey(Uint8Array.from(process.env.ADMIN as any));
    const [user_acc_pda, db] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        userWallet.toBuffer(),
      ],
      program.programId
    )

    const swaps_count = (await program.account.userAccount.fetch(user_acc_pda)).swapsCount
    const [swap_acc_pda, sb] = PublicKey.findProgramAddressSync(
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
      .signers([admin])
      .transaction();
    
    return response.json({
      serializedTransaction: tx.serialize(),
    })
  }

  public async updateStatus({response, params}: HttpContextContract) {
    const { id, userId, status } = params

    const transaction = await Transaction.find(id)
    const user = await User.find(userId)

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
}
