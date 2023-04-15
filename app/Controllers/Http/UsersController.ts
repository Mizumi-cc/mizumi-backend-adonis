import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import User from "App/Models/User";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MizumiProgram } from "App/Types/MizumiProgram";
import { Keypair, PublicKey } from "@solana/web3.js";

export default class UsersController {
  public async signup({ request, response }: HttpContextContract) {
    const { walletAddress } = request.all();
    await User.create({ walletAddress });
    let provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.MizumiProgram as Program<MizumiProgram>;
    const admin = Keypair.fromSecretKey(Uint8Array.from(process.env.ADMIN as any))
    
    const [user_acc_pda, db] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user-account"),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    const newUserTx = await program.methods
      .newUser()
      .accounts({
        admin: admin.publicKey,
        userAccount: user_acc_pda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .transaction();

    return response.json(newUserTx);
  }

  public async updateUserInformation({
    request,
    response,
  }: HttpContextContract) {
    const { walletAddress, kycFields, paymentDetails } = request.all();
    const user = await User.findByOrFail("walletAddress", walletAddress);
    user.kycFields = kycFields;
    user.paymentDetails = paymentDetails;
    await user.save();
    return response.json(user);
  }
}
